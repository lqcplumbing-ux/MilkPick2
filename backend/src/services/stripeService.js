const Stripe = require('stripe');

let stripeClient = null;

const getStripeClient = () => {
  if (stripeClient) {
    return stripeClient;
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error('Stripe secret key is not configured');
  }

  stripeClient = new Stripe(secretKey);
  return stripeClient;
};

module.exports = {
  getStripeClient
};
