const express = require('express');
const router = express.Router();
const {
  createRequest,
  getRequests,
  getRequestById,
  updateRequest,
  deleteRequest,
  getRequestMatches,
  previewMatches,
} = require('../controllers/requestController');

const { protect, optionalAuth } = require('../middleware/auth');
const { matchLimiter, writeLimiter } = require('../middleware/security');
const {
  validateCreateServiceRequest,
  validateUpdateServiceRequest,
} = require('../middleware/validate');

// Public / Draft match preview (rate-limited for computational protection)
router.post('/preview-matches', matchLimiter, previewMatches);

// Request collection routes
router
  .route('/')
  .post(protect, writeLimiter, validateCreateServiceRequest, createRequest)
  .get(optionalAuth, getRequests);

// Request matching endpoint (rate-limited for computational protection)
router.get('/:id/matches', protect, matchLimiter, getRequestMatches);

// Single request CRUD
router
  .route('/:id')
  .get(getRequestById)
  .put(protect, writeLimiter, validateUpdateServiceRequest, updateRequest)
  .delete(protect, deleteRequest);

module.exports = router;
