const { validationResult } = require('express-validator');
const supabase = require('../config/supabase');
const { getStripeClient } = require('../services/stripeService');
const {
  getUserProfile,
  getOrCreateStripeCustomer,
  getDefaultPaymentMethod,
  attemptChargeForOrder,
  upsertTransaction,
  updateOrderPaymentStatus
} = require('../services/paymentService');
const { sendPaymentConfirmation } = require('../services/notificationService');

const getFarmForFarmer = async (farmerId) => {
  const { data: farm, error } = await supabase
    .from('farms')
    .select('id, name, stripe_account_id')
    .eq('farmer_id', farmerId)
    .single();

  if (error || !farm) {
    return null;
  }

  return farm;
};

const setStripeCustomerDefault = async (stripeCustomerId, paymentMethodId) => {
  const stripe = getStripeClient();
  await stripe.customers.update(stripeCustomerId, {
    invoice_settings: { default_payment_method: paymentMethodId }
  });
};

// Create setup intent for adding a card
exports.createSetupIntent = async (req, res) => {
  try {
    const stripeCustomerId = await getOrCreateStripeCustomer(req.user.id);
    const stripe = getStripeClient();

    const setupIntent = await stripe.setupIntents.create({
      customer: stripeCustomerId,
      payment_method_types: ['card'],
      usage: 'off_session'
    });

    res.json({ client_secret: setupIntent.client_secret, customer_id: stripeCustomerId });
  } catch (error) {
    console.error('Create setup intent error:', error);
    res.status(500).json({ error: 'Failed to create setup intent' });
  }
};

// Store payment method after setup
exports.storePaymentMethod = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { payment_method_id, make_default } = req.body;
    const stripeCustomerId = await getOrCreateStripeCustomer(req.user.id);
    const stripe = getStripeClient();

    let paymentMethod = await stripe.paymentMethods.retrieve(payment_method_id);
    if (!paymentMethod) {
      return res.status(404).json({ error: 'Payment method not found' });
    }

    if (paymentMethod.customer && paymentMethod.customer !== stripeCustomerId) {
      return res.status(400).json({ error: 'Payment method belongs to another customer' });
    }

    if (!paymentMethod.customer) {
      paymentMethod = await stripe.paymentMethods.attach(payment_method_id, { customer: stripeCustomerId });
    }

    const card = paymentMethod.card || {};

    const { data: existing } = await supabase
      .from('payment_methods')
      .select('id')
      .eq('stripe_payment_method_id', payment_method_id)
      .eq('user_id', req.user.id)
      .maybeSingle();

    const record = {
      user_id: req.user.id,
      stripe_payment_method_id: payment_method_id,
      type: paymentMethod.type,
      last_four: card.last4 || null,
      brand: card.brand || null,
      exp_month: card.exp_month || null,
      exp_year: card.exp_year || null
    };

    let methodRecord;
    if (existing) {
      const { data } = await supabase
        .from('payment_methods')
        .update(record)
        .eq('id', existing.id)
        .select()
        .single();
      methodRecord = data;
    } else {
      const { data } = await supabase
        .from('payment_methods')
        .insert([{ ...record, is_default: false }])
        .select()
        .single();
      methodRecord = data;
    }

    const { data: hasDefault } = await supabase
      .from('payment_methods')
      .select('id')
      .eq('user_id', req.user.id)
      .eq('is_default', true)
      .maybeSingle();

    if (make_default || !hasDefault) {
      await supabase
        .from('payment_methods')
        .update({ is_default: false })
        .eq('user_id', req.user.id);

      await supabase
        .from('payment_methods')
        .update({ is_default: true })
        .eq('id', methodRecord.id);

      await setStripeCustomerDefault(stripeCustomerId, payment_method_id);
    }

    res.status(201).json({ message: 'Payment method saved', method: methodRecord });
  } catch (error) {
    console.error('Store payment method error:', error);
    res.status(500).json({ error: 'Failed to store payment method' });
  }
};

// List customer payment methods
exports.listPaymentMethods = async (req, res) => {
  try {
    const { data: methods, error } = await supabase
      .from('payment_methods')
      .select('id, type, last_four, brand, exp_month, exp_year, is_default, created_at')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('List payment methods error:', error);
      return res.status(500).json({ error: 'Failed to fetch payment methods' });
    }

    res.json({ methods: methods || [] });
  } catch (error) {
    console.error('List payment methods error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Set default payment method
exports.setDefaultPaymentMethod = async (req, res) => {
  try {
    const { id } = req.params;
    const { data: method } = await supabase
      .from('payment_methods')
      .select('id, stripe_payment_method_id')
      .eq('id', id)
      .eq('user_id', req.user.id)
      .single();

    if (!method) {
      return res.status(404).json({ error: 'Payment method not found' });
    }

    await supabase
      .from('payment_methods')
      .update({ is_default: false })
      .eq('user_id', req.user.id);

    const { data: updatedMethod, error } = await supabase
      .from('payment_methods')
      .update({ is_default: true })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: 'Failed to update default method' });
    }

    const stripeCustomerId = await getOrCreateStripeCustomer(req.user.id);
    await setStripeCustomerDefault(stripeCustomerId, method.stripe_payment_method_id);

    res.json({ message: 'Default payment method updated', method: updatedMethod });
  } catch (error) {
    console.error('Set default method error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Remove payment method
exports.removePaymentMethod = async (req, res) => {
  try {
    const { id } = req.params;
    const { data: method } = await supabase
      .from('payment_methods')
      .select('*')
      .eq('id', id)
      .eq('user_id', req.user.id)
      .single();

    if (!method) {
      return res.status(404).json({ error: 'Payment method not found' });
    }

    const stripe = getStripeClient();
    await stripe.paymentMethods.detach(method.stripe_payment_method_id);

    await supabase
      .from('payment_methods')
      .delete()
      .eq('id', id);

    if (method.is_default) {
      const { data: fallback } = await supabase
        .from('payment_methods')
        .select('*')
        .eq('user_id', req.user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (fallback) {
        await supabase
          .from('payment_methods')
          .update({ is_default: true })
          .eq('id', fallback.id);

        const stripeCustomerId = await getOrCreateStripeCustomer(req.user.id);
        await setStripeCustomerDefault(stripeCustomerId, fallback.stripe_payment_method_id);
      }
    }

    res.json({ message: 'Payment method removed' });
  } catch (error) {
    console.error('Remove payment method error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Pay for a specific order
exports.payForOrder = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: order } = await supabase
      .from('orders')
      .select('*')
      .eq('id', id)
      .eq('customer_id', req.user.id)
      .single();

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (order.payment_status === 'paid') {
      return res.status(400).json({ error: 'Order already paid' });
    }

    const result = await attemptChargeForOrder(order);
    if (result.status === 'skipped') {
      return res.status(400).json({ error: 'Payment could not be processed', reason: result.reason });
    }

    const { data: updatedOrder } = await supabase
      .from('orders')
      .select('*')
      .eq('id', order.id)
      .single();

    res.json({ message: 'Payment processed', status: result.status, order: updatedOrder });
  } catch (error) {
    console.error('Pay for order error:', error);
    res.status(500).json({ error: 'Failed to process payment' });
  }
};

// Get payment history for customer
exports.getPaymentHistory = async (req, res) => {
  try {
    const { data: transactions, error } = await supabase
      .from('transactions')
      .select(`
        id,
        order_id,
        amount,
        status,
        stripe_payment_intent_id,
        created_at,
        orders (
          scheduled_date,
          status,
          total_amount,
          products (
            name
          )
        )
      `)
      .eq('customer_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Payment history error:', error);
      return res.status(500).json({ error: 'Failed to fetch payment history' });
    }

    res.json({ transactions: transactions || [] });
  } catch (error) {
    console.error('Payment history error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Refund an order payment (farmers only)
exports.refundOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const farm = await getFarmForFarmer(req.user.id);
    if (!farm) {
      return res.status(404).json({ error: 'Farm not found' });
    }

    const { data: order } = await supabase
      .from('orders')
      .select('id, farm_id, customer_id, payment_intent_id, payment_status, total_amount')
      .eq('id', id)
      .single();

    if (!order || order.farm_id !== farm.id) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (!order.payment_intent_id) {
      return res.status(400).json({ error: 'Order does not have a payment to refund' });
    }

    if (order.payment_status === 'refunded') {
      return res.status(400).json({ error: 'Order already refunded' });
    }

    const stripe = getStripeClient();
    const refund = await stripe.refunds.create({
      payment_intent: order.payment_intent_id
    });

    await updateOrderPaymentStatus(order.id, { payment_status: 'refunded' });

    await upsertTransaction({
      order_id: order.id,
      customer_id: order.customer_id,
      farm_id: farm.id,
      amount: Number(order.total_amount),
      status: 'refunded',
      stripe_payment_intent_id: order.payment_intent_id,
      refund_id: refund.id
    });

    res.json({ message: 'Refund issued', refund_id: refund.id });
  } catch (error) {
    console.error('Refund error:', error);
    res.status(500).json({ error: 'Failed to issue refund' });
  }
};

// Create Stripe Connect onboarding link
exports.createConnectOnboarding = async (req, res) => {
  try {
    const farm = await getFarmForFarmer(req.user.id);
    if (!farm) {
      return res.status(404).json({ error: 'Farm not found. Please create a farm first.' });
    }

    const stripe = getStripeClient();
    let stripeAccountId = farm.stripe_account_id;

    if (!stripeAccountId) {
      const user = await getUserProfile(req.user.id);
      const account = await stripe.accounts.create({
        type: 'express',
        country: 'US',
        email: user?.email || req.user.email,
        metadata: { farm_id: farm.id, farmer_id: req.user.id }
      });
      stripeAccountId = account.id;

      await supabase
        .from('farms')
        .update({ stripe_account_id: stripeAccountId })
        .eq('id', farm.id);
    }

    const appUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: `${appUrl}/dashboard`,
      return_url: `${appUrl}/dashboard`,
      type: 'account_onboarding'
    });

    res.json({ url: accountLink.url, account_id: stripeAccountId });
  } catch (error) {
    console.error('Connect onboarding error:', error);
    res.status(500).json({ error: 'Failed to create onboarding link' });
  }
};

// Get Stripe Connect account status
exports.getConnectStatus = async (req, res) => {
  try {
    const farm = await getFarmForFarmer(req.user.id);
    if (!farm) {
      return res.status(404).json({ error: 'Farm not found. Please create a farm first.' });
    }

    if (!farm.stripe_account_id) {
      return res.json({ connected: false });
    }

    const stripe = getStripeClient();
    const account = await stripe.accounts.retrieve(farm.stripe_account_id);

    res.json({
      connected: true,
      account_id: farm.stripe_account_id,
      charges_enabled: account.charges_enabled,
      payouts_enabled: account.payouts_enabled,
      details_submitted: account.details_submitted
    });
  } catch (error) {
    console.error('Connect status error:', error);
    res.status(500).json({ error: 'Failed to fetch Stripe account status' });
  }
};

// Get transactions for farmer's farm
exports.getFarmTransactions = async (req, res) => {
  try {
    const farm = await getFarmForFarmer(req.user.id);
    if (!farm) {
      return res.status(404).json({ error: 'Farm not found. Please create a farm first.' });
    }

    const { data: transactions, error } = await supabase
      .from('transactions')
      .select(`
        id,
        order_id,
        amount,
        status,
        stripe_payment_intent_id,
        created_at,
        orders (
          scheduled_date,
          products (
            name
          )
        )
      `)
      .eq('farm_id', farm.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Farm transactions error:', error);
      return res.status(500).json({ error: 'Failed to fetch transactions' });
    }

    res.json({ transactions: transactions || [], stripe_account_id: farm.stripe_account_id });
  } catch (error) {
    console.error('Farm transactions error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Stripe webhook handler (raw body required)
exports.handleWebhook = async (req, res) => {
  let stripe;
  try {
    stripe = getStripeClient();
  } catch (error) {
    console.error('Stripe client error:', error.message);
    return res.status(500).json({ error: 'Stripe is not configured' });
  }
  const signature = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    return res.status(400).json({ error: 'Webhook secret not configured' });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, signature, webhookSecret);
  } catch (error) {
    console.error('Webhook signature verification failed:', error.message);
    return res.status(400).json({ error: 'Invalid webhook signature' });
  }

  try {
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const intent = event.data.object;
        const order = await getOrderByPaymentIntent(intent.id);
        await updateOrderPaymentStatusByIntent(intent.id, { payment_status: 'paid' });
        if (order) {
          try {
            await sendPaymentConfirmation(order);
          } catch (notifyError) {
            console.error('Payment confirmation notification error:', notifyError.message);
          }
        }
        const succeededTransaction = {
          order_id: order?.id || intent.metadata?.order_id || null,
          customer_id: order?.customer_id || intent.metadata?.customer_id || null,
          farm_id: order?.farm_id || intent.metadata?.farm_id || null,
          amount: intent.amount_received / 100,
          status: 'succeeded',
          stripe_payment_intent_id: intent.id,
          stripe_charge_id: intent.latest_charge || null
        };
        if (succeededTransaction.customer_id && succeededTransaction.farm_id) {
          await upsertTransaction(succeededTransaction);
        }
        break;
      }
      case 'payment_intent.payment_failed': {
        const intent = event.data.object;
        const order = await getOrderByPaymentIntent(intent.id);
        await updateOrderPaymentStatusByIntent(intent.id, { payment_status: 'failed' });
        const failedTransaction = {
          order_id: order?.id || intent.metadata?.order_id || null,
          customer_id: order?.customer_id || intent.metadata?.customer_id || null,
          farm_id: order?.farm_id || intent.metadata?.farm_id || null,
          amount: intent.amount / 100,
          status: 'failed',
          stripe_payment_intent_id: intent.id,
          error_message: intent.last_payment_error?.message || 'Payment failed'
        };
        if (failedTransaction.customer_id && failedTransaction.farm_id) {
          await upsertTransaction(failedTransaction);
        }
        break;
      }
      case 'charge.refunded': {
        const charge = event.data.object;
        if (charge.payment_intent) {
          const order = await getOrderByPaymentIntent(charge.payment_intent);
          await updateOrderPaymentStatusByIntent(charge.payment_intent, { payment_status: 'refunded' });
          const refundTransaction = {
            order_id: order?.id || null,
            customer_id: order?.customer_id || null,
            farm_id: order?.farm_id || null,
            amount: charge.amount_refunded / 100,
            status: 'refunded',
            stripe_payment_intent_id: charge.payment_intent,
            refund_id: charge.refunds?.data?.[0]?.id || null
          };
          if (refundTransaction.customer_id && refundTransaction.farm_id) {
            await upsertTransaction(refundTransaction);
          }
        }
        break;
      }
      default:
        break;
    }
  } catch (error) {
    console.error('Webhook processing error:', error);
    return res.status(500).json({ error: 'Webhook handler error' });
  }

  res.json({ received: true });
};

const updateOrderPaymentStatusByIntent = async (intentId, updates) => {
  if (!intentId) {
    return;
  }
  const order = await getOrderByPaymentIntent(intentId);
  if (!order) {
    return;
  }
  await updateOrderPaymentStatus(order.id, updates);
};

const getOrderByPaymentIntent = async (intentId) => {
  if (!intentId) {
    return null;
  }
  const { data: order } = await supabase
    .from('orders')
    .select('id, customer_id, farm_id, total_amount, scheduled_date, quantity, product_id')
    .eq('payment_intent_id', intentId)
    .maybeSingle();

  return order || null;
};
