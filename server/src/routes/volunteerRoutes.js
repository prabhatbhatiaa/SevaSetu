const express = require('express');
const router = express.Router();
const {
  getMyVolunteerProfile,
  updateVolunteerProfile,
  getVolunteers,
  getVolunteerById,
  getMatchedRequestsForVolunteer,
} = require('../controllers/volunteerController');

const { protect, authorize, optionalAuth } = require('../middleware/auth');
const { validateVolunteerProfile } = require('../middleware/validate');
const { USER_ROLES } = require('../models/constants');

// Logged-in volunteer profile routes
router.get(
  '/me',
  protect,
  authorize(USER_ROLES.VOLUNTEER, USER_ROLES.ADMIN),
  getMyVolunteerProfile
);

router.get(
  '/matched-requests',
  protect,
  authorize(USER_ROLES.VOLUNTEER, USER_ROLES.ADMIN),
  getMatchedRequestsForVolunteer
);

router.put(
  '/profile',
  protect,
  authorize(USER_ROLES.VOLUNTEER, USER_ROLES.ADMIN),
  validateVolunteerProfile,
  updateVolunteerProfile
);

// Public browse routes (with optional authentication for role-based view)
router.get('/', optionalAuth, getVolunteers);
router.get('/:id', optionalAuth, getVolunteerById);

module.exports = router;
