const supabase = require('../config/supabase');
const { getStripeClient } = require('./stripeService');

const DEFAULT_CURRENCY = 'usd';

const getUserProfile = async (userId) => {
  const { data: user, error } = await supabase
    .from('users')
    .select('id, email, first_name, last_name, stripe_customer_id')
    .eq('id', userId)
    .single();

  if (error || !user) {
    return null;
  }

  return user;
};

const getOrCreateStripeCustomer = async (userId) => {
  const user = await getUserProfile(userId);
  if (!user) {
    throw new Error('User not found');
  }

  if (user.stripe_customer_id) {
    return user.stripe_customer_id;
  }

  const stripe = getStripeClient();
  const customer = await stripe.customers.create({
    email: user.email,
    name: [user.first_name, user.last_name].filter(Boolean).join(' ') || undefined,
    metadata: { user_id: user.id }
  });

  const { error: updateError } = await supabase
    .from('users')
    .update({ stripe_customer_id: customer.id })
    .eq('id', user.id);

  if (updateError) {
    throw new Error('Failed to store Stripe customer');
  }

  return customer.id;
};

const getDefaultPaymentMethod = async (userId) => {
  const { data: method } = await supabase
    .from('payment_methods')
    .select('*')
    .eq('user_id', userId)
    .eq('is_default', true)
    .maybeSingle();

  if (method) {
    return method;
  }

  const { data: fallback } = await supabase
    .from('payment_methods')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return fallback || null;
};

const upsertTransaction = async (transaction) => {
  const { data: existing } = await supabase
    .from('transactions')
    .select('id')
    .eq('stripe_payment_intent_id', transaction.stripe_payment_intent_id)
    .maybeSingle();

  if (existing) {
    await supabase
      .from('transactions')
      .update(transaction)
      .eq('id', existing.id);
    return existing;
  }

  const { data } = await supabase
    .from('transactions')
    .insert([transaction])
    .select()
    .single();

  return data;
};

const updateOrderPaymentStatus = async (orderId, updates) => {
  const { data, error } = await supabase
    .from('orders')
    .update(updates)
    .eq('id', orderId)
    .select()
    .single();

  if (error) {
    throw new Error('Failed to update order payment status');
  }

  return data;
};

const attemptChargeForOrder = async (order) => {
  if (!order) {
    return { status: 'skipped', reason: 'missing_order' };
  }

  if (process.env.ENABLE_PAYMENTS === 'false') {
    return { status: 'skipped', reason: 'payments_disabled' };
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return { status: 'skipped', reason: 'missing_stripe_key' };
  }

  const amount = Math.round(Number(order.total_amount) * 100);
  if (!Number.isFinite(amount) || amount <= 0) {
    return { status: 'skipped', reason: 'invalid_amount' };
  }

  const paymentMethod = await getDefaultPaymentMethod(order.customer_id);
  if (!paymentMethod) {
    return { status: 'skipped', reason: 'missing_payment_method' };
  }

  const stripeCustomerId = await getOrCreateStripeCustomer(order.customer_id);
  const stripe = getStripeClient();

  let transferData;
  const { data: farm } = await supabase
    .from('farms')
    .select('stripe_account_id')
    .eq('id', order.farm_id)
    .single();

  if (farm?.stripe_account_id) {
    transferData = { destination: farm.stripe_account_id };
  }

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: DEFAULT_CURRENCY,
      customer: stripeCustomerId,
      payment_method: paymentMethod.stripe_payment_method_id,
      confirm: true,
      off_session: true,
      metadata: {
        order_id: order.id,
        farm_id: order.farm_id,
        customer_id: order.customer_id
      },
      ...(transferData ? { transfer_data: transferData } : {})
    });

    await updateOrderPaymentStatus(order.id, {
      payment_status: 'paid',
      payment_intent_id: paymentIntent.id
    });

    await upsertTransaction({
      order_id: order.id,
      customer_id: order.customer_id,
      farm_id: order.farm_id,
      amount: Number(order.total_amount),
      status: 'succeeded',
      stripe_payment_intent_id: paymentIntent.id,
      stripe_charge_id: paymentIntent.latest_charge || null
    });

    return { status: 'succeeded', paymentIntent };
  } catch (error) {
    const intentId = error?.payment_intent?.id || null;
    await updateOrderPaymentStatus(order.id, {
      payment_status: 'failed',
      payment_intent_id: intentId
    });

    await upsertTransaction({
      order_id: order.id,
      customer_id: order.customer_id,
      farm_id: order.farm_id,
      amount: Number(order.total_amount),
      status: 'failed',
      stripe_payment_intent_id: intentId,
      error_message: error.message
    });

    return { status: 'failed', error };
  }
};

module.exports = {
  getUserProfile,
  getOrCreateStripeCustomer,
  getDefaultPaymentMethod,
  upsertTransaction,
  updateOrderPaymentStatus,
  attemptChargeForOrder
};
