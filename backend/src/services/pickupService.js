const crypto = require('crypto');
const QRCode = require('qrcode');
const supabase = require('../config/supabase');
const { parseDate } = require('./subscriptionService');

const DEFAULT_GRACE_HOURS = 24;

const getGracePeriodHours = () => {
  const value = Number(process.env.PICKUP_GRACE_PERIOD_HOURS);
  if (Number.isFinite(value) && value >= 0) {
    return value;
  }
  return DEFAULT_GRACE_HOURS;
};

const generateQrToken = () => crypto.randomBytes(16).toString('hex');

const ensureQrCodeForOrder = async (order) => {
  if (order.qr_code) {
    return order.qr_code;
  }

  const qrCode = generateQrToken();
  const { data, error } = await supabase
    .from('orders')
    .update({ qr_code: qrCode })
    .eq('id', order.id)
    .select('qr_code')
    .single();

  if (error || !data?.qr_code) {
    throw new Error('Failed to store QR code');
  }

  return data.qr_code;
};

const createQrCodeDataUrl = async (code) => {
  return QRCode.toDataURL(code, {
    width: 260,
    margin: 1,
    errorCorrectionLevel: 'M'
  });
};

const isConfirmableStatus = (status) => ['pending', 'confirmed', 'late'].includes(status);

const updatePickupConfirmation = async (orderId, method) => {
  const confirmation = {
    status: 'picked_up',
    pickup_confirmed_at: new Date().toISOString(),
    confirmation_method: method
  };

  const { data, error } = await supabase
    .from('orders')
    .update(confirmation)
    .eq('id', orderId)
    .select('id, status, pickup_confirmed_at, confirmation_method')
    .single();

  if (error || !data) {
    throw new Error('Failed to confirm pickup');
  }

  return data;
};

const markLateOrders = async () => {
  const graceHours = getGracePeriodHours();
  const now = new Date();
  const cutoff = new Date(now.getTime() - graceHours * 60 * 60 * 1000);
  const cutoffDate = cutoff.toISOString().slice(0, 10);

  const { data: orders, error } = await supabase
    .from('orders')
    .select('id, scheduled_date, status')
    .in('status', ['pending', 'confirmed'])
    .lte('scheduled_date', cutoffDate);

  if (error) {
    console.error('Error fetching orders for late pickup detection:', error.message);
    return { updated: 0 };
  }

  let updatedCount = 0;

  for (const order of orders || []) {
    const scheduled = parseDate(order.scheduled_date);
    if (!scheduled) {
      continue;
    }
    const dueTime = new Date(scheduled.getTime() + graceHours * 60 * 60 * 1000);
    if (now <= dueTime) {
      continue;
    }

    const { error: updateError } = await supabase
      .from('orders')
      .update({ status: 'late' })
      .eq('id', order.id)
      .in('status', ['pending', 'confirmed']);

    if (!updateError) {
      updatedCount += 1;
    }
  }

  return { updated: updatedCount };
};

module.exports = {
  getGracePeriodHours,
  ensureQrCodeForOrder,
  createQrCodeDataUrl,
  isConfirmableStatus,
  updatePickupConfirmation,
  markLateOrders
};
