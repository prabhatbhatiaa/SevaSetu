const mongoose = require('mongoose');
const { SERVICE_CATEGORIES, DAYS_OF_WEEK, TIME_SLOTS } = require('./constants');

const availabilitySlotSchema = new mongoose.Schema(
  {
    day: {
      type: String,
      enum: DAYS_OF_WEEK,
      required: true,
    },
    slots: {
      type: [String],
      enum: TIME_SLOTS,
      default: ['flexible'],
    },
  },
  { _id: false }
);

const volunteerProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required for VolunteerProfile'],
      unique: true,
      index: true,
    },
    skills: {
      type: [String],
      default: [],
      index: true,
    },
    categories: {
      type: [String],
      enum: SERVICE_CATEGORIES,
      default: [],
      index: true,
    },
    availability: {
      type: [availabilitySlotSchema],
      default: [
        { day: 'Saturday', slots: ['morning', 'afternoon'] },
        { day: 'Sunday', slots: ['morning', 'afternoon'] },
      ],
    },
    serviceRadius: {
      type: Number,
      default: 10, // Default 10 kilometers
      min: [1, 'Service radius must be at least 1 km'],
      max: [100, 'Service radius cannot exceed 100 km'],
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      // GeoJSON: [longitude, latitude]
      coordinates: {
        type: [Number],
        required: [true, 'Volunteer location coordinates are required'],
        validate: {
          validator: function (v) {
            return (
              Array.isArray(v) &&
              v.length === 2 &&
              v[0] >= -180 &&
              v[0] <= 180 && // longitude
              v[1] >= -90 &&
              v[1] <= 90 // latitude
            );
          },
          message: 'Coordinates must be valid [longitude, latitude] numbers',
        },
      },
      address: {
        type: String,
        trim: true,
      },
      city: {
        type: String,
        trim: true,
      },
      state: {
        type: String,
        trim: true,
      },
      pincode: {
        type: String,
        trim: true,
      },
    },
    rating: {
      type: Number,
      default: 5.0,
      min: 0,
      max: 5,
    },
    ratingCount: {
      type: Number,
      default: 0,
    },
    completedTasks: {
      type: Number,
      default: 0,
    },
    bio: {
      type: String,
      trim: true,
      maxlength: [500, 'Bio cannot exceed 500 characters'],
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Geospatial 2dsphere index on location for distance queries ($nearSphere / $geoWithin)
volunteerProfileSchema.index({ location: '2dsphere' });

// Compound indexes for high-speed multi-criteria matching
volunteerProfileSchema.index({ isActive: 1, categories: 1 });
volunteerProfileSchema.index({ isActive: 1, skills: 1 });

const VolunteerProfile = mongoose.model('VolunteerProfile', volunteerProfileSchema);

module.exports = VolunteerProfile;
