const { VolunteerProfile, User, USER_ROLES } = require('../models');

/**
 * @desc    Get currently logged in volunteer's profile
 * @route   GET /api/volunteers/me
 * @access  Private (Volunteer only)
 */
const getMyVolunteerProfile = async (req, res, next) => {
  try {
    let profile = await VolunteerProfile.findOne({ user: req.user._id }).populate('user');

    // If profile does not exist yet (e.g. upgraded role), create starter profile
    if (!profile) {
      profile = await VolunteerProfile.create({
        user: req.user._id,
        location: req.user.location,
        categories: ['Basic Community Assistance'],
      });
      profile = await profile.populate('user');
    }

    res.status(200).json({
      success: true,
      data: profile,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update current volunteer profile
 * @route   PUT /api/volunteers/profile
 * @access  Private (Volunteer only)
 */
const updateVolunteerProfile = async (req, res, next) => {
  try {
    let profile = await VolunteerProfile.findOne({ user: req.user._id });

    if (!profile) {
      profile = new VolunteerProfile({ user: req.user._id });
    }

    const {
      skills,
      categories,
      availability,
      serviceRadius,
      location,
      bio,
      isActive,
    } = req.body;

    if (skills !== undefined) profile.skills = skills;
    if (categories !== undefined) profile.categories = categories;
    if (availability !== undefined) profile.availability = availability;
    if (serviceRadius !== undefined) profile.serviceRadius = serviceRadius;
    if (bio !== undefined) profile.bio = bio;
    if (isActive !== undefined) profile.isActive = isActive;

    if (location) {
      profile.location = {
        type: 'Point',
        coordinates: location.coordinates || profile.location.coordinates,
        address: location.address !== undefined ? location.address : profile.location.address,
        city: location.city !== undefined ? location.city : profile.location.city,
        state: location.state !== undefined ? location.state : profile.location.state,
        pincode: location.pincode !== undefined ? location.pincode : profile.location.pincode,
      };

      // Synchronize with User location
      await User.findByIdAndUpdate(req.user._id, { location: profile.location });
    }

    await profile.save();
    const updatedProfile = await VolunteerProfile.findById(profile._id).populate('user');

    res.status(200).json({
      success: true,
      message: 'Volunteer profile updated successfully.',
      data: updatedProfile,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all active volunteers with search and distance filtering
 * @route   GET /api/volunteers
 * @access  Public
 */
const getVolunteers = async (req, res, next) => {
  try {
    const {
      category,
      skill,
      city,
      minRating,
      near, // format: "lng,lat"
      maxDistance = 50, // default 50km
      page = 1,
      limit = 12,
    } = req.query;

    const query = { isActive: true };

    if (category) {
      query.categories = category;
    }

    if (skill) {
      query.skills = { $regex: skill, $options: 'i' };
    }

    if (city) {
      query['location.city'] = { $regex: city, $options: 'i' };
    }

    if (minRating) {
      query.rating = { $gte: Number(minRating) };
    }

    // Geospatial proximity query
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
    const limitNum = Math.max(1, Math.min(50, parseInt(limit, 10) || 12));
    const skip = (pageNum - 1) * limitNum;

    const [volunteers, total] = await Promise.all([
      VolunteerProfile.find(query)
        .populate('user', 'name avatar city role createdAt')
        .skip(skip)
        .limit(limitNum)
        .lean(),
      VolunteerProfile.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      count: volunteers.length,
      total,
      totalPages: Math.ceil(total / limitNum),
      currentPage: pageNum,
      data: volunteers,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get specific volunteer profile by profile ID or user ID
 * @route   GET /api/volunteers/:id
 * @access  Public
 */
const getVolunteerById = async (req, res, next) => {
  try {
    const { id } = req.params;

    let profile = await VolunteerProfile.findById(id).populate(
      'user',
      'name avatar city state role createdAt'
    );

    // Fallback: search by user ID
    if (!profile) {
      profile = await VolunteerProfile.findOne({ user: id }).populate(
        'user',
        'name avatar city state role createdAt'
      );
    }

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Volunteer profile not found.',
      });
    }

    res.status(200).json({
      success: true,
      data: profile,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMyVolunteerProfile,
  updateVolunteerProfile,
  getVolunteers,
  getVolunteerById,
};
