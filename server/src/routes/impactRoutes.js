const express = require('express');
const router = express.Router();
const {
  getPublicImpactStatistics,
  getAdminStatistics,
} = require('../controllers/impactController');

const { protect, authorize } = require('../middleware/auth');
const { USER_ROLES } = require('../models/constants');

// Public impact statistics
router.get('/', getPublicImpactStatistics);
router.get('/statistics', getPublicImpactStatistics);

// Admin-only metrics
router.get(
  '/admin/statistics',
  protect,
  authorize(USER_ROLES.ADMIN),
  getAdminStatistics
);

module.exports = router;
