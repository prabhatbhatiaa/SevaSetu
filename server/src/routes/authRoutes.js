const express = require('express');
const router = express.Router();
const {
  register,
  login,
  getMe,
  updateProfile,
  changePassword,
  verifyEmail,
  resendVerification,
  forgotPassword,
  resetPassword,
} = require('../controllers/authController');

const { protect } = require('../middleware/auth');
const { authLimiter } = require('../middleware/security');
const {
  validateRegister,
  validateLogin,
  validateUpdateProfile,
  validateChangePassword,
  validateForgotPassword,
  validateResetPassword,
} = require('../middleware/validate');

// Public authentication & registration
router.post('/register', authLimiter, validateRegister, register);
router.post('/login', authLimiter, validateLogin, login);

// Password recovery & email verification
router.post('/forgot-password', authLimiter, validateForgotPassword, forgotPassword);
router.post('/reset-password/:token', authLimiter, validateResetPassword, resetPassword);
router.get('/verify-email/:token', verifyEmail);
router.post('/resend-verification', protect, authLimiter, resendVerification);

// Authenticated session & profile management
router.get('/me', protect, getMe);
router.put('/profile', protect, validateUpdateProfile, updateProfile);
router.put('/change-password', protect, authLimiter, validateChangePassword, changePassword);

module.exports = router;
