const express = require('express');
const { body } = require('express-validator');
const orderController = require('../controllers/orderController');
const { authenticate, isCustomer, isFarmer } = require('../middleware/auth');

const router = express.Router();

/**
 * @route   GET /api/orders
 * @desc    Get current user's orders
 * @access  Private (Customers only)
 */
router.get('/', authenticate, isCustomer, orderController.getMyOrders);

/**
 * @route   GET /api/orders/upcoming
 * @desc    Get upcoming orders for current user
 * @access  Private (Customers only)
 */
router.get('/upcoming', authenticate, isCustomer, orderController.getUpcomingOrders);

/**
 * @route   GET /api/orders/farm
 * @desc    Get orders for current farmer's farm
 * @access  Private (Farmers only)
 */
router.get('/farm', authenticate, isFarmer, orderController.getFarmOrders);

/**
 * @route   GET /api/orders/farm/stats
 * @desc    Get order statistics for current farmer
 * @access  Private (Farmers only)
 */
router.get('/farm/stats', authenticate, isFarmer, orderController.getFarmOrderStats);

/**
 * @route   GET /api/orders/:id/qr
 * @desc    Get QR code for an order
 * @access  Private (Customer or Farmer)
 */
router.get('/:id/qr', authenticate, orderController.getOrderQrCode);

/**
 * @route   POST /api/orders/scan
 * @desc    Confirm pickup via QR scan
 * @access  Private (Farmers only)
 */
router.post('/scan', authenticate, isFarmer, [
  body('code')
    .notEmpty()
    .withMessage('QR code is required')
], orderController.confirmPickupByQr);

/**
 * @route   POST /api/orders/:id/confirm
 * @desc    Manually confirm pickup
 * @access  Private (Farmers only)
 */
router.post('/:id/confirm', authenticate, isFarmer, orderController.confirmOrderPickup);

/**
 * @route   POST /api/orders/:id/self-confirm
 * @desc    Customer self-confirm pickup
 * @access  Private (Customers only)
 */
router.post('/:id/self-confirm', authenticate, isCustomer, orderController.selfConfirmOrderPickup);

/**
 * @route   PUT /api/orders/:id
 * @desc    Update upcoming order
 * @access  Private (Customers only)
 */
router.put('/:id', authenticate, isCustomer, [
  body('quantity')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Quantity must be at least 1'),
  body('scheduled_date')
    .optional()
    .isISO8601()
    .withMessage('Scheduled date must be in YYYY-MM-DD format'),
  body('notes')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 500 })
], orderController.updateOrder);

/**
 * @route   PATCH /api/orders/:id/cancel
 * @desc    Cancel upcoming order
 * @access  Private (Customers only)
 */
router.patch('/:id/cancel', authenticate, isCustomer, orderController.cancelOrder);

module.exports = router;
