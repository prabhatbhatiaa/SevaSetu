const mongoose = require('mongoose');
const {
  Review,
  ServiceRequest,
  VolunteerProfile,
  User,
  REQUEST_STATUS,
  USER_ROLES,
} = require('../models');

/**
 * @desc    Submit a review and rating for a completed service request
 * @route   POST /api/reviews
 * @access  Private (Requester only)
 */
const createReview = async (req, res, next) => {
  try {
    const { requestId, rating, feedback } = req.body;

    const request = await ServiceRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Service request not found.',
      });
    }

    // Only the requester (or platform admin) can submit a review
    const isRequester =
      request.requester.toString() === req.user._id.toString();
    const isAdmin = req.user.role === USER_ROLES.ADMIN;

    if (!isRequester && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to review this service request.',
      });
    }

    // Must be in COMPLETED status
    if (request.status !== REQUEST_STATUS.COMPLETED) {
      return res.status(400).json({
        success: false,
        message: `Cannot review a service request with status '${request.status}'. Request must be COMPLETED.`,
      });
    }

    if (!request.assignedVolunteer) {
      return res.status(400).json({
        success: false,
        message: 'No volunteer was assigned to this service request.',
      });
    }

    // Check if review already exists for this request
    const existingReview = await Review.findOne({ request: requestId });
    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: 'A review has already been submitted for this service request.',
      });
    }

    const review = await Review.create({
      request: requestId,
      volunteer: request.assignedVolunteer,
      requester: req.user._id,
      rating: Number(rating),
      feedback: feedback || '',
    });

    // Fetch updated volunteer stats after the review's post-save aggregation hook
    const updatedProfile = await VolunteerProfile.findOne({
      user: request.assignedVolunteer,
    });

    const populatedReview = await Review.findById(review._id)
      .populate('requester', 'name avatar city')
      .populate('volunteer', 'name avatar');

    res.status(201).json({
      success: true,
      message: 'Thank you! Your feedback has been recorded and volunteer rating updated.',
      data: populatedReview,
      volunteerStats: {
        newRating: updatedProfile ? updatedProfile.rating : Number(rating),
        totalReviews: updatedProfile ? updatedProfile.ratingCount : 1,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all reviews and rating breakdown for a volunteer
 * @route   GET /api/reviews/volunteer/:volunteerId
 * @access  Public
 */
const getVolunteerReviews = async (req, res, next) => {
  try {
    const { volunteerId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    let targetUserId = volunteerId;

    // Check if provided ID is a VolunteerProfile ID instead of User ID
    if (mongoose.Types.ObjectId.isValid(volunteerId)) {
      const profile = await VolunteerProfile.findById(volunteerId);
      if (profile) {
        targetUserId = profile.user.toString();
      }
    }

    const query = { volunteer: targetUserId };

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(50, parseInt(limit, 10) || 10));
    const skip = (pageNum - 1) * limitNum;

    const [reviews, total, aggregateStats, distributionStats] = await Promise.all([
      Review.find(query)
        .populate('requester', 'name avatar city createdAt')
        .populate('request', 'title category completedAt')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Review.countDocuments(query),
      Review.aggregate([
        { $match: { volunteer: new mongoose.Types.ObjectId(targetUserId) } },
        {
          $group: {
            _id: '$volunteer',
            averageRating: { $avg: '$rating' },
            count: { $sum: 1 },
          },
        },
      ]),
      Review.aggregate([
        { $match: { volunteer: new mongoose.Types.ObjectId(targetUserId) } },
        {
          $group: {
            _id: '$rating',
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    const averageRating =
      aggregateStats.length > 0
        ? Math.round(aggregateStats[0].averageRating * 10) / 10
        : 5.0;

    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    distributionStats.forEach((item) => {
      distribution[item._id] = item.count;
    });

    res.status(200).json({
      success: true,
      count: reviews.length,
      total,
      totalPages: Math.ceil(total / limitNum),
      currentPage: pageNum,
      ratingSummary: {
        averageRating,
        totalReviews: total,
        distribution,
      },
      data: reviews,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get review for a specific request
 * @route   GET /api/reviews/request/:requestId
 * @access  Public
 */
const getRequestReview = async (req, res, next) => {
  try {
    const { requestId } = req.params;

    const review = await Review.findOne({ request: requestId })
      .populate('requester', 'name avatar city')
      .populate('volunteer', 'name avatar');

    if (!review) {
      return res.status(200).json({
        success: true,
        data: null,
      });
    }

    res.status(200).json({
      success: true,
      data: review,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get reviews list with filtering
 * @route   GET /api/reviews
 * @access  Public
 */
const getReviews = async (req, res, next) => {
  try {
    const { volunteerId, requesterId, minRating, page = 1, limit = 10 } = req.query;

    const query = {};

    if (volunteerId) query.volunteer = volunteerId;
    if (requesterId) query.requester = requesterId;
    if (minRating) query.rating = { $gte: Number(minRating) };

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(50, parseInt(limit, 10) || 10));
    const skip = (pageNum - 1) * limitNum;

    const [reviews, total] = await Promise.all([
      Review.find(query)
        .populate('requester', 'name avatar city')
        .populate('volunteer', 'name avatar')
        .populate('request', 'title category')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Review.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      count: reviews.length,
      total,
      totalPages: Math.ceil(total / limitNum),
      currentPage: pageNum,
      data: reviews,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createReview,
  getVolunteerReviews,
  getRequestReview,
  getReviews,
};
