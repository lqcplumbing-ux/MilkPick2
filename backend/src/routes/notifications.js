const express = require('express');
const { body } = require('express-validator');
const notificationController = require('../controllers/notificationController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

/**
 * @route   GET /api/notifications
 * @desc    Get notification history for current user
 * @access  Private
 */
router.get('/', authenticate, notificationController.getMyNotifications);

/**
 * @route   GET /api/notifications/preferences
 * @desc    Get notification preferences
 * @access  Private
 */
router.get('/preferences', authenticate, notificationController.getPreferences);

/**
 * @route   PUT /api/notifications/preferences
 * @desc    Update notification preferences
 * @access  Private
 */
router.put('/preferences', authenticate, [
  body('sms_enabled').optional().isBoolean().toBoolean(),
  body('email_enabled').optional().isBoolean().toBoolean(),
  body('order_confirmation').optional().isBoolean().toBoolean(),
  body('pickup_reminder').optional().isBoolean().toBoolean(),
  body('late_pickup').optional().isBoolean().toBoolean(),
  body('schedule_change').optional().isBoolean().toBoolean(),
  body('payment_confirmation').optional().isBoolean().toBoolean(),
  body('weekly_summary').optional().isBoolean().toBoolean(),
  body('surplus_alert').optional().isBoolean().toBoolean()
], notificationController.updatePreferences);

module.exports = router;
