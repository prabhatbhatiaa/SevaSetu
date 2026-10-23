const mongoose = require('mongoose');
const { ASSIGNMENT_STATUS } = require('./constants');

const scoreBreakdownSchema = new mongoose.Schema(
  {
    skillScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    distanceScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    availabilityScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    categoryScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    ratingScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    calculatedDistanceKm: {
      type: Number,
      min: 0,
      default: 0,
    },
  },
  { _id: false }
);

const assignmentSchema = new mongoose.Schema(
  {
    request: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ServiceRequest',
      required: [true, 'Service Request reference is required for Assignment'],
    },
    volunteer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Volunteer reference is required for Assignment'],
    },
    matchScore: {
      type: Number,
      required: [true, 'Match score is required for Assignment'],
      min: 0,
      max: 100,
    },
    scoreBreakdown: {
      type: scoreBreakdownSchema,
      default: () => ({}),
    },
    status: {
      type: String,
      enum: Object.values(ASSIGNMENT_STATUS),
      default: ASSIGNMENT_STATUS.OFFERED,
      index: true,
    },
    offeredAt: {
      type: Date,
      default: Date.now,
    },
    respondedAt: {
      type: Date,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 500,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for uniqueness and high-volume matching lookup
// Partial unique index: only ONE accepted assignment per request
assignmentSchema.index(
  { request: 1 },
  {
    unique: true,
    partialFilterExpression: { status: ASSIGNMENT_STATUS.ACCEPTED },
  }
);

// Partial unique index: prevent duplicate active offers or acceptances for the same volunteer on a request
assignmentSchema.index(
  { request: 1, volunteer: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: { $in: [ASSIGNMENT_STATUS.OFFERED, ASSIGNMENT_STATUS.ACCEPTED] },
    },
  }
);

assignmentSchema.index({ volunteer: 1, status: 1 });
assignmentSchema.index({ request: 1, status: 1 });

const Assignment = mongoose.model('Assignment', assignmentSchema);

module.exports = Assignment;
