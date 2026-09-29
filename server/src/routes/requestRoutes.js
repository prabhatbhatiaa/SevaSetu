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
const {
  validateCreateServiceRequest,
  validateUpdateServiceRequest,
} = require('../middleware/validate');

// Public / Draft match preview
router.post('/preview-matches', previewMatches);

// Request collection routes
router
  .route('/')
  .post(protect, validateCreateServiceRequest, createRequest)
  .get(optionalAuth, getRequests);

// Request matching endpoint
router.get('/:id/matches', protect, getRequestMatches);

// Single request CRUD
router
  .route('/:id')
  .get(getRequestById)
  .put(protect, validateUpdateServiceRequest, updateRequest)
  .delete(protect, deleteRequest);

module.exports = router;
