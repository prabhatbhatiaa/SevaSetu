const {
  ServiceRequest,
  VolunteerProfile,
  User,
  REQUEST_STATUS,
  USER_ROLES,
} = require('../models');

const {
  findMatchesForRequest,
  rankVolunteers,
} = require('../algorithms/volunteerMatcher');

/**
 * @desc    Create a new service request
 * @route   POST /api/requests
 * @access  Private
 */
const createRequest = async (req, res, next) => {
  try {
    const {
      title,
      description,
      category,
      requiredSkills,
      urgency,
      location,
      preferredDate,
      preferredTime,
    } = req.body;

    const request = await ServiceRequest.create({
      requester: req.user._id,
      title,
      description,
      category,
      requiredSkills: Array.isArray(requiredSkills) ? requiredSkills : [],
      urgency: urgency || 'medium',
      location: {
        type: 'Point',
        coordinates: location.coordinates,
        address: location.address || '',
        city: location.city || '',
        state: location.state || '',
        pincode: location.pincode || '',
      },
      preferredDate: preferredDate || null,
      preferredTime: preferredTime || '',
      status: REQUEST_STATUS.PENDING,
    });

    const populatedRequest = await ServiceRequest.findById(request._id).populate(
      'requester',
      'name email phone avatar location'
    );

    res.status(201).json({
      success: true,
      message: 'Service request created successfully.',
      data: populatedRequest,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all service requests with advanced filtering & geospatial search
 * @route   GET /api/requests
 * @access  Public (Optional auth for my requests)
 */
const getRequests = async (req, res, next) => {
  try {
    const {
      status,
      category,
      urgency,
      mine,
      assignedToMe,
      near, // "lng,lat"
      maxDistance = 25, // in km
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      page = 1,
      limit = 10,
    } = req.query;

    const query = {};

    // Filter by status (single or comma-separated)
    if (status) {
      if (status.includes(',')) {
        query.status = { $in: status.split(',') };
      } else {
        query.status = status;
      }
    }

    if (category) {
      query.category = category;
    }

    if (urgency) {
      query.urgency = urgency;
    }

    // Filter by requester
    if (mine === 'true' && req.user) {
      query.requester = req.user._id;
    }

    // Filter by assigned volunteer
    if (assignedToMe === 'true' && req.user) {
      query.assignedVolunteer = req.user._id;
    }

    // Text search on title or description
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { requiredSkills: { $regex: search, $options: 'i' } },
      ];
    }

    // Geospatial search
    if (near) {
      const parts = near.split(',').map(Number);
      if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        query.location = {
          $nearSphere: {
            $geometry: {
              type: 'Point',
              coordinates: parts,
            },
            $maxDistance: Number(maxDistance) * 1000, // convert km to meters
          },
        };
      }
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(50, parseInt(limit, 10) || 10));
    const skip = (pageNum - 1) * limitNum;

    // Sorting (note: $nearSphere cannot use standard .sort())
    let queryExec = ServiceRequest.find(query)
      .populate('requester', 'name avatar city')
      .populate('assignedVolunteer', 'name avatar rating');

    if (!near) {
      const sort = {};
      sort[sortBy] = sortOrder === 'asc' ? 1 : -1;
      queryExec = queryExec.sort(sort);
    }

    const [requests, total] = await Promise.all([
      queryExec.skip(skip).limit(limitNum).lean(),
      ServiceRequest.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      count: requests.length,
      total,
      totalPages: Math.ceil(total / limitNum),
      currentPage: pageNum,
      data: requests,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single service request by ID
 * @route   GET /api/requests/:id
 * @access  Public
 */
const getRequestById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const request = await ServiceRequest.findById(id)
      .populate('requester', 'name email phone avatar location')
      .populate('assignedVolunteer', 'name email phone avatar rating');

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Service request not found.',
      });
    }

    res.status(200).json({
      success: true,
      data: request,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update a service request
 * @route   PUT /api/requests/:id
 * @access  Private (Owner or Admin)
 */
const updateRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    let request = await ServiceRequest.findById(id);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Service request not found.',
      });
    }

    // Ownership check
    const isOwner = request.requester.toString() === req.user._id.toString();
    const isAdmin = req.user.role === USER_ROLES.ADMIN;

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this service request.',
      });
    }

    // Prevent modifications if task is already in progress or completed
    if (
      [REQUEST_STATUS.IN_PROGRESS, REQUEST_STATUS.COMPLETED].includes(request.status) &&
      !isAdmin
    ) {
      return res.status(400).json({
        success: false,
        message: `Cannot edit a request that is currently ${request.status}.`,
      });
    }

    const {
      title,
      description,
      category,
      requiredSkills,
      urgency,
      location,
      preferredDate,
      preferredTime,
    } = req.body;

    if (title !== undefined) request.title = title;
    if (description !== undefined) request.description = description;
    if (category !== undefined) request.category = category;
    if (requiredSkills !== undefined) request.requiredSkills = requiredSkills;
    if (urgency !== undefined) request.urgency = urgency;
    if (preferredDate !== undefined) request.preferredDate = preferredDate;
    if (preferredTime !== undefined) request.preferredTime = preferredTime;

    if (location) {
      request.location = {
        type: 'Point',
        coordinates: location.coordinates || request.location.coordinates,
        address: location.address !== undefined ? location.address : request.location.address,
        city: location.city !== undefined ? location.city : request.location.city,
        state: location.state !== undefined ? location.state : request.location.state,
        pincode: location.pincode !== undefined ? location.pincode : request.location.pincode,
      };
    }

    await request.save();
    const updated = await ServiceRequest.findById(request._id).populate(
      'requester',
      'name avatar'
    );

    res.status(200).json({
      success: true,
      message: 'Service request updated successfully.',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Cancel a service request
 * @route   DELETE /api/requests/:id
 * @access  Private (Owner or Admin)
 */
const deleteRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const request = await ServiceRequest.findById(id);
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Service request not found.',
      });
    }

    const isOwner = request.requester.toString() === req.user._id.toString();
    const isAdmin = req.user.role === USER_ROLES.ADMIN;

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to cancel this service request.',
      });
    }

    request.status = REQUEST_STATUS.CANCELLED;
    request.cancelledAt = new Date();
    request.cancellationReason = reason || 'Cancelled by requester';

    await request.save();

    res.status(200).json({
      success: true,
      message: 'Service request cancelled successfully.',
      data: request,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get ranked volunteer matches for an existing service request
 * @route   GET /api/requests/:id/matches
 * @access  Private (Requester, Admin, or Volunteers)
 */
const getRequestMatches = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { limit = 10, minScore = 20 } = req.query;

    const request = await ServiceRequest.findById(id).populate(
      'requester',
      'name avatar city'
    );

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Service request not found.',
      });
    }

    const matches = await findMatchesForRequest(request, {
      limit: parseInt(limit, 10) || 10,
      minScore: parseFloat(minScore) || 20,
    });

    res.status(200).json({
      success: true,
      request: {
        id: request._id,
        title: request.title,
        category: request.category,
        requiredSkills: request.requiredSkills,
        urgency: request.urgency,
        location: request.location,
        status: request.status,
      },
      count: matches.length,
      matches,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Live match preview for draft requests (wizard form assistance)
 * @route   POST /api/requests/preview-matches
 * @access  Public / Private
 */
const previewMatches = async (req, res, next) => {
  try {
    const draftRequest = req.body;
    const { limit = 5 } = req.query;

    const query = { isActive: true };

    if (
      draftRequest.location?.coordinates &&
      Array.isArray(draftRequest.location.coordinates) &&
      draftRequest.location.coordinates.length === 2
    ) {
      query.location = {
        $nearSphere: {
          $geometry: {
            type: 'Point',
            coordinates: draftRequest.location.coordinates,
          },
          $maxDistance: 50000, // 50km
        },
      };
    }

    const candidates = await VolunteerProfile.find(query)
      .populate('user', 'name avatar city rating')
      .limit(30);

    const matches = rankVolunteers(draftRequest, candidates, {
      limit: parseInt(limit, 10) || 5,
      minScore: 10,
    });

    res.status(200).json({
      success: true,
      count: matches.length,
      matches,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createRequest,
  getRequests,
  getRequestById,
  updateRequest,
  deleteRequest,
  getRequestMatches,
  previewMatches,
};
