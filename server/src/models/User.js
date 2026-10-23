const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { USER_ROLES } = require('./constants');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide your full name'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters long'],
      maxlength: [60, 'Name cannot exceed 60 characters'],
    },
    email: {
      type: String,
      required: [true, 'Please provide an email address'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        'Please provide a valid email address',
      ],
      index: true,
    },
    password: {
      type: String,
      required: [true, 'Please provide a password'],
      minlength: [6, 'Password must be at least 6 characters long'],
      select: false, // Do not return password by default in queries
    },
    phone: {
      type: String,
      trim: true,
      maxlength: [20, 'Phone number cannot exceed 20 characters'],
    },
    role: {
      type: String,
      enum: Object.values(USER_ROLES),
      default: USER_ROLES.COMMUNITY_MEMBER,
      index: true,
    },
    avatar: {
      type: String,
      default: '',
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
      },
      // Note: GeoJSON coordinates are in [longitude, latitude] format
      coordinates: {
        type: [Number],
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
    isActive: {
      type: Boolean,
      default: true,
    },
    tokenVersion: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        delete ret.password;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// 2dsphere index for user location queries (sparse for users without coordinates)
userSchema.index({ location: '2dsphere' }, { sparse: true });

// Ensure location is valid GeoJSON Point or omitted
userSchema.pre('validate', function (next) {
  if (this.location) {
    if (
      !this.location.coordinates ||
      !Array.isArray(this.location.coordinates) ||
      this.location.coordinates.length < 2
    ) {
      this.location = undefined;
    } else {
      this.location.type = 'Point';
    }
  }
  next();
});

// Pre-save hook to hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }
  // Automatically bump tokenVersion when password changes to revoke all existing sessions
  if (!this.isNew) {
    this.tokenVersion = (this.tokenVersion || 0) + 1;
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Instance method to check password validity
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Instance method to generate signed JWT token
userSchema.methods.generateAuthToken = function () {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not configured on this server.');
  }

  return jwt.sign(
    {
      id: this._id,
      role: this.role,
      email: this.email,
      name: this.name,
      tokenVersion: this.tokenVersion || 0,
    },
    secret,
    {
      algorithm: 'HS256',
      issuer: 'sevasetu-platform',
      audience: 'sevasetu-client',
      expiresIn: process.env.JWT_EXPIRE || '30d',
    }
  );
};

const User = mongoose.model('User', userSchema);

module.exports = User;
