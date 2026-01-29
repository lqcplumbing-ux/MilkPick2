const express = require('express');
const orderController = require('../controllers/orderController');
const { authenticate, isCustomer } = require('../middleware/auth');

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

module.exports = router;
