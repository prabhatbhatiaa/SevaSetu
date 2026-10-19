const express = require('express');
const router = express.Router();
const {
  createAssignment,
  respondToAssignment,
  completeAssignment,
  getAssignments,
  getAssignmentById,
} = require('../controllers/assignmentController');

const { protect } = require('../middleware/auth');
const { writeLimiter } = require('../middleware/security');
const {
  validateCreateAssignment,
  validateRespondAssignment,
  validateCompleteAssignment,
} = require('../middleware/validate');

router
  .route('/')
  .post(protect, writeLimiter, validateCreateAssignment, createAssignment)
  .get(protect, getAssignments);

router.route('/:id').get(protect, getAssignmentById);

router.put('/:id/respond', protect, writeLimiter, validateRespondAssignment, respondToAssignment);
router.put('/:id/complete', protect, writeLimiter, validateCompleteAssignment, completeAssignment);

module.exports = router;
