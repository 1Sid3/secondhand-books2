const { body, query } = require('express-validator');

const registerValidator = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
];

const loginValidator = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

const createListingValidator = [
  body('title')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Title is required and must be less than 200 characters'),
  body('author')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Author is required and must be less than 100 characters'),
  body('description')
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage('Description must be between 10 and 1000 characters'),
  body('condition')
    .isIn(['new', 'like-new', 'good', 'fair'])
    .withMessage('Invalid condition'),
  body('price')
    .isFloat({ min: 1 })
    .withMessage('Price must be a positive number'),
  body('category')
    .isIn(['fiction', 'non-fiction', 'academic', 'children', 'comics', 'textbook', 'other'])
    .withMessage('Invalid category'),
  body('city')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('City is required and must be less than 50 characters'),
  body('phone')
    .trim()
    .matches(/^[0-9+\-\s()]+$/)
    .isLength({ min: 10 })
    .withMessage('Please provide a valid phone number'),
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email'),
  body('upiId')
    .trim()
    .notEmpty()
    .withMessage('UPI ID is required')
];

const searchValidator = [
  query('search').optional().trim(),
  query('author').optional().trim(),
  query('category').optional().isIn(['fiction', 'non-fiction', 'academic', 'children', 'comics', 'textbook', 'other']),
  query('city').optional().trim(),
  query('minPrice').optional().isFloat({ min: 0 }),
  query('maxPrice').optional().isFloat({ min: 0 }),
  query('condition').optional().isIn(['new', 'like-new', 'good', 'fair']),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 50 })
];

module.exports = {
  registerValidator,
  loginValidator,
  createListingValidator,
  searchValidator
};
