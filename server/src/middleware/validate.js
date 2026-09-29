const { validationResult, body } = require('express-validator');
const { USER_ROLES } = require('../models/constants');

/**
 * Middleware to check validation results and return formatted 400 errors
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formatted = errors.array().map((err) => ({
      field: err.path || err.param,
      message: err.msg,
    }));
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: formatted,
    });
  }
  next();
};

const validateRegister = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 2, max: 60 })
    .withMessage('Name must be between 2 and 60 characters'),
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('role')
    .optional()
    .isIn(Object.values(USER_ROLES))
    .withMessage(`Role must be one of: ${Object.values(USER_ROLES).join(', ')}`),
  body('phone')
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage('Phone number cannot exceed 20 characters'),
  handleValidationErrors,
];

const validateLogin = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  handleValidationErrors,
];

const validateUpdateProfile = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 60 })
    .withMessage('Name must be between 2 and 60 characters'),
  body('phone')
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage('Phone number cannot exceed 20 characters'),
  body('location.coordinates')
    .optional()
    .isArray({ min: 2, max: 2 })
    .withMessage('Coordinates must be an array of [longitude, latitude]'),
  handleValidationErrors,
];

const validateChangePassword = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .notEmpty()
    .withMessage('New password is required')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters long'),
  handleValidationErrors,
];

const { SERVICE_CATEGORIES, REQUEST_URGENCY, DAYS_OF_WEEK, TIME_SLOTS } = require('../models/constants');

const validateVolunteerProfile = [
  body('skills')
    .optional()
    .isArray()
    .withMessage('Skills must be an array of strings'),
  body('categories')
    .optional()
    .isArray()
    .withMessage('Categories must be an array')
    .custom((categories) => {
      const invalid = categories.filter((c) => !SERVICE_CATEGORIES.includes(c));
      if (invalid.length > 0) {
        throw new Error(`Invalid categories: ${invalid.join(', ')}`);
      }
      return true;
    }),
  body('serviceRadius')
    .optional()
    .isFloat({ min: 1, max: 100 })
    .withMessage('Service radius must be between 1 and 100 kilometers'),
  body('location.coordinates')
    .optional()
    .isArray({ min: 2, max: 2 })
    .withMessage('Coordinates must be an array of [longitude, latitude]'),
  body('bio')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Bio cannot exceed 500 characters'),
  body('availability')
    .optional()
    .isArray()
    .withMessage('Availability must be an array of schedule slots'),
  handleValidationErrors,
];

const validateCreateServiceRequest = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ min: 5, max: 120 })
    .withMessage('Title must be between 5 and 120 characters'),
  body('description')
    .trim()
    .notEmpty()
    .withMessage('Description is required')
    .isLength({ min: 10, max: 2000 })
    .withMessage('Description must be between 10 and 2000 characters'),
  body('category')
    .trim()
    .notEmpty()
    .withMessage('Category is required')
    .isIn(SERVICE_CATEGORIES)
    .withMessage(`Category must be one of: ${SERVICE_CATEGORIES.join(', ')}`),
  body('requiredSkills')
    .optional()
    .isArray()
    .withMessage('Required skills must be an array of strings'),
  body('urgency')
    .optional()
    .isIn(Object.values(REQUEST_URGENCY))
    .withMessage(`Urgency must be one of: ${Object.values(REQUEST_URGENCY).join(', ')}`),
  body('location')
    .notEmpty()
    .withMessage('Location is required'),
  body('location.coordinates')
    .isArray({ min: 2, max: 2 })
    .withMessage('Location coordinates must be an array of [longitude, latitude]')
    .custom(([lng, lat]) => {
      if (typeof lng !== 'number' || typeof lat !== 'number') {
        throw new Error('Coordinates must be numbers');
      }
      if (lng < -180 || lng > 180 || lat < -90 || lat > 90) {
        throw new Error('Coordinates are out of geographical range');
      }
      return true;
    }),
  body('preferredDate')
    .optional({ checkFalsy: true })
    .isISO8601()
    .withMessage('Preferred date must be a valid ISO date'),
  body('preferredTime')
    .optional()
    .trim()
    .isLength({ max: 50 }),
  handleValidationErrors,
];

const validateUpdateServiceRequest = [
  body('title')
    .optional()
    .trim()
    .isLength({ min: 5, max: 120 })
    .withMessage('Title must be between 5 and 120 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ min: 10, max: 2000 })
    .withMessage('Description must be between 10 and 2000 characters'),
  body('category')
    .optional()
    .trim()
    .isIn(SERVICE_CATEGORIES)
    .withMessage(`Category must be one of: ${SERVICE_CATEGORIES.join(', ')}`),
  body('requiredSkills')
    .optional()
    .isArray()
    .withMessage('Required skills must be an array of strings'),
  body('urgency')
    .optional()
    .isIn(Object.values(REQUEST_URGENCY))
    .withMessage(`Urgency must be one of: ${Object.values(REQUEST_URGENCY).join(', ')}`),
  body('location.coordinates')
    .optional()
    .isArray({ min: 2, max: 2 })
    .withMessage('Coordinates must be [longitude, latitude]'),
  handleValidationErrors,
];

module.exports = {
  handleValidationErrors,
  validateRegister,
  validateLogin,
  validateUpdateProfile,
  validateChangePassword,
  validateVolunteerProfile,
  validateCreateServiceRequest,
  validateUpdateServiceRequest,
};
