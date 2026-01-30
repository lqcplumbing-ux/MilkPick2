const express = require('express');
const { body } = require('express-validator');
const paymentController = require('../controllers/paymentController');
const { authenticate, isCustomer, isFarmer } = require('../middleware/auth');

const router = express.Router();

/**
 * @route   POST /api/payments/setup-intent
 * @desc    Create a Stripe setup intent for saving cards
 * @access  Private (Customers only)
 */
router.post('/setup-intent', authenticate, isCustomer, paymentController.createSetupIntent);

/**
 * @route   POST /api/payments/methods
 * @desc    Store a payment method after setup
 * @access  Private (Customers only)
 */
router.post('/methods', authenticate, isCustomer, [
  body('payment_method_id')
    .notEmpty()
    .withMessage('Payment method is required'),
  body('make_default')
    .optional()
    .isBoolean()
], paymentController.storePaymentMethod);

/**
 * @route   GET /api/payments/methods
 * @desc    List customer payment methods
 * @access  Private (Customers only)
 */
router.get('/methods', authenticate, isCustomer, paymentController.listPaymentMethods);

/**
 * @route   POST /api/payments/methods/:id/default
 * @desc    Set default payment method
 * @access  Private (Customers only)
 */
router.post('/methods/:id/default', authenticate, isCustomer, paymentController.setDefaultPaymentMethod);

/**
 * @route   DELETE /api/payments/methods/:id
 * @desc    Remove a payment method
 * @access  Private (Customers only)
 */
router.delete('/methods/:id', authenticate, isCustomer, paymentController.removePaymentMethod);

/**
 * @route   POST /api/payments/orders/:id/pay
 * @desc    Charge the default payment method for an order
 * @access  Private (Customers only)
 */
router.post('/orders/:id/pay', authenticate, isCustomer, paymentController.payForOrder);

/**
 * @route   POST /api/payments/orders/:id/refund
 * @desc    Refund an order payment
 * @access  Private (Farmers only)
 */
router.post('/orders/:id/refund', authenticate, isFarmer, paymentController.refundOrder);

/**
 * @route   GET /api/payments/history
 * @desc    Get customer payment history
 * @access  Private (Customers only)
 */
router.get('/history', authenticate, isCustomer, paymentController.getPaymentHistory);

/**
 * @route   POST /api/payments/connect/onboard
 * @desc    Create Stripe Connect onboarding link
 * @access  Private (Farmers only)
 */
router.post('/connect/onboard', authenticate, isFarmer, paymentController.createConnectOnboarding);

/**
 * @route   GET /api/payments/connect/status
 * @desc    Get Stripe Connect status
 * @access  Private (Farmers only)
 */
router.get('/connect/status', authenticate, isFarmer, paymentController.getConnectStatus);

/**
 * @route   GET /api/payments/farm/transactions
 * @desc    Get farm transactions
 * @access  Private (Farmers only)
 */
router.get('/farm/transactions', authenticate, isFarmer, paymentController.getFarmTransactions);

module.exports = router;
