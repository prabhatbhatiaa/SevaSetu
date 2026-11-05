const crypto = require('crypto');
const { User, VolunteerProfile, USER_ROLES } = require('../models');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../utils/mailer');

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

    // Reject admin role registration from public endpoint
    if (role === USER_ROLES.ADMIN || role === 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Administrator accounts cannot be created through public registration.',
      });
    }

    const assignedRole = role === USER_ROLES.VOLUNTEER ? USER_ROLES.VOLUNTEER : USER_ROLES.COMMUNITY_MEMBER;

    // Create user document
    const user = new User({
      name,
      email,
      password,
      role: assignedRole,
      phone,
      location: location || undefined,
    });

    // Generate email verification token (valid for 24h)
    const verificationToken = user.generateEmailVerificationToken();
    await user.save();

    let volunteerProfile = null;

    // If registering as volunteer, initialize linked VolunteerProfile
    if (assignedRole === USER_ROLES.VOLUNTEER) {
      volunteerProfile = await VolunteerProfile.create({
        user: user._id,
        skills: Array.isArray(skills) ? skills : [],
        categories: Array.isArray(categories) ? categories : ['Basic Community Assistance'],
        serviceRadius: 10,
        location: user.location?.coordinates ? user.location : undefined,
      });
    }

    // Dispatch verification email asynchronously
    sendVerificationEmail({
      to: user.email,
      name: user.name,
      token: verificationToken,
    }).catch((mailErr) => {
      console.error('[Auth] Verification email dispatch error:', mailErr.message);
    });

    const token = user.generateAuthToken();

    res.status(201).json({
      success: true,
      message: 'Account registered successfully. Please check your email to verify your account.',
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

/**
 * @desc    Verify user email with token
 * @route   GET /api/auth/verify-email/:token
 * @access  Public
 */
const verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.params;
    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Verification token is required.',
      });
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({
      emailVerificationToken: hashedToken,
      emailVerificationExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Email verification link is invalid or has expired.',
      });
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    const authToken = user.generateAuthToken();

    res.status(200).json({
      success: true,
      message: 'Email verified successfully!',
      token: authToken,
      user: user.toJSON(),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Resend email verification link
 * @route   POST /api/auth/resend-verification
 * @access  Private (JWT Protected)
 */
const resendVerification = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({
        success: false,
        message: 'Your email address is already verified.',
      });
    }

    const token = user.generateEmailVerificationToken();
    await user.save();

    await sendVerificationEmail({
      to: user.email,
      name: user.name,
      token,
    });

    res.status(200).json({
      success: true,
      message: 'A fresh verification email has been sent to your address.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Request password reset email
 * @route   POST /api/auth/forgot-password
 * @access  Public
 */
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an email address.',
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: cleanEmail });

    if (!user) {
      // Generic success response to prevent email enumeration
      return res.status(200).json({
        success: true,
        message: 'If an account exists with that email, password reset instructions have been sent.',
      });
    }

    const resetToken = user.generatePasswordResetToken();
    await user.save();

    await sendPasswordResetEmail({
      to: user.email,
      name: user.name,
      token: resetToken,
    });

    res.status(200).json({
      success: true,
      message: 'If an account exists with that email, password reset instructions have been sent.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Reset password using valid token
 * @route   POST /api/auth/reset-password/:token
 * @access  Public
 */
const resetPassword = async (req, res, next) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Reset token is required.',
      });
    }

    if (!password || password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long.',
      });
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Password reset link is invalid or has expired.',
      });
    }

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    // pre-save hook automatically hashes password and increments tokenVersion
    await user.save();

    const authToken = user.generateAuthToken();

    res.status(200).json({
      success: true,
      message: 'Password reset successfully. You are now logged in.',
      token: authToken,
      user: user.toJSON(),
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
  verifyEmail,
  resendVerification,
  forgotPassword,
  resetPassword,
};
