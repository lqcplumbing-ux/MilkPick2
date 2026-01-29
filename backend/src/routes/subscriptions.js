const express = require('express');
const { body, query } = require('express-validator');
const subscriptionController = require('../controllers/subscriptionController');
const { authenticate, isCustomer } = require('../middleware/auth');

const router = express.Router();

const subscriptionValidation = [
  body('product_id')
    .notEmpty()
    .isUUID()
    .withMessage('Product is required'),
  body('frequency')
    .isIn(['weekly', 'biweekly', 'monthly'])
    .withMessage('Frequency must be weekly, biweekly, or monthly'),
  body('quantity')
    .isInt({ min: 1 })
    .withMessage('Quantity must be at least 1'),
  body('start_date')
    .isISO8601()
    .withMessage('Start date must be in YYYY-MM-DD format')
];

const subscriptionUpdateValidation = [
  body('frequency')
    .optional()
    .isIn(['weekly', 'biweekly', 'monthly'])
    .withMessage('Frequency must be weekly, biweekly, or monthly'),
  body('quantity')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Quantity must be at least 1'),
  body('start_date')
    .optional()
    .isISO8601()
    .withMessage('Start date must be in YYYY-MM-DD format'),
  body('active')
    .optional()
    .isBoolean()
];

/**
 * @route   POST /api/subscriptions
 * @desc    Create a subscription
 * @access  Private (Customers only)
 */
router.post('/', authenticate, isCustomer, subscriptionValidation, subscriptionController.createSubscription);

/**
 * @route   GET /api/subscriptions
 * @desc    Get current user's subscriptions
 * @access  Private (Customers only)
 */
router.get('/', authenticate, isCustomer, subscriptionController.getMySubscriptions);

/**
 * @route   PUT /api/subscriptions/:id
 * @desc    Update subscription
 * @access  Private (Customers only)
 */
router.put('/:id', authenticate, isCustomer, subscriptionUpdateValidation, subscriptionController.updateSubscription);

/**
 * @route   DELETE /api/subscriptions/:id
 * @desc    Cancel subscription
 * @access  Private (Customers only)
 */
router.delete('/:id', authenticate, isCustomer, subscriptionController.cancelSubscription);

/**
 * @route   GET /api/subscriptions/preview
 * @desc    Preview upcoming schedule
 * @access  Private (Customers only)
 */
router.get('/preview', authenticate, isCustomer, [
  query('frequency')
    .isIn(['weekly', 'biweekly', 'monthly'])
    .withMessage('Frequency must be weekly, biweekly, or monthly'),
  query('start_date')
    .isISO8601()
    .withMessage('Start date must be in YYYY-MM-DD format'),
  query('count')
    .optional()
    .isInt({ min: 1, max: 12 })
], subscriptionController.previewSchedule);

module.exports = router;
