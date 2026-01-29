const supabase = require('../config/supabase');
const { formatDate } = require('../services/subscriptionService');

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
