const twilio = require('twilio');
const sgMail = require('@sendgrid/mail');
const supabase = require('../config/supabase');
const formatDate = (date) => date.toISOString().slice(0, 10);

const NOTIFICATION_CATEGORIES = [
  'order_confirmation',
  'pickup_reminder',
  'late_pickup',
  'schedule_change',
  'payment_confirmation',
  'weekly_summary',
  'surplus_alert'
];

const getPreferences = async (userId) => {
  const { data: prefs } = await supabase
    .from('notification_preferences')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (prefs) {
    return prefs;
  }

  const { data: created } = await supabase
    .from('notification_preferences')
    .insert([{ user_id: userId }])
    .select()
    .single();

  return created || null;
};

const shouldSend = (prefs, channel, category) => {
  if (!prefs) {
    return false;
  }
  if (channel === 'sms' && !prefs.sms_enabled) return false;
  if (channel === 'email' && !prefs.email_enabled) return false;
  if (category && prefs[category] === false) return false;
  return true;
};

const getUserContact = async (userId) => {
  const { data: user } = await supabase
    .from('users')
    .select('id, email, phone, first_name, last_name')
    .eq('id', userId)
    .single();

  return user || null;
};

const getFarmWithOwner = async (farmId) => {
  const { data: farm } = await supabase
    .from('farms')
    .select('id, name, email, phone, farmer_id')
    .eq('id', farmId)
    .single();

  return farm || null;
};

const logNotification = async ({
  user_id,
  type,
  category,
  recipient,
  subject,
  message,
  status,
  error_message
}) => {
  await supabase
    .from('notifications')
    .insert([{
      user_id,
      type,
      category,
      recipient,
      subject,
      message,
      status,
      error_message
    }]);
};

const sendSms = async ({ userId, to, message, category }) => {
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_PHONE_NUMBER) {
    await logNotification({
      user_id: userId,
      type: 'sms',
      category,
      recipient: to || 'unknown',
      message,
      status: 'failed',
      error_message: 'Twilio credentials not configured'
    });
    return false;
  }

  const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  try {
    await client.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to
    });

    await logNotification({
      user_id: userId,
      type: 'sms',
      category,
      recipient: to,
      message,
      status: 'sent'
    });
    return true;
  } catch (error) {
    await logNotification({
      user_id: userId,
      type: 'sms',
      category,
      recipient: to,
      message,
      status: 'failed',
      error_message: error.message
    });
    return false;
  }
};

const sendEmail = async ({ userId, to, subject, message, category }) => {
  if (!process.env.SENDGRID_API_KEY || !process.env.SENDGRID_FROM_EMAIL) {
    await logNotification({
      user_id: userId,
      type: 'email',
      category,
      recipient: to || 'unknown',
      subject,
      message,
      status: 'failed',
      error_message: 'SendGrid credentials not configured'
    });
    return false;
  }

  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  try {
    await sgMail.send({
      to,
      from: {
        email: process.env.SENDGRID_FROM_EMAIL,
        name: process.env.SENDGRID_FROM_NAME || 'MilkPick'
      },
      subject,
      text: message
    });

    await logNotification({
      user_id: userId,
      type: 'email',
      category,
      recipient: to,
      subject,
      message,
      status: 'sent'
    });
    return true;
  } catch (error) {
    await logNotification({
      user_id: userId,
      type: 'email',
      category,
      recipient: to,
      subject,
      message,
      status: 'failed',
      error_message: error.message
    });
    return false;
  }
};

const notifyUser = async ({
  userId,
  email,
  phone,
  category,
  subject,
  message,
  smsMessage
}) => {
  if (process.env.ENABLE_NOTIFICATIONS === 'false') {
    return { skipped: true };
  }

  const prefs = await getPreferences(userId);
  const results = { email: false, sms: false };

  if (email && shouldSend(prefs, 'email', category)) {
    results.email = await sendEmail({
      userId,
      to: email,
      subject,
      message,
      category
    });
  }

  if (phone && shouldSend(prefs, 'sms', category)) {
    results.sms = await sendSms({
      userId,
      to: phone,
      message: smsMessage || message,
      category
    });
  }

  return results;
};

const formatOrderSummary = (order) => {
  const productName = order.products?.name || 'product';
  const unit = order.products?.unit || '';
  return `${order.quantity} ${unit} ${productName} for ${order.scheduled_date}`;
};

const ensureOrderDetails = async (order) => {
  if (!order) return null;
  if (order.products?.name) {
    return order;
  }
  if (!order.product_id) {
    return order;
  }
  const { data: product } = await supabase
    .from('products')
    .select('name, unit')
    .eq('id', order.product_id)
    .single();
  return { ...order, products: product || order.products };
};

const sendOrderConfirmation = async (order) => {
  if (!order) return;

  const hydratedOrder = await ensureOrderDetails(order);

  const customer = await getUserContact(hydratedOrder.customer_id);
  const farm = await getFarmWithOwner(hydratedOrder.farm_id);
  const farmer = farm?.farmer_id ? await getUserContact(farm.farmer_id) : null;

  const summary = formatOrderSummary(hydratedOrder);
  const subject = `MilkPick order confirmed for ${hydratedOrder.scheduled_date}`;
  const message = `Your order is confirmed: ${summary}. Total: $${Number(hydratedOrder.total_amount).toFixed(2)}.`;
  const farmerMessage = `New order scheduled: ${summary}. Total: $${Number(hydratedOrder.total_amount).toFixed(2)}.`;

  if (customer) {
    await notifyUser({
      userId: customer.id,
      email: customer.email,
      phone: customer.phone,
      category: 'order_confirmation',
      subject,
      message
    });
  }

  if (farmer && farm) {
    await notifyUser({
      userId: farmer.id,
      email: farmer.email || farm.email,
      phone: farmer.phone || farm.phone,
      category: 'order_confirmation',
      subject: `New MilkPick order for ${farm.name}`,
      message: farmerMessage,
      smsMessage: farmerMessage
    });
  }
};

const sendScheduleChange = async (order, note) => {
  if (!order) return;

  const hydratedOrder = await ensureOrderDetails(order);

  const customer = await getUserContact(hydratedOrder.customer_id);
  const farm = await getFarmWithOwner(hydratedOrder.farm_id);
  const farmer = farm?.farmer_id ? await getUserContact(farm.farmer_id) : null;

  const summary = formatOrderSummary(hydratedOrder);
  const subject = 'MilkPick schedule update';
  const message = `Order update: ${summary}. ${note || ''}`.trim();

  if (customer) {
    await notifyUser({
      userId: customer.id,
      email: customer.email,
      phone: customer.phone,
      category: 'schedule_change',
      subject,
      message
    });
  }

  if (farmer && farm) {
    await notifyUser({
      userId: farmer.id,
      email: farmer.email || farm.email,
      phone: farmer.phone || farm.phone,
      category: 'schedule_change',
      subject: `Schedule update for ${farm.name}`,
      message
    });
  }
};

const sendPickupReminder = async (order) => {
  if (!order) return;

  const hydratedOrder = await ensureOrderDetails(order);

  const customer = await getUserContact(hydratedOrder.customer_id);
  const farm = await getFarmWithOwner(hydratedOrder.farm_id);
  const farmer = farm?.farmer_id ? await getUserContact(farm.farmer_id) : null;
  const summary = formatOrderSummary(hydratedOrder);
  const subject = `Pickup reminder for ${hydratedOrder.scheduled_date}`;
  const message = `Reminder: Pickup scheduled for ${hydratedOrder.scheduled_date}. ${summary}.`;

  if (customer) {
    await notifyUser({
      userId: customer.id,
      email: customer.email,
      phone: customer.phone,
      category: 'pickup_reminder',
      subject,
      message
    });
  }

  if (farmer && farm) {
    await notifyUser({
      userId: farmer.id,
      email: farmer.email || farm.email,
      phone: farmer.phone || farm.phone,
      category: 'pickup_reminder',
      subject: `Upcoming pickup for ${farm.name}`,
      message
    });
  }
};

const sendLatePickup = async (order) => {
  if (!order) return;

  const hydratedOrder = await ensureOrderDetails(order);

  const customer = await getUserContact(hydratedOrder.customer_id);
  const farm = await getFarmWithOwner(hydratedOrder.farm_id);
  const farmer = farm?.farmer_id ? await getUserContact(farm.farmer_id) : null;
  const summary = formatOrderSummary(hydratedOrder);
  const subject = 'Late pickup notice';
  const message = `Pickup marked late: ${summary}. Please coordinate with ${farm?.name || 'the farm'}.`;

  if (customer) {
    await notifyUser({
      userId: customer.id,
      email: customer.email,
      phone: customer.phone,
      category: 'late_pickup',
      subject,
      message
    });
  }

  if (farmer && farm) {
    await notifyUser({
      userId: farmer.id,
      email: farmer.email || farm.email,
      phone: farmer.phone || farm.phone,
      category: 'late_pickup',
      subject: `Late pickup for ${farm.name}`,
      message
    });
  }
};

const sendPaymentConfirmation = async (order) => {
  if (!order) return;

  const hydratedOrder = await ensureOrderDetails(order);

  const customer = await getUserContact(hydratedOrder.customer_id);
  const summary = formatOrderSummary(hydratedOrder);
  const subject = 'Payment confirmation';
  const message = `Payment received for ${summary}. Amount: $${Number(hydratedOrder.total_amount).toFixed(2)}.`;

  if (customer) {
    await notifyUser({
      userId: customer.id,
      email: customer.email,
      phone: customer.phone,
      category: 'payment_confirmation',
      subject,
      message
    });
  }
};

const sendWeeklyCustomerSummaries = async () => {
  const today = new Date();
  const startDate = formatDate(today);
  const endDate = formatDate(new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000));

  const { data: orders } = await supabase
    .from('orders')
    .select(`
      id,
      customer_id,
      scheduled_date,
      quantity,
      total_amount,
      products (
        name,
        unit
      )
    `)
    .gte('scheduled_date', startDate)
    .lte('scheduled_date', endDate)
    .neq('status', 'cancelled');

  const grouped = new Map();
  (orders || []).forEach((order) => {
    if (!grouped.has(order.customer_id)) {
      grouped.set(order.customer_id, []);
    }
    grouped.get(order.customer_id).push(order);
  });

  for (const [customerId, customerOrders] of grouped.entries()) {
    const customer = await getUserContact(customerId);
    if (!customer) {
      continue;
    }
    const lines = customerOrders.map((order) => `- ${formatOrderSummary(order)}`);
    const message = `Your pickups for the next week:\n${lines.join('\n')}`;
    await notifyUser({
      userId: customer.id,
      email: customer.email,
      phone: customer.phone,
      category: 'weekly_summary',
      subject: 'MilkPick weekly summary',
      message,
      smsMessage: `You have ${customerOrders.length} pickups scheduled this week.`
    });
  }
};

const sendWeeklyFarmerSummaries = async () => {
  const today = new Date();
  const startDate = formatDate(today);
  const endDate = formatDate(new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000));

  const { data: farms } = await supabase
    .from('farms')
    .select('id, name, farmer_id');

  for (const farm of farms || []) {
    const { data: orders } = await supabase
      .from('orders')
      .select(`
        id,
        scheduled_date,
        quantity,
        total_amount,
        products (
          name,
          unit
        )
      `)
      .eq('farm_id', farm.id)
      .gte('scheduled_date', startDate)
      .lte('scheduled_date', endDate)
      .neq('status', 'cancelled');

    if (!orders || orders.length === 0) {
      continue;
    }

    const farmer = await getUserContact(farm.farmer_id);
    if (!farmer) {
      continue;
    }

    const lines = orders.map((order) => `- ${formatOrderSummary(order)}`);
    const message = `Upcoming pickups for ${farm.name}:\n${lines.join('\n')}`;
    await notifyUser({
      userId: farmer.id,
      email: farmer.email,
      phone: farmer.phone,
      category: 'weekly_summary',
      subject: `MilkPick weekly summary for ${farm.name}`,
      message,
      smsMessage: `${orders.length} pickups scheduled for ${farm.name} this week.`
    });
  }
};

const sendPickupReminders = async () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const targetDate = formatDate(tomorrow);

  const { data: orders } = await supabase
    .from('orders')
    .select(`
      id,
      customer_id,
      farm_id,
      scheduled_date,
      quantity,
      total_amount,
      status,
      products (
        name,
        unit
      )
    `)
    .eq('scheduled_date', targetDate)
    .in('status', ['pending', 'confirmed']);

  for (const order of orders || []) {
    await sendPickupReminder(order);
  }
};

module.exports = {
  NOTIFICATION_CATEGORIES,
  getPreferences,
  shouldSend,
  getUserContact,
  getFarmWithOwner,
  logNotification,
  notifyUser,
  sendOrderConfirmation,
  sendScheduleChange,
  sendPickupReminder,
  sendLatePickup,
  sendPaymentConfirmation,
  sendWeeklyCustomerSummaries,
  sendWeeklyFarmerSummaries,
  sendPickupReminders
};
