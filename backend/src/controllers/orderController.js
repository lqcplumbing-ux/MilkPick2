const { validationResult } = require('express-validator');
const supabase = require('../config/supabase');
const { formatDate, parseDate } = require('../services/subscriptionService');
const {
  ensureQrCodeForOrder,
  createQrCodeDataUrl,
  isConfirmableStatus,
  updatePickupConfirmation
} = require('../services/pickupService');
const { sendScheduleChange } = require('../services/notificationService');

const getFarmForFarmer = async (farmerId) => {
  const { data: farm, error } = await supabase
    .from('farms')
    .select('id, name')
    .eq('farmer_id', farmerId)
    .single();

  if (error || !farm) {
    return null;
  }

  return farm;
};

// Get current user's orders
exports.getMyOrders = async (req, res) => {
  try {
    const { status, start_date, end_date } = req.query;
    let query = supabase
      .from('orders')
      .select(`
        id,
        subscription_id,
        quantity,
        total_amount,
        scheduled_date,
        status,
        pickup_confirmed_at,
        confirmation_method,
        payment_status,
        created_at,
        products (
          id,
          name,
          unit,
          type
        ),
        farms (
          id,
          name,
          city,
          state
        )
      `)
      .eq('customer_id', req.user.id)
      .order('scheduled_date', { ascending: true });

    if (status) {
      query = query.eq('status', status);
    }

    if (start_date) {
      query = query.gte('scheduled_date', start_date);
    }

    if (end_date) {
      query = query.lte('scheduled_date', end_date);
    }

    const { data: orders, error } = await query;

    if (error) {
      console.error('Error fetching orders:', error);
      return res.status(500).json({ error: 'Failed to fetch orders' });
    }

    res.json({ orders: orders || [] });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get upcoming orders for current user
exports.getUpcomingOrders = async (req, res) => {
  try {
    const today = formatDate(new Date());

    const { data: orders, error } = await supabase
      .from('orders')
      .select(`
        id,
        subscription_id,
        quantity,
        total_amount,
        scheduled_date,
        status,
        pickup_confirmed_at,
        confirmation_method,
        products (
          id,
          name,
          unit,
          type
        ),
        farms (
          id,
          name,
          city,
          state
        )
      `)
      .eq('customer_id', req.user.id)
      .gte('scheduled_date', today)
      .order('scheduled_date', { ascending: true });

    if (error) {
      console.error('Error fetching upcoming orders:', error);
      return res.status(500).json({ error: 'Failed to fetch upcoming orders' });
    }

    res.json({ orders: orders || [] });
  } catch (error) {
    console.error('Get upcoming orders error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get orders for farmer's farm
exports.getFarmOrders = async (req, res) => {
  try {
    const farm = await getFarmForFarmer(req.user.id);
    if (!farm) {
      return res.status(404).json({ error: 'Farm not found. Please create a farm first.' });
    }

    const { status, start_date, end_date, search, upcoming } = req.query;
    const today = formatDate(new Date());

    let query = supabase
      .from('orders')
      .select(`
        id,
        subscription_id,
        quantity,
        total_amount,
        scheduled_date,
        status,
        pickup_confirmed_at,
        confirmation_method,
        payment_status,
        notes,
        created_at,
        products (
          id,
          name,
          unit,
          type
        ),
        customers:users (
          id,
          email,
          phone,
          first_name,
          last_name
        )
      `)
      .eq('farm_id', farm.id)
      .order('scheduled_date', { ascending: true });

    if (status) {
      query = query.eq('status', status);
    }

    if (start_date) {
      query = query.gte('scheduled_date', start_date);
    }

    if (end_date) {
      query = query.lte('scheduled_date', end_date);
    }

    if (upcoming === 'true') {
      query = query.gte('scheduled_date', today);
    }

    const { data: orders, error } = await query;

    if (error) {
      console.error('Error fetching farm orders:', error);
      return res.status(500).json({ error: 'Failed to fetch orders' });
    }

    let filteredOrders = orders || [];
    if (search) {
      const term = search.toLowerCase();
      filteredOrders = filteredOrders.filter((order) => {
        const customer = order.customers || {};
        const customerName = `${customer.first_name || ''} ${customer.last_name || ''}`.trim().toLowerCase();
        const email = (customer.email || '').toLowerCase();
        const phone = (customer.phone || '').toLowerCase();
        const productName = (order.products?.name || '').toLowerCase();
        return (
          customerName.includes(term)
          || email.includes(term)
          || phone.includes(term)
          || productName.includes(term)
        );
      });
    }

    res.json({ orders: filteredOrders });
  } catch (error) {
    console.error('Get farm orders error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get order stats for farmer
exports.getFarmOrderStats = async (req, res) => {
  try {
    const farm = await getFarmForFarmer(req.user.id);
    if (!farm) {
      return res.status(404).json({ error: 'Farm not found. Please create a farm first.' });
    }

    const { start_date, end_date } = req.query;
    const today = formatDate(new Date());

    let query = supabase
      .from('orders')
      .select('id, status, scheduled_date, total_amount')
      .eq('farm_id', farm.id);

    if (start_date) {
      query = query.gte('scheduled_date', start_date);
    }
    if (end_date) {
      query = query.lte('scheduled_date', end_date);
    }

    const { data: orders, error } = await query;

    if (error) {
      console.error('Error fetching order stats:', error);
      return res.status(500).json({ error: 'Failed to fetch order stats' });
    }

    const stats = {
      total: 0,
      pending: 0,
      confirmed: 0,
      picked_up: 0,
      late: 0,
      cancelled: 0,
      no_show: 0,
      upcoming: 0,
      revenue: 0
    };

    (orders || []).forEach((order) => {
      stats.total += 1;
      if (stats[order.status] !== undefined) {
        stats[order.status] += 1;
      }
      if (order.scheduled_date >= today && order.status !== 'cancelled') {
        stats.upcoming += 1;
      }
      if (order.status !== 'cancelled') {
        stats.revenue += Number(order.total_amount || 0);
      }
    });

    res.json({ stats });
  } catch (error) {
    console.error('Get farm order stats error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Update upcoming order (customer only)
exports.updateOrder = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { quantity, scheduled_date, notes } = req.body;
    const today = formatDate(new Date());

    const { data: order } = await supabase
      .from('orders')
      .select('*')
      .eq('id', id)
      .eq('customer_id', req.user.id)
      .single();

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (order.status !== 'pending') {
      return res.status(400).json({ error: 'Only pending orders can be updated' });
    }

    if (order.scheduled_date < today) {
      return res.status(400).json({ error: 'Past orders cannot be updated' });
    }

    const updateData = {};
    if (quantity !== undefined) {
      updateData.quantity = Number(quantity);
    }
    if (scheduled_date !== undefined) {
      const parsed = parseDate(scheduled_date);
      if (!parsed) {
        return res.status(400).json({ error: 'Invalid scheduled date' });
      }
      const nextDate = formatDate(parsed);
      if (nextDate < today) {
        return res.status(400).json({ error: 'Scheduled date must be today or later' });
      }
      updateData.scheduled_date = nextDate;
    }
    if (notes !== undefined) updateData.notes = notes;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    if (updateData.quantity !== undefined) {
      const { data: product } = await supabase
        .from('products')
        .select('price')
        .eq('id', order.product_id)
        .single();

      if (product) {
        updateData.total_amount = Number(product.price) * Number(updateData.quantity);
      }
    }

    const { data: updatedOrder, error } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating order:', error);
      return res.status(500).json({ error: 'Failed to update order' });
    }

    try {
      const changes = [];
      if (updateData.scheduled_date && updateData.scheduled_date !== order.scheduled_date) {
        changes.push(`Pickup date changed to ${updateData.scheduled_date}.`);
      }
      if (updateData.quantity && updateData.quantity !== order.quantity) {
        changes.push(`Quantity updated to ${updateData.quantity}.`);
      }
      if (updateData.notes !== undefined && updateData.notes !== order.notes) {
        changes.push('Notes updated.');
      }
      if (changes.length > 0) {
        await sendScheduleChange(updatedOrder, changes.join(' '));
      }
    } catch (notifyError) {
      console.error('Schedule change notification error:', notifyError.message);
    }

    res.json({
      message: 'Order updated successfully',
      order: updatedOrder
    });
  } catch (error) {
    console.error('Update order error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Cancel order (customer only)
exports.cancelOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const today = formatDate(new Date());

    const { data: order } = await supabase
      .from('orders')
      .select('*')
      .eq('id', id)
      .eq('customer_id', req.user.id)
      .single();

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (order.status !== 'pending') {
      return res.status(400).json({ error: 'Only pending orders can be cancelled' });
    }

    if (order.scheduled_date < today) {
      return res.status(400).json({ error: 'Past orders cannot be cancelled' });
    }

    const { data: cancelledOrder, error } = await supabase
      .from('orders')
      .update({ status: 'cancelled' })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error cancelling order:', error);
      return res.status(500).json({ error: 'Failed to cancel order' });
    }

    try {
      await sendScheduleChange(cancelledOrder, 'Order cancelled.');
    } catch (notifyError) {
      console.error('Schedule change notification error:', notifyError.message);
    }

    res.json({
      message: 'Order cancelled successfully',
      order: cancelledOrder
    });
  } catch (error) {
    console.error('Cancel order error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get QR code for order (customer or farmer)
exports.getOrderQrCode = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: order, error } = await supabase
      .from('orders')
      .select('id, customer_id, farm_id, status, qr_code, scheduled_date')
      .eq('id', id)
      .single();

    if (error || !order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (req.user.role === 'customer') {
      if (order.customer_id !== req.user.id) {
        return res.status(403).json({ error: 'Access denied' });
      }
    } else if (req.user.role === 'farmer') {
      const farm = await getFarmForFarmer(req.user.id);
      if (!farm || order.farm_id !== farm.id) {
        return res.status(403).json({ error: 'Access denied' });
      }
    } else {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (['cancelled', 'no_show'].includes(order.status)) {
      return res.status(400).json({ error: 'QR code not available for cancelled orders' });
    }

    const code = await ensureQrCodeForOrder(order);
    const dataUrl = await createQrCodeDataUrl(code);

    res.json({
      order_id: order.id,
      qr_code: code,
      qr_image: dataUrl,
      scheduled_date: order.scheduled_date
    });
  } catch (error) {
    console.error('Get order QR error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Farmer manual pickup confirmation
exports.confirmOrderPickup = async (req, res) => {
  try {
    const { id } = req.params;
    const farm = await getFarmForFarmer(req.user.id);
    if (!farm) {
      return res.status(404).json({ error: 'Farm not found. Please create a farm first.' });
    }

    const { data: order } = await supabase
      .from('orders')
      .select('id, status, farm_id')
      .eq('id', id)
      .single();

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (order.farm_id !== farm.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (!isConfirmableStatus(order.status)) {
      return res.status(400).json({ error: 'Order cannot be confirmed' });
    }

    const updatedOrder = await updatePickupConfirmation(order.id, 'farmer_manual');
    res.json({ message: 'Pickup confirmed', order: updatedOrder });
  } catch (error) {
    console.error('Manual pickup confirmation error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Customer self pickup confirmation
exports.selfConfirmOrderPickup = async (req, res) => {
  try {
    const { id } = req.params;
    const today = formatDate(new Date());

    const { data: order } = await supabase
      .from('orders')
      .select('id, status, customer_id, scheduled_date')
      .eq('id', id)
      .single();

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (order.customer_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (order.scheduled_date > today) {
      return res.status(400).json({ error: 'Cannot confirm pickup before scheduled date' });
    }

    if (!isConfirmableStatus(order.status)) {
      return res.status(400).json({ error: 'Order cannot be confirmed' });
    }

    const updatedOrder = await updatePickupConfirmation(order.id, 'customer_self');
    res.json({ message: 'Pickup confirmed', order: updatedOrder });
  } catch (error) {
    console.error('Self pickup confirmation error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Farmer QR scan confirmation
exports.confirmPickupByQr = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'QR code is required' });
    }

    const farm = await getFarmForFarmer(req.user.id);
    if (!farm) {
      return res.status(404).json({ error: 'Farm not found. Please create a farm first.' });
    }

    const { data: order } = await supabase
      .from('orders')
      .select('id, status, farm_id')
      .eq('qr_code', code)
      .maybeSingle();

    if (!order) {
      return res.status(404).json({ error: 'Invalid QR code' });
    }

    if (order.farm_id !== farm.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (!isConfirmableStatus(order.status)) {
      return res.status(400).json({ error: 'Order cannot be confirmed' });
    }

    const updatedOrder = await updatePickupConfirmation(order.id, 'qr_code');
    res.json({ message: 'Pickup confirmed', order: updatedOrder });
  } catch (error) {
    console.error('QR pickup confirmation error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};
