const { User, VolunteerProfile, USER_ROLES } = require('../models');

/**
 * @desc    Register a new user
 * @route   POST /api/auth/register
 * @access  Public
 */
const register = async (req, res, next) => {
  try {
    const { name, email, password, role, phone, location, skills, categories } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email address already exists.',
      });
    }

    const assignedRole = role || USER_ROLES.COMMUNITY_MEMBER;

    // Create user document
    const user = await User.create({
      name,
      email,
      password,
      role: assignedRole,
      phone,
      location: location || {
        type: 'Point',
        coordinates: [77.0266, 28.4595], // Default Gurugram
      },
    });

    let volunteerProfile = null;

    // If registering as volunteer, initialize linked VolunteerProfile
    if (assignedRole === USER_ROLES.VOLUNTEER) {
      volunteerProfile = await VolunteerProfile.create({
        user: user._id,
        skills: Array.isArray(skills) ? skills : [],
        categories: Array.isArray(categories) ? categories : ['Basic Community Assistance'],
        serviceRadius: 10,
        location: user.location,
      });
    }

    const token = user.generateAuthToken();

    res.status(201).json({
      success: true,
      message: 'Account registered successfully.',
      token,
      user: user.toJSON(),
      volunteerProfile: volunteerProfile ? volunteerProfile._id : undefined,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Authenticate user & get token
 * @route   POST /api/auth/login
 * @access  Public
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Find user with password included for comparison
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated. Please contact support.',
      });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    let volunteerProfile = null;
    if (user.role === USER_ROLES.VOLUNTEER) {
      volunteerProfile = await VolunteerProfile.findOne({ user: user._id });
    }

    const token = user.generateAuthToken();

    res.status(200).json({
      success: true,
      message: 'Logged in successfully.',
      token,
      user: user.toJSON(),
      volunteerProfile: volunteerProfile ? volunteerProfile._id : undefined,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get currently authenticated user session
 * @route   GET /api/auth/me
 * @access  Private (JWT Protected)
 */
const getMe = async (req, res, next) => {
  try {
    let volunteerProfile = null;

    if (req.user.role === USER_ROLES.VOLUNTEER) {
      volunteerProfile = await VolunteerProfile.findOne({ user: req.user._id });
    }

    res.status(200).json({
      success: true,
      data: req.user.toJSON(),
      volunteerProfile,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update current user profile
 * @route   PUT /api/auth/profile
 * @access  Private (JWT Protected)
 */
const updateProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    const { name, phone, location, avatar } = req.body;

    if (name) user.name = name;
    if (phone !== undefined) user.phone = phone;
    if (avatar !== undefined) user.avatar = avatar;

    if (location) {
      user.location = {
        type: 'Point',
        coordinates: location.coordinates || user.location.coordinates,
        address: location.address !== undefined ? location.address : user.location.address,
        city: location.city !== undefined ? location.city : user.location.city,
        state: location.state !== undefined ? location.state : user.location.state,
        pincode: location.pincode !== undefined ? location.pincode : user.location.pincode,
      };

      // Keep VolunteerProfile location in sync if user is volunteer
      if (user.role === USER_ROLES.VOLUNTEER) {
        await VolunteerProfile.findOneAndUpdate(
          { user: user._id },
          { location: user.location }
        );
      }
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      data: user.toJSON(),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Change current user password
 * @route   PUT /api/auth/change-password
 * @access  Private (JWT Protected)
 */
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user._id).select('+password');

    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Current password provided is incorrect.',
      });
    }

    user.password = newPassword;
    await user.save();

    const token = user.generateAuthToken();

    res.status(200).json({
      success: true,
      message: 'Password changed successfully.',
      token,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  getMe,
  updateProfile,
  changePassword,
};
