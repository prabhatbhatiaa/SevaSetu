const {
  Assignment,
  ServiceRequest,
  VolunteerProfile,
  User,
  REQUEST_STATUS,
  ASSIGNMENT_STATUS,
  USER_ROLES,
} = require('../models');

const { calculateMatchScore } = require('../algorithms/volunteerMatcher');

/**
 * @desc    Create a new assignment (offer or direct claim)
 * @route   POST /api/assignments
 * @access  Private (Requester, Volunteer, or Admin)
 */
const createAssignment = async (req, res, next) => {
  try {
    const { requestId, volunteerId, notes } = req.body;

    const request = await ServiceRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Service request not found.',
      });
    }

    if (request.status !== REQUEST_STATUS.PENDING) {
      return res.status(400).json({
        success: false,
        message: `Service request is not open for assignment. Current status: ${request.status}`,
      });
    }

    let targetVolunteerId;
    let isSelfClaim = false;

    if (req.user.role === USER_ROLES.VOLUNTEER) {
      // Volunteer claiming the task directly
      targetVolunteerId = req.user._id;
      isSelfClaim = true;
    } else if (req.user.role === USER_ROLES.COMMUNITY_MEMBER) {
      // Requester assigning a volunteer
      const isOwner = request.requester.toString() === req.user._id.toString();
      if (!isOwner) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to assign volunteers to this service request.',
        });
      }

      if (!volunteerId) {
        return res.status(400).json({
          success: false,
          message: 'Volunteer ID is required to create an assignment.',
        });
      }
      targetVolunteerId = volunteerId;
    } else if (req.user.role === USER_ROLES.ADMIN) {
      if (!volunteerId) {
        return res.status(400).json({
          success: false,
          message: 'Volunteer ID is required to create an assignment.',
        });
      }
      targetVolunteerId = volunteerId;
    }

    // Verify volunteer profile
    const volunteerProfile = await VolunteerProfile.findOne({
      user: targetVolunteerId,
    });

    if (!volunteerProfile || !volunteerProfile.isActive) {
      return res.status(400).json({
        success: false,
        message: 'The selected volunteer does not have an active volunteer profile.',
      });
    }

    // Check for duplicate active assignment
    const existingActive = await Assignment.findOne({
      request: request._id,
      volunteer: targetVolunteerId,
      status: { $in: [ASSIGNMENT_STATUS.OFFERED, ASSIGNMENT_STATUS.ACCEPTED] },
    });

    if (existingActive) {
      return res.status(400).json({
        success: false,
        message: 'An active assignment already exists for this volunteer and request.',
      });
    }

    // Compute explainable multi-factor match score
    const matchResult = calculateMatchScore(request, volunteerProfile);

    // Determine initial state
    let initialAssignmentStatus;
    let newRequestStatus;

    if (isSelfClaim) {
      initialAssignmentStatus = ASSIGNMENT_STATUS.ACCEPTED;
      newRequestStatus = REQUEST_STATUS.IN_PROGRESS;
    } else {
      initialAssignmentStatus = ASSIGNMENT_STATUS.OFFERED;
      newRequestStatus = REQUEST_STATUS.ASSIGNED;
    }

    // Update ServiceRequest
    request.status = newRequestStatus;
    request.assignedVolunteer = targetVolunteerId;
    request.assignedAt = new Date();
    await request.save();

    // Create Assignment
    const assignment = await Assignment.create({
      request: request._id,
      volunteer: targetVolunteerId,
      matchScore: matchResult.matchScore,
      scoreBreakdown: matchResult.breakdown,
      status: initialAssignmentStatus,
      offeredAt: new Date(),
      respondedAt: isSelfClaim ? new Date() : null,
      notes: notes || '',
    });

    const populated = await Assignment.findById(assignment._id)
      .populate('request')
      .populate('volunteer', 'name email phone avatar');

    res.status(201).json({
      success: true,
      message: isSelfClaim
        ? 'Service request accepted and moved to in-progress.'
        : 'Assignment offered to volunteer successfully.',
      data: populated,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Respond to an offered assignment (accept or decline)
 * @route   PUT /api/assignments/:id/respond
 * @access  Private (Assigned volunteer or Admin)
 */
const respondToAssignment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { action, notes } = req.body;

    const assignment = await Assignment.findById(id);
    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Assignment not found.',
      });
    }

    const isAssignedVolunteer =
      assignment.volunteer.toString() === req.user._id.toString();
    const isAdmin = req.user.role === USER_ROLES.ADMIN;

    if (!isAssignedVolunteer && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to respond to this assignment.',
      });
    }

    if (assignment.status !== ASSIGNMENT_STATUS.OFFERED) {
      return res.status(400).json({
        success: false,
        message: `Cannot respond to an assignment with status '${assignment.status}'.`,
      });
    }

    const request = await ServiceRequest.findById(assignment.request);
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Associated service request not found.',
      });
    }

    if (notes) {
      assignment.notes = notes;
    }
    assignment.respondedAt = new Date();

    if (action === 'accept') {
      assignment.status = ASSIGNMENT_STATUS.ACCEPTED;
      request.status = REQUEST_STATUS.IN_PROGRESS;
      await Promise.all([assignment.save(), request.save()]);

      return res.status(200).json({
        success: true,
        message: 'Assignment accepted. Request is now in progress.',
        data: assignment,
      });
    }

    if (action === 'decline') {
      assignment.status = ASSIGNMENT_STATUS.DECLINED;
      // Revert request back to PENDING so other volunteers can match
      request.status = REQUEST_STATUS.PENDING;
      request.assignedVolunteer = null;
      request.assignedAt = null;
      await Promise.all([assignment.save(), request.save()]);

      return res.status(200).json({
        success: true,
        message: 'Assignment declined. Service request returned to pending pool.',
        data: assignment,
      });
    }

    return res.status(400).json({
      success: false,
      message: "Action must be either 'accept' or 'decline'.",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Mark assignment and service request as completed
 * @route   PUT /api/assignments/:id/complete
 * @access  Private (Volunteer, Requester, or Admin)
 */
const completeAssignment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    const assignment = await Assignment.findById(id);
    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Assignment not found.',
      });
    }

    const request = await ServiceRequest.findById(assignment.request);
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Associated service request not found.',
      });
    }

    const isVolunteer =
      assignment.volunteer.toString() === req.user._id.toString();
    const isRequester =
      request.requester.toString() === req.user._id.toString();
    const isAdmin = req.user.role === USER_ROLES.ADMIN;

    if (!isVolunteer && !isRequester && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to mark this task as completed.',
      });
    }

    if (
      assignment.status !== ASSIGNMENT_STATUS.ACCEPTED ||
      request.status !== REQUEST_STATUS.IN_PROGRESS
    ) {
      return res.status(400).json({
        success: false,
        message: `Task cannot be marked completed from assignment status '${assignment.status}' and request status '${request.status}'.`,
      });
    }

    const completedTime = new Date();

    assignment.status = ASSIGNMENT_STATUS.COMPLETED;
    assignment.completedAt = completedTime;
    if (notes) assignment.notes = notes;

    request.status = REQUEST_STATUS.COMPLETED;
    request.completedAt = completedTime;

    // Save and increment volunteer completed tasks count
    await Promise.all([
      assignment.save(),
      request.save(),
      VolunteerProfile.findOneAndUpdate(
        { user: assignment.volunteer },
        { $inc: { completedTasks: 1 } }
      ),
    ]);

    const updated = await Assignment.findById(assignment._id)
      .populate('request')
      .populate('volunteer', 'name email avatar');

    res.status(200).json({
      success: true,
      message: 'Service request and assignment completed successfully.',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get assignments for current user
 * @route   GET /api/assignments
 * @access  Private
 */
const getAssignments = async (req, res, next) => {
  try {
    const { status, requestId, page = 1, limit = 10 } = req.query;

    const query = {};

    if (status) {
      query.status = status;
    }

    if (requestId) {
      query.request = requestId;
    }

    if (req.user.role === USER_ROLES.VOLUNTEER) {
      query.volunteer = req.user._id;
    } else if (req.user.role === USER_ROLES.COMMUNITY_MEMBER) {
      const myRequests = await ServiceRequest.find({
        requester: req.user._id,
      }).select('_id');
      query.request = { $in: myRequests.map((r) => r._id) };
    }
    // Admins see all assignments

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(50, parseInt(limit, 10) || 10));
    const skip = (pageNum - 1) * limitNum;

    const [assignments, total] = await Promise.all([
      Assignment.find(query)
        .populate({
          path: 'request',
          populate: { path: 'requester', select: 'name email phone avatar city' },
        })
        .populate('volunteer', 'name email phone avatar')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Assignment.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      count: assignments.length,
      total,
      totalPages: Math.ceil(total / limitNum),
      currentPage: pageNum,
      data: assignments,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single assignment by ID
 * @route   GET /api/assignments/:id
 * @access  Private (Volunteer, Requester, or Admin)
 */
const getAssignmentById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const assignment = await Assignment.findById(id)
      .populate({
        path: 'request',
        populate: { path: 'requester', select: 'name email phone avatar city' },
      })
      .populate('volunteer', 'name email phone avatar');

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Assignment not found.',
      });
    }

    const isVolunteer =
      assignment.volunteer._id.toString() === req.user._id.toString();
    const isRequester =
      assignment.request?.requester?._id?.toString() === req.user._id.toString();
    const isAdmin = req.user.role === USER_ROLES.ADMIN;

    if (!isVolunteer && !isRequester && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this assignment.',
      });
    }

    res.status(200).json({
      success: true,
      data: assignment,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createAssignment,
  respondToAssignment,
  completeAssignment,
  getAssignments,
  getAssignmentById,
};
