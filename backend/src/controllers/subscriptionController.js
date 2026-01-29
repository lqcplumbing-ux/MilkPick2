const { validationResult } = require('express-validator');
const supabase = require('../config/supabase');
const {
  formatDate,
  getNextDate,
  parseDate,
  getNextOccurrence,
  buildUpcomingDates,
  ensureOrderForSubscription
} = require('../services/subscriptionService');

const getToday = () => formatDate(new Date());

const getProductForSubscription = async (productId) => {
  const { data: product, error } = await supabase
    .from('products')
    .select('id, farm_id, price, available, name')
    .eq('id', productId)
    .single();

  if (error || !product) {
    return null;
  }

  return product;
};

// Create subscription (customers only)
exports.createSubscription = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { product_id, frequency, quantity, start_date } = req.body;
    const product = await getProductForSubscription(product_id);

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    if (!product.available) {
      return res.status(400).json({ error: 'Product is not currently available' });
    }

    const today = getToday();
    const nextOrderDate = getNextOccurrence(start_date, frequency, today);
    if (!nextOrderDate) {
      return res.status(400).json({ error: 'Invalid start date or frequency' });
    }

    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .insert([{
        customer_id: req.user.id,
        farm_id: product.farm_id,
        product_id,
        frequency,
        quantity: Number(quantity),
        start_date,
        next_order_date: nextOrderDate,
        active: true
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating subscription:', error);
      return res.status(500).json({ error: 'Failed to create subscription' });
    }

    try {
      await ensureOrderForSubscription(subscription, nextOrderDate);
      const nextDate = getNextDate(parseDate(nextOrderDate), frequency);
      const nextOrderDateAfter = nextDate ? formatDate(nextDate) : null;
      if (nextOrderDateAfter) {
        await supabase
          .from('subscriptions')
          .update({ next_order_date: nextOrderDateAfter })
          .eq('id', subscription.id);
      }
    } catch (orderError) {
      console.error('Error creating initial order:', orderError.message);
    }

    res.status(201).json({
      message: 'Subscription created successfully',
      subscription,
      nextOrderDate
    });
  } catch (error) {
    console.error('Create subscription error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get current user's subscriptions
exports.getMySubscriptions = async (req, res) => {
  try {
    const { data: subscriptions, error } = await supabase
      .from('subscriptions')
      .select(`
        id,
        frequency,
        quantity,
        start_date,
        next_order_date,
        active,
        created_at,
        farms (
          id,
          name,
          city,
          state
        ),
        products (
          id,
          name,
          description,
          price,
          unit,
          type
        )
      `)
      .eq('customer_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching subscriptions:', error);
      return res.status(500).json({ error: 'Failed to fetch subscriptions' });
    }

    res.json({ subscriptions: subscriptions || [] });
  } catch (error) {
    console.error('Get subscriptions error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Update subscription
exports.updateSubscription = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { frequency, quantity, start_date, active } = req.body;

    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('id', id)
      .eq('customer_id', req.user.id)
      .single();

    if (!subscription) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    const updateData = {};
    if (frequency !== undefined) updateData.frequency = frequency;
    if (quantity !== undefined) updateData.quantity = Number(quantity);
    if (start_date !== undefined) updateData.start_date = start_date;
    if (active !== undefined) updateData.active = active;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    if (frequency !== undefined || start_date !== undefined) {
      const today = getToday();
      const startDateValue = start_date || subscription.start_date;
      const frequencyValue = frequency || subscription.frequency;
      const nextOrderDate = getNextOccurrence(startDateValue, frequencyValue, today);
      if (nextOrderDate) {
        updateData.next_order_date = nextOrderDate;
      }
    }

    const { data: updatedSubscription, error } = await supabase
      .from('subscriptions')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating subscription:', error);
      return res.status(500).json({ error: 'Failed to update subscription' });
    }

    if (quantity !== undefined) {
      const { data: product } = await supabase
        .from('products')
        .select('price')
        .eq('id', subscription.product_id)
        .single();

      if (product) {
        const totalAmount = Number(product.price) * Number(updatedSubscription.quantity);
        await supabase
          .from('orders')
          .update({ quantity: updatedSubscription.quantity, total_amount: totalAmount })
          .eq('subscription_id', subscription.id)
          .gte('scheduled_date', getToday())
          .eq('status', 'pending');
      }
    }

    res.json({
      message: 'Subscription updated successfully',
      subscription: updatedSubscription
    });
  } catch (error) {
    console.error('Update subscription error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Cancel subscription
exports.cancelSubscription = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('id', id)
      .eq('customer_id', req.user.id)
      .single();

    if (!subscription) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    const { data: cancelledSubscription, error } = await supabase
      .from('subscriptions')
      .update({ active: false })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error cancelling subscription:', error);
      return res.status(500).json({ error: 'Failed to cancel subscription' });
    }

    await supabase
      .from('orders')
      .update({ status: 'cancelled' })
      .eq('subscription_id', subscription.id)
      .gte('scheduled_date', getToday())
      .eq('status', 'pending');

    res.json({
      message: 'Subscription cancelled successfully',
      subscription: cancelledSubscription
    });
  } catch (error) {
    console.error('Cancel subscription error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Preview upcoming schedule
exports.previewSchedule = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { frequency, start_date, count } = req.query;
    const previewCount = Math.min(Number(count) || 6, 12);
    const today = getToday();

    const dates = buildUpcomingDates(start_date, frequency, previewCount, today);

    res.json({ dates });
  } catch (error) {
    console.error('Preview schedule error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};
