const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { authenticate, isFarmer } = require('../middleware/auth');
const { body } = require('express-validator');
const multer = require('multer');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      const error = new Error('Only image files are allowed');
      error.status = 400;
      return cb(error);
    }
    return cb(null, true);
  }
});

// Validation rules
const productValidation = [
  body('name')
    .notEmpty()
    .trim()
    .isLength({ min: 2, max: 255 })
    .withMessage('Product name must be between 2 and 255 characters'),
  body('description')
    .optional()
    .trim(),
  body('price')
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number'),
  body('type')
    .isIn(['milk', 'beef', 'other'])
    .withMessage('Type must be milk, beef, or other'),
  body('unit')
    .optional()
    .trim()
    .isLength({ max: 50 }),
  body('available')
    .optional()
    .isBoolean(),
  body('image_url')
    .optional()
    .trim()
];

/**
 * @route   POST /api/products
 * @desc    Create a new product
 * @access  Private (Farmers only)
 */
router.post('/', authenticate, isFarmer, productValidation, productController.createProduct);

/**
 * @route   GET /api/products
 * @desc    Get all products (with optional filters)
 * @access  Public
 */
router.get('/', productController.getAllProducts);

/**
 * @route   GET /api/products/my-products
 * @desc    Get farmer's products
 * @access  Private (Farmers only)
 */
router.get('/my-products', authenticate, isFarmer, productController.getMyProducts);

/**
 * @route   GET /api/products/farm/:farmId
 * @desc    Get products by farm
 * @access  Public
 */
router.get('/farm/:farmId', productController.getProductsByFarm);

/**
 * @route   GET /api/products/:id
 * @desc    Get product by ID
 * @access  Public
 */
router.get('/:id', productController.getProductById);

/**
 * @route   PUT /api/products/:id
 * @desc    Update product
 * @access  Private (Product owner only)
 */
router.put('/:id', authenticate, isFarmer, productController.updateProduct);

/**
 * @route   POST /api/products/:id/image
 * @desc    Upload product image
 * @access  Private (Product owner only)
 */
router.post('/:id/image', authenticate, isFarmer, upload.single('image'), productController.uploadProductImage);

/**
 * @route   PATCH /api/products/:id/toggle
 * @desc    Toggle product availability
 * @access  Private (Product owner only)
 */
router.patch('/:id/toggle', authenticate, isFarmer, productController.toggleAvailability);

/**
 * @route   DELETE /api/products/:id
 * @desc    Delete product
 * @access  Private (Product owner only)
 */
router.delete('/:id', authenticate, isFarmer, productController.deleteProduct);

module.exports = router;
