const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    request: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ServiceRequest',
      required: [true, 'Service Request reference is required for Review'],
      unique: true, // Only one review permitted per service request
      index: true,
    },
    volunteer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Volunteer reference is required for Review'],
      index: true,
    },
    requester: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Requester reference is required for Review'],
      index: true,
    },
    rating: {
      type: Number,
      required: [true, 'Please provide a rating between 1 and 5'],
      min: [1, 'Minimum rating is 1 star'],
      max: [5, 'Maximum rating is 5 stars'],
    },
    feedback: {
      type: String,
      trim: true,
      maxlength: [1000, 'Feedback cannot exceed 1000 characters'],
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to quickly fetch reviews for a volunteer
reviewSchema.index({ volunteer: 1, createdAt: -1 });

// Static method to recalculate average rating and count on VolunteerProfile
reviewSchema.statics.recalculateVolunteerRating = async function (volunteerUserId) {
  try {
    const VolunteerProfile = mongoose.model('VolunteerProfile');
    const stats = await this.aggregate([
      {
        $match: {
          volunteer: new mongoose.Types.ObjectId(volunteerUserId),
        },
      },
      {
        $group: {
          _id: '$volunteer',
          averageRating: { $avg: '$rating' },
          ratingCount: { $sum: 1 },
        },
      },
    ]);

    if (stats.length > 0) {
      const avg = Math.round(stats[0].averageRating * 10) / 10;
      await VolunteerProfile.findOneAndUpdate(
        { user: volunteerUserId },
        {
          rating: avg,
          ratingCount: stats[0].ratingCount,
        }
      );
    } else {
      // Default baseline when no reviews exist
      await VolunteerProfile.findOneAndUpdate(
        { user: volunteerUserId },
        {
          rating: 5.0,
          ratingCount: 0,
        }
      );
    }
  } catch (error) {
    console.error(`[Review Model] Rating recalculation error for ${volunteerUserId}:`, error.message);
  }
};

// Post-save hook to trigger recalculation
reviewSchema.post('save', async function (doc) {
  await doc.constructor.recalculateVolunteerRating(doc.volunteer);
});

// Post-delete hooks to re-calculate rating if review is deleted
reviewSchema.post('findOneAndDelete', async function (doc) {
  if (doc) {
    await doc.constructor.recalculateVolunteerRating(doc.volunteer);
  }
});

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;
