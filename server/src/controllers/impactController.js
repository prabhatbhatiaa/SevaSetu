const mongoose = require('mongoose');
const {
  ServiceRequest,
  VolunteerProfile,
  User,
  Review,
  Assignment,
  REQUEST_STATUS,
  USER_ROLES,
} = require('../models');

/**
 * @desc    Get public community impact statistics and SDG metrics
 * @route   GET /api/impact/statistics (and GET /api/public/impact)
 * @access  Public
 */
const getPublicImpactStatistics = async (req, res, next) => {
  try {
    const [
      totalRequests,
      completedServices,
      activeRequests,
      totalVolunteers,
      activeVolunteers,
      communityMembers,
      totalReviews,
      ratingAggregate,
      categoryStats,
      urgencyStats,
      recentCompleted,
    ] = await Promise.all([
      ServiceRequest.countDocuments(),
      ServiceRequest.countDocuments({ status: REQUEST_STATUS.COMPLETED }),
      ServiceRequest.countDocuments({
        status: {
          $in: [
            REQUEST_STATUS.PENDING,
            REQUEST_STATUS.ASSIGNED,
            REQUEST_STATUS.IN_PROGRESS,
          ],
        },
      }),
      User.countDocuments({ role: USER_ROLES.VOLUNTEER }),
      VolunteerProfile.countDocuments({ isActive: true }),
      User.countDocuments({ role: USER_ROLES.COMMUNITY_MEMBER }),
      Review.countDocuments(),
      VolunteerProfile.aggregate([
        { $match: { isActive: true, ratingCount: { $gt: 0 } } },
        {
          $group: {
            _id: null,
            avgRating: { $avg: '$rating' },
          },
        },
      ]),
      ServiceRequest.aggregate([
        {
          $group: {
            _id: '$category',
            total: { $sum: 1 },
            completed: {
              $sum: {
                $cond: [{ $eq: ['$status', REQUEST_STATUS.COMPLETED] }, 1, 0],
              },
            },
          },
        },
        { $sort: { total: -1 } },
      ]),
      ServiceRequest.aggregate([
        {
          $group: {
            _id: '$urgency',
            count: { $sum: 1 },
          },
        },
      ]),
      ServiceRequest.find({ status: REQUEST_STATUS.COMPLETED })
        .select('title category location.city completedAt')
        .sort({ completedAt: -1 })
        .limit(5)
        .lean(),
    ]);

    const averageRating =
      ratingAggregate.length > 0
        ? Math.round(ratingAggregate[0].avgRating * 10) / 10
        : 4.8;

    const completionRate =
      totalRequests > 0
        ? Math.round((completedServices / totalRequests) * 100)
        : 100;

    const formattedCategories = categoryStats.map((cat) => ({
      category: cat._id,
      total: cat.total,
      completed: cat.completed,
    }));

    const formattedUrgency = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
    };
    urgencyStats.forEach((u) => {
      if (u._id) formattedUrgency[u._id] = u.count;
    });

    res.status(200).json({
      success: true,
      data: {
        summary: {
          totalRequests,
          completedServices,
          activeRequests,
          totalVolunteers,
          activeVolunteers,
          communityMembers,
          averageRating,
          totalReviews,
          completionRate,
        },
        categories: formattedCategories,
        urgencyDistribution: formattedUrgency,
        recentImpactFeed: recentCompleted,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get detailed platform analytics and administrative insights
 * @route   GET /api/admin/statistics
 * @access  Private (Admin only)
 */
const getAdminStatistics = async (req, res, next) => {
  try {
    const [
      totalRequests,
      statusCounts,
      totalUsers,
      roleCounts,
      topVolunteers,
      completionTimeStats,
      recentAssignments,
    ] = await Promise.all([
      ServiceRequest.countDocuments(),
      ServiceRequest.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
          },
        },
      ]),
      User.countDocuments(),
      User.aggregate([
        {
          $group: {
            _id: '$role',
            count: { $sum: 1 },
          },
        },
      ]),
      VolunteerProfile.find({ isActive: true })
        .populate('user', 'name email avatar phone')
        .sort({ completedTasks: -1, rating: -1 })
        .limit(5)
        .lean(),
      ServiceRequest.aggregate([
        {
          $match: {
            status: REQUEST_STATUS.COMPLETED,
            completedAt: { $exists: true, $ne: null },
            createdAt: { $exists: true, $ne: null },
          },
        },
        {
          $project: {
            durationHours: {
              $divide: [
                { $subtract: ['$completedAt', '$createdAt'] },
                1000 * 60 * 60, // ms to hours
              ],
            },
          },
        },
        {
          $group: {
            _id: null,
            avgHours: { $avg: '$durationHours' },
            minHours: { $min: '$durationHours' },
            maxHours: { $max: '$durationHours' },
          },
        },
      ]),
      Assignment.find()
        .populate('request', 'title category')
        .populate('volunteer', 'name email')
        .sort({ createdAt: -1 })
        .limit(10)
        .lean(),
    ]);

    const formattedStatuses = {
      PENDING: 0,
      ASSIGNED: 0,
      IN_PROGRESS: 0,
      COMPLETED: 0,
      CANCELLED: 0,
    };
    statusCounts.forEach((s) => {
      if (s._id) formattedStatuses[s._id] = s.count;
    });

    const formattedRoles = {
      community_member: 0,
      volunteer: 0,
      admin: 0,
    };
    roleCounts.forEach((r) => {
      if (r._id) formattedRoles[r._id] = r.count;
    });

    const averageResolutionHours =
      completionTimeStats.length > 0
        ? Math.round(completionTimeStats[0].avgHours * 10) / 10
        : 0;

    res.status(200).json({
      success: true,
      data: {
        overview: {
          totalRequests,
          totalUsers,
          averageResolutionHours,
        },
        requestsByStatus: formattedStatuses,
        usersByRole: formattedRoles,
        topVolunteers,
        recentAssignments,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPublicImpactStatistics,
  getAdminStatistics,
};
