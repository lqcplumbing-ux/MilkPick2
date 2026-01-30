const supabase = require('../config/supabase');
const { attemptChargeForOrder } = require('./paymentService');
const { sendOrderConfirmation } = require('./notificationService');

const parseDate = (dateString) => {
  if (!dateString) return null;
  const parts = dateString.split('-').map(Number);
  if (parts.length !== 3 || parts.some((value) => Number.isNaN(value))) {
    return null;
  }
  const [year, month, day] = parts;
  return new Date(Date.UTC(year, month - 1, day));
};

const formatDate = (date) => date.toISOString().slice(0, 10);

const addDays = (date, days) => new Date(date.getTime() + days * 24 * 60 * 60 * 1000);

const addMonths = (date, months) => {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + months;
  const day = date.getUTCDate();
  const firstOfMonth = new Date(Date.UTC(year, month, 1));
  const daysInMonth = new Date(Date.UTC(firstOfMonth.getUTCFullYear(), firstOfMonth.getUTCMonth() + 1, 0)).getUTCDate();
  firstOfMonth.setUTCDate(Math.min(day, daysInMonth));
  return firstOfMonth;
};

const getNextDate = (currentDate, frequency) => {
  if (!currentDate) return null;
  switch (frequency) {
    case 'weekly':
      return addDays(currentDate, 7);
    case 'biweekly':
      return addDays(currentDate, 14);
    case 'monthly':
      return addMonths(currentDate, 1);
    default:
      return null;
  }
};

const getNextOccurrence = (startDateString, frequency, fromDateString) => {
  const startDate = parseDate(startDateString);
  const fromDate = parseDate(fromDateString);
  if (!startDate || !fromDate) return null;

  let nextDate = startDate;
  let guard = 0;
  while (nextDate < fromDate && guard < 500) {
    nextDate = getNextDate(nextDate, frequency);
    if (!nextDate) return null;
    guard += 1;
  }
  return formatDate(nextDate);
};

const buildUpcomingDates = (startDateString, frequency, count, fromDateString) => {
  const dates = [];
  let nextDateString = getNextOccurrence(startDateString, frequency, fromDateString);
  if (!nextDateString) return dates;

  let nextDate = parseDate(nextDateString);
  for (let i = 0; i < count; i += 1) {
    dates.push(formatDate(nextDate));
    const following = getNextDate(nextDate, frequency);
    if (!following) break;
    nextDate = following;
  }
  return dates;
};

const getProductPricing = async (productId) => {
  const { data: product, error } = await supabase
    .from('products')
    .select('id, price, name, unit')
    .eq('id', productId)
    .single();

  if (error || !product) {
    return null;
  }

  return product;
};

const ensureOrderForSubscription = async (subscription, scheduledDate) => {
  const { data: existingOrder } = await supabase
    .from('orders')
    .select('id')
    .eq('subscription_id', subscription.id)
    .eq('scheduled_date', scheduledDate)
    .maybeSingle();

  if (existingOrder) {
    return existingOrder;
  }

  const product = await getProductPricing(subscription.product_id);
  if (!product) {
    throw new Error('Product not found for subscription');
  }

  const totalAmount = Number(product.price) * Number(subscription.quantity);

  const { data: newOrder, error } = await supabase
    .from('orders')
    .insert([{
      subscription_id: subscription.id,
      customer_id: subscription.customer_id,
      farm_id: subscription.farm_id,
      product_id: subscription.product_id,
      quantity: subscription.quantity,
      total_amount: totalAmount,
      scheduled_date: scheduledDate,
      status: 'pending',
      payment_status: 'pending'
    }])
    .select()
    .single();

  if (error) {
    throw new Error('Failed to create order');
  }

  try {
    await sendOrderConfirmation({
      ...newOrder,
      products: product
    });
  } catch (notifyError) {
    console.error('Order confirmation notification error:', notifyError.message);
  }

  try {
    await attemptChargeForOrder(newOrder);
  } catch (paymentError) {
    console.error('Payment attempt failed:', paymentError.message);
  }

  return newOrder;
};

const generateOrdersForDueSubscriptions = async () => {
  const today = formatDate(new Date());

  const { data: subscriptions, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('active', true)
    .lte('next_order_date', today);

  if (error) {
    console.error('Error fetching due subscriptions:', error);
    return { created: 0, updated: 0 };
  }

  let createdCount = 0;
  let updatedCount = 0;

  for (const subscription of subscriptions || []) {
    let nextDateString = subscription.next_order_date || subscription.start_date;
    let guard = 0;
    while (nextDateString && nextDateString <= today && guard < 10) {
      try {
        await ensureOrderForSubscription(subscription, nextDateString);
        createdCount += 1;
      } catch (err) {
        console.error(`Order generation failed for subscription ${subscription.id}:`, err.message);
        break;
      }
      const nextDate = getNextDate(parseDate(nextDateString), subscription.frequency);
      nextDateString = nextDate ? formatDate(nextDate) : null;
      guard += 1;
    }

    if (nextDateString) {
      const { error: updateError } = await supabase
        .from('subscriptions')
        .update({ next_order_date: nextDateString })
        .eq('id', subscription.id);

      if (!updateError) {
        updatedCount += 1;
      }
    }
  }

  return { created: createdCount, updated: updatedCount };
};

module.exports = {
  parseDate,
  formatDate,
  getNextDate,
  getNextOccurrence,
  buildUpcomingDates,
  ensureOrderForSubscription,
  generateOrdersForDueSubscriptions
};
