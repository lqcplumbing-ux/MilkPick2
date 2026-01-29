const express = require('express');
const router = express.Router();
const farmController = require('../controllers/farmController');
const { authenticate, isFarmer } = require('../middleware/auth');
const { body } = require('express-validator');

// Validation rules
const farmValidation = [
  body('name')
    .notEmpty()
    .trim()
    .isLength({ min: 2, max: 255 })
    .withMessage('Farm name must be between 2 and 255 characters'),
  body('description')
    .optional()
    .trim(),
  body('address')
    .optional()
    .trim(),
  body('city')
    .optional()
    .trim()
    .isLength({ max: 100 }),
  body('state')
    .optional()
    .trim()
    .isLength({ max: 50 }),
  body('zip_code')
    .optional()
    .trim()
    .isLength({ max: 20 }),
  body('phone')
    .optional()
    .trim(),
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email')
];

/**
 * @route   POST /api/farms
 * @desc    Create a new farm
 * @access  Private (Farmers only)
 */
router.post('/', authenticate, isFarmer, farmValidation, farmController.createFarm);

/**
 * @route   GET /api/farms
 * @desc    Get all farms
 * @access  Public
 */
router.get('/', farmController.getAllFarms);

/**
 * @route   GET /api/farms/my-farm
 * @desc    Get current farmer's farm
 * @access  Private (Farmers only)
 */
router.get('/my-farm', authenticate, isFarmer, farmController.getMyFarm);

/**
 * @route   GET /api/farms/:id
 * @desc    Get farm by ID
 * @access  Public
 */
router.get('/:id', farmController.getFarmById);

/**
 * @route   PUT /api/farms/:id
 * @desc    Update farm
 * @access  Private (Farm owner only)
 */
router.put('/:id', authenticate, isFarmer, farmController.updateFarm);

/**
 * @route   DELETE /api/farms/:id
 * @desc    Delete farm
 * @access  Private (Farm owner only)
 */
router.delete('/:id', authenticate, isFarmer, farmController.deleteFarm);

module.exports = router;
