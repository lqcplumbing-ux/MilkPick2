const express = require('express');
const { body } = require('express-validator');
const inventoryController = require('../controllers/inventoryController');
const { authenticate, isFarmer } = require('../middleware/auth');

const router = express.Router();

const inventoryValidation = [
  body('product_id')
    .notEmpty()
    .isUUID()
    .withMessage('Product is required'),
  body('quantity')
    .isFloat({ min: 0 })
    .withMessage('Quantity must be 0 or greater'),
  body('date')
    .optional()
    .isISO8601()
    .withMessage('Date must be in YYYY-MM-DD format'),
  body('low_stock_threshold')
    .optional({ nullable: true })
    .isFloat({ min: 0 })
    .withMessage('Low stock threshold must be 0 or greater'),
  body('is_surplus')
    .optional()
    .isBoolean(),
  body('notes')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 500 })
];

/**
 * @route   POST /api/inventory
 * @desc    Create or update inventory for a product/date
 * @access  Private (Farmers only)
 */
router.post('/', authenticate, isFarmer, inventoryValidation, inventoryController.upsertInventory);

/**
 * @route   GET /api/inventory/my-farm
 * @desc    Get current farmer inventory (optionally by date)
 * @access  Private (Farmers only)
 */
router.get('/my-farm', authenticate, isFarmer, inventoryController.getMyFarmInventory);

/**
 * @route   GET /api/inventory/farm/:farmId
 * @desc    Get inventory by farm (owner only)
 * @access  Private (Farmers only)
 */
router.get('/farm/:farmId', authenticate, isFarmer, inventoryController.getFarmInventory);

/**
 * @route   GET /api/inventory/history
 * @desc    Get inventory history with optional filters
 * @access  Private (Farmers only)
 */
router.get('/history', authenticate, isFarmer, inventoryController.getInventoryHistory);

/**
 * @route   GET /api/inventory/low-stock
 * @desc    Get low stock items for current farm
 * @access  Private (Farmers only)
 */
router.get('/low-stock', authenticate, isFarmer, inventoryController.getLowStock);

module.exports = router;
