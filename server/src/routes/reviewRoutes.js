const express = require('express');
const router = express.Router();
const {
  createReview,
  getVolunteerReviews,
  getRequestReview,
  getReviews,
} = require('../controllers/reviewController');

const { protect } = require('../middleware/auth');
const { writeLimiter } = require('../middleware/security');
const { validateSubmitReview } = require('../middleware/validate');

router
  .route('/')
  .post(protect, writeLimiter, validateSubmitReview, createReview)
  .get(getReviews);

router.get('/volunteer/:volunteerId', getVolunteerReviews);
router.get('/request/:requestId', getRequestReview);

module.exports = router;
