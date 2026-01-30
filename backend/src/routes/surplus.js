const express = require('express');
const { body } = require('express-validator');
const surplusController = require('../controllers/surplusController');
const { authenticate, isCustomer, isFarmer } = require('../middleware/auth');

const router = express.Router();

/**
 * @route   POST /api/surplus/opt-in
 * @desc    Customer opt-in/out of surplus alerts
 * @access  Private (Customers only)
 */
router.post('/opt-in', authenticate, isCustomer, [
  body('farm_id').isUUID().withMessage('Farm is required'),
  body('product_id').isUUID().withMessage('Product is required'),
  body('opted_in').optional().isBoolean().toBoolean()
], surplusController.optIn);

/**
 * @route   GET /api/surplus/opt-ins
 * @desc    Get customer surplus opt-ins
 * @access  Private (Customers only)
 */
router.get('/opt-ins', authenticate, isCustomer, surplusController.getMyOptIns);

/**
 * @route   GET /api/surplus/available
 * @desc    Get available surplus items for customer
 * @access  Private (Customers only)
 */
router.get('/available', authenticate, isCustomer, surplusController.getAvailable);

/**
 * @route   POST /api/surplus/claim
 * @desc    Claim a surplus item
 * @access  Private (Customers only)
 */
router.post('/claim', authenticate, isCustomer, [
  body('inventory_id').isUUID().withMessage('Inventory item is required')
], surplusController.claim);

/**
 * @route   GET /api/surplus/history
 * @desc    Get customer surplus history
 * @access  Private (Customers only)
 */
router.get('/history', authenticate, isCustomer, surplusController.getMyHistory);

/**
 * @route   GET /api/surplus/farm/history
 * @desc    Get farm surplus history
 * @access  Private (Farmers only)
 */
router.get('/farm/history', authenticate, isFarmer, surplusController.getFarmHistory);

module.exports = router;
