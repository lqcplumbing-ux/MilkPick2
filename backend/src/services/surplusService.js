const supabase = require('../config/supabase');
const { notifyUser, getUserContact, getFarmWithOwner } = require('./notificationService');

const getOptIns = async (customerId) => {
  const { data } = await supabase
    .from('surplus_alerts')
    .select(`
      id,
      farm_id,
      product_id,
      opted_in,
      notified_at,
      claimed,
      claimed_at,
      farms (
        id,
        name,
        city,
        state
      ),
      products (
        id,
        name,
        unit
      )
    `)
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false });

  return data || [];
};

const upsertOptIn = async ({ customerId, farmId, productId, optedIn }) => {
  const { data: existing } = await supabase
    .from('surplus_alerts')
    .select('id')
    .eq('customer_id', customerId)
    .eq('farm_id', farmId)
    .eq('product_id', productId)
    .maybeSingle();

  const payload = {
    customer_id: customerId,
    farm_id: farmId,
    product_id: productId,
    opted_in: optedIn,
    ...(optedIn ? { claimed: false, claimed_at: null } : {})
  };

  if (existing) {
    const { data } = await supabase
      .from('surplus_alerts')
      .update(payload)
      .eq('id', existing.id)
      .select()
      .single();
    return data;
  }

  const { data } = await supabase
    .from('surplus_alerts')
    .insert([payload])
    .select()
    .single();
  return data;
};

const listAvailableSurplus = async (customerId, dateFilter) => {
  let query = supabase
    .from('inventory')
    .select(`
      id,
      farm_id,
      product_id,
      quantity,
      date,
      is_surplus,
      farms (
        id,
        name,
        city,
        state
      ),
      products (
        id,
        name,
        unit
      )
    `)
    .eq('is_surplus', true)
    .gt('quantity', 0)
    .order('date', { ascending: true });

  if (dateFilter) {
    query = query.gte('date', dateFilter);
  }

  const { data: inventory } = await query;

  if (!customerId) {
    return inventory || [];
  }

  const { data: optIns } = await supabase
    .from('surplus_alerts')
    .select('farm_id, product_id, opted_in, claimed')
    .eq('customer_id', customerId);

  const optInMap = new Map((optIns || []).map((row) => (
    [`${row.farm_id}:${row.product_id}`, row]
  )));

  return (inventory || []).map((row) => {
    const key = `${row.farm_id}:${row.product_id}`;
    const optIn = optInMap.get(key);
    return {
      ...row,
      opted_in: optIn?.opted_in || false,
      claimed: optIn?.claimed || false
    };
  });
};

const notifySurplusForInventory = async (inventory) => {
  if (!inventory || !inventory.is_surplus) {
    return 0;
  }

  const { data: alerts } = await supabase
    .from('surplus_alerts')
    .select('id, customer_id')
    .eq('farm_id', inventory.farm_id)
    .eq('product_id', inventory.product_id)
    .eq('opted_in', true);

  if (!alerts || alerts.length === 0) {
    return 0;
  }

  const farm = await getFarmWithOwner(inventory.farm_id);
  const productName = inventory.products?.name || 'product';
  const unit = inventory.products?.unit || '';
  const message = `Surplus available: ${inventory.quantity} ${unit} ${productName} at ${farm?.name || 'a farm'} for ${inventory.date}. Claim now in MilkPick.`;

  let notifiedCount = 0;
  for (const alert of alerts) {
    const customer = await getUserContact(alert.customer_id);
    if (!customer) continue;

    await notifyUser({
      userId: customer.id,
      email: customer.email,
      phone: customer.phone,
      category: 'surplus_alert',
      subject: `Surplus available at ${farm?.name || 'a farm'}`,
      message,
      smsMessage: message
    });

    await supabase
      .from('surplus_alerts')
      .update({ notified_at: new Date().toISOString() })
      .eq('id', alert.id);

    notifiedCount += 1;
  }

  return notifiedCount;
};

const claimSurplus = async ({ customerId, inventoryId }) => {
  const { data: inventory } = await supabase
    .from('inventory')
    .select(`
      id,
      farm_id,
      product_id,
      quantity,
      date,
      is_surplus,
      farms (
        id,
        name
      ),
      products (
        id,
        name,
        unit
      )
    `)
    .eq('id', inventoryId)
    .single();

  if (!inventory) {
    return { error: 'Surplus item not found' };
  }

  if (!inventory.is_surplus || Number(inventory.quantity) <= 0) {
    return { error: 'Surplus item no longer available' };
  }

  const { data: optIn } = await supabase
    .from('surplus_alerts')
    .select('id, opted_in')
    .eq('customer_id', customerId)
    .eq('farm_id', inventory.farm_id)
    .eq('product_id', inventory.product_id)
    .maybeSingle();

  if (!optIn || !optIn.opted_in) {
    return { error: 'You must opt in before claiming surplus.' };
  }

  const { error: updateError } = await supabase
    .from('inventory')
    .update({ is_surplus: false })
    .eq('id', inventory.id)
    .eq('is_surplus', true);

  if (updateError) {
    return { error: 'Failed to claim surplus' };
  }

  await supabase
    .from('surplus_alerts')
    .update({ claimed: true, claimed_at: new Date().toISOString() })
    .eq('id', optIn.id);

  const customer = await getUserContact(customerId);
  const farm = await getFarmWithOwner(inventory.farm_id);
  const message = `Surplus claimed: ${inventory.products?.name || 'Product'} on ${inventory.date} from ${farm?.name || 'farm'}.`;

  if (customer) {
    await notifyUser({
      userId: customer.id,
      email: customer.email,
      phone: customer.phone,
      category: 'surplus_alert',
      subject: 'Surplus claimed',
      message
    });
  }

  if (farm?.farmer_id) {
    const farmer = await getUserContact(farm.farmer_id);
    if (farmer) {
      await notifyUser({
        userId: farmer.id,
        email: farmer.email || farm.email,
        phone: farmer.phone || farm.phone,
        category: 'surplus_alert',
        subject: `Surplus claimed for ${farm.name}`,
        message
      });
    }
  }

  return { inventory };
};

const getFarmSurplusHistory = async (farmId) => {
  const { data } = await supabase
    .from('surplus_alerts')
    .select(`
      id,
      customer_id,
      product_id,
      opted_in,
      notified_at,
      claimed,
      claimed_at,
      customers:users (
        id,
        email,
        phone,
        first_name,
        last_name
      ),
      products (
        id,
        name,
        unit
      )
    `)
    .eq('farm_id', farmId)
    .order('claimed_at', { ascending: false });

  return data || [];
};

const getCustomerHistory = async (customerId) => {
  const { data } = await supabase
    .from('surplus_alerts')
    .select(`
      id,
      farm_id,
      product_id,
      opted_in,
      notified_at,
      claimed,
      claimed_at,
      farms (
        id,
        name,
        city,
        state
      ),
      products (
        id,
        name,
        unit
      )
    `)
    .eq('customer_id', customerId)
    .order('claimed_at', { ascending: false });

  return data || [];
};

module.exports = {
  getOptIns,
  upsertOptIn,
  listAvailableSurplus,
  notifySurplusForInventory,
  claimSurplus,
  getFarmSurplusHistory,
  getCustomerHistory
};
