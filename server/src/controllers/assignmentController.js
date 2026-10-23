const mongoose = require('mongoose');
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
  let requestLocked = false;
  let targetVolunteerId;
  let requestId;

  try {
    const { requestId: reqId, volunteerId, notes } = req.body;
    requestId = reqId;

    if (!requestId || !mongoose.Types.ObjectId.isValid(requestId)) {
      return res.status(400).json({
        success: false,
        message: 'A valid service request ID is required.',
      });
    }

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

      if (!volunteerId || !mongoose.Types.ObjectId.isValid(volunteerId)) {
        return res.status(400).json({
          success: false,
          message: 'A valid Volunteer ID is required to create an assignment.',
        });
      }
      targetVolunteerId = volunteerId;
    } else if (req.user.role === USER_ROLES.ADMIN) {
      if (!volunteerId || !mongoose.Types.ObjectId.isValid(volunteerId)) {
        return res.status(400).json({
          success: false,
          message: 'A valid Volunteer ID is required to create an assignment.',
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
      return res.status(409).json({
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

    // Atomically lock and transition the ServiceRequest from PENDING to prevent race conditions
    const assignedTime = new Date();
    const updatedRequest = await ServiceRequest.findOneAndUpdate(
      { _id: requestId, status: REQUEST_STATUS.PENDING },
      {
        $set: {
          status: newRequestStatus,
          assignedVolunteer: targetVolunteerId,
          assignedAt: assignedTime,
        },
      },
      { new: true }
    );

    if (!updatedRequest) {
      return res.status(409).json({
        success: false,
        message: 'Service request is no longer available or was concurrently assigned.',
      });
    }

    requestLocked = true;

    // Create Assignment
    let assignment;
    try {
      assignment = await Assignment.create({
        request: request._id,
        volunteer: targetVolunteerId,
        matchScore: matchResult.matchScore,
        scoreBreakdown: matchResult.breakdown,
        status: initialAssignmentStatus,
        offeredAt: assignedTime,
        respondedAt: isSelfClaim ? assignedTime : null,
        notes: notes || '',
      });
    } catch (createError) {
      // Revert the ServiceRequest status if assignment creation fails (e.g., unique index violation)
      await ServiceRequest.findOneAndUpdate(
        { _id: requestId, assignedVolunteer: targetVolunteerId },
        {
          $set: {
            status: REQUEST_STATUS.PENDING,
            assignedVolunteer: null,
            assignedAt: null,
          },
        }
      );
      requestLocked = false;

      if (createError.code === 11000) {
        return res.status(409).json({
          success: false,
          message: 'An active assignment already exists for this request.',
        });
      }
      throw createError;
    }

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
    if (requestLocked && targetVolunteerId && requestId) {
      await ServiceRequest.findOneAndUpdate(
        { _id: requestId, assignedVolunteer: targetVolunteerId },
        {
          $set: {
            status: REQUEST_STATUS.PENDING,
            assignedVolunteer: null,
            assignedAt: null,
          },
        }
      ).catch(() => {});
    }
    next(error);
  }
};

/**
 * Helper to redact contact information from assignments before acceptance
 */
const redactAssignmentContacts = (assignmentDoc, callerId, callerRole) => {
  const doc = assignmentDoc.toObject ? assignmentDoc.toObject() : { ...assignmentDoc };
  const isAdmin = callerRole === USER_ROLES.ADMIN;
  const isAcceptedOrDone = [
    ASSIGNMENT_STATUS.ACCEPTED,
    ASSIGNMENT_STATUS.COMPLETED,
  ].includes(doc.status);

  if (!isAdmin && !isAcceptedOrDone) {
    if (doc.request?.requester && typeof doc.request.requester === 'object') {
      const isSelfRequester = doc.request.requester._id?.toString() === callerId?.toString();
      if (!isSelfRequester) {
        delete doc.request.requester.email;
        delete doc.request.requester.phone;
      }
    }
    if (doc.volunteer && typeof doc.volunteer === 'object') {
      const isSelfVolunteer = doc.volunteer._id?.toString() === callerId?.toString();
      if (!isSelfVolunteer) {
        delete doc.volunteer.email;
        delete doc.volunteer.phone;
      }
    }
  }
  return doc;
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

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'A valid assignment ID is required.',
      });
    }

    if (!['accept', 'decline'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: "Action must be either 'accept' or 'decline'.",
      });
    }

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

    const respondedTime = new Date();

    if (action === 'accept') {
      // Atomically update assignment status from OFFERED to ACCEPTED
      const updatedAssignment = await Assignment.findOneAndUpdate(
        { _id: id, status: ASSIGNMENT_STATUS.OFFERED },
        {
          $set: {
            status: ASSIGNMENT_STATUS.ACCEPTED,
            respondedAt: respondedTime,
            ...(notes ? { notes } : {}),
          },
        },
        { new: true }
      );

      if (!updatedAssignment) {
        return res.status(409).json({
          success: false,
          message: 'Assignment has already been responded to or is no longer offered.',
        });
      }

      // Update associated service request to IN_PROGRESS
      await ServiceRequest.findOneAndUpdate(
        { _id: updatedAssignment.request },
        { $set: { status: REQUEST_STATUS.IN_PROGRESS } }
      );

      return res.status(200).json({
        success: true,
        message: 'Assignment accepted. Request is now in progress.',
        data: updatedAssignment,
      });
    }

    if (action === 'decline') {
      // Atomically update assignment status from OFFERED to DECLINED
      const updatedAssignment = await Assignment.findOneAndUpdate(
        { _id: id, status: ASSIGNMENT_STATUS.OFFERED },
        {
          $set: {
            status: ASSIGNMENT_STATUS.DECLINED,
            respondedAt: respondedTime,
            ...(notes ? { notes } : {}),
          },
        },
        { new: true }
      );

      if (!updatedAssignment) {
        return res.status(409).json({
          success: false,
          message: 'Assignment has already been responded to or is no longer offered.',
        });
      }

      // Revert request back to PENDING so other volunteers can match
      await ServiceRequest.findOneAndUpdate(
        { _id: updatedAssignment.request, assignedVolunteer: updatedAssignment.volunteer },
        {
          $set: {
            status: REQUEST_STATUS.PENDING,
            assignedVolunteer: null,
            assignedAt: null,
          },
        }
      );

      return res.status(200).json({
        success: true,
        message: 'Assignment declined. Service request returned to pending pool.',
        data: updatedAssignment,
      });
    }
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

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'A valid assignment ID is required.',
      });
    }

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

    // Idempotency: if already completed, return clean success without double-incrementing counters
    if (assignment.status === ASSIGNMENT_STATUS.COMPLETED) {
      const populated = await Assignment.findById(assignment._id)
        .populate('request')
        .populate('volunteer', 'name email avatar');

      return res.status(200).json({
        success: true,
        message: 'Assignment is already marked as completed.',
        data: populated,
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

    // Atomically transition assignment status from ACCEPTED to COMPLETED
    const updatedAssignment = await Assignment.findOneAndUpdate(
      { _id: id, status: ASSIGNMENT_STATUS.ACCEPTED },
      {
        $set: {
          status: ASSIGNMENT_STATUS.COMPLETED,
          completedAt: completedTime,
          ...(notes ? { notes } : {}),
        },
      },
      { new: true }
    );

    if (!updatedAssignment) {
      // Race condition handled: assignment was transitioned concurrently
      const fresh = await Assignment.findById(id)
        .populate('request')
        .populate('volunteer', 'name email avatar');

      if (fresh && fresh.status === ASSIGNMENT_STATUS.COMPLETED) {
        return res.status(200).json({
          success: true,
          message: 'Service request and assignment completed successfully.',
          data: fresh,
        });
      }

      return res.status(409).json({
        success: false,
        message: 'Could not complete task: assignment status has changed.',
      });
    }

    // Exactly-once execution for request and volunteer counter
    await Promise.all([
      ServiceRequest.findByIdAndUpdate(updatedAssignment.request, {
        $set: {
          status: REQUEST_STATUS.COMPLETED,
          completedAt: completedTime,
        },
      }),
      VolunteerProfile.findOneAndUpdate(
        { user: updatedAssignment.volunteer },
        { $inc: { completedTasks: 1 } }
      ),
    ]);

    const updated = await Assignment.findById(updatedAssignment._id)
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
      if (!mongoose.Types.ObjectId.isValid(requestId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid request ID parameter.',
        });
      }
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

    const sanitizedAssignments = assignments.map((a) =>
      redactAssignmentContacts(a, req.user._id, req.user.role)
    );

    res.status(200).json({
      success: true,
      count: sanitizedAssignments.length,
      total,
      totalPages: Math.ceil(total / limitNum),
      currentPage: pageNum,
      data: sanitizedAssignments,
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

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid assignment ID parameter.',
      });
    }

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

    const sanitized = redactAssignmentContacts(
      assignment,
      req.user._id,
      req.user.role
    );

    res.status(200).json({
      success: true,
      data: sanitized,
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
