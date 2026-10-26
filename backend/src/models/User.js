const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
        'Please provide a valid email address',
      ],
      index: true,
    },
    passwordHash: {
      type: String,
      required: [true, 'Password hash is required'],
      select: false, // Exclude by default from query results
    },
    role: {
      type: String,
      enum: {
        values: ['user', 'admin'],
        message: '{VALUE} is not a valid role',
      },
      default: 'user',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
      index: true,
    },
    emailOtpHash: {
      type: String,
      select: false,
      default: null,
    },
    emailOtpExpiresAt: {
      type: Date,
      select: false,
      default: null,
    },
    emailOtpAttempts: {
      type: Number,
      select: false,
      default: 0,
    },
    emailOtpLastSentAt: {
      type: Date,
      select: false,
      default: null,
    },
    passwordResetTokenHash: {
      type: String,
      select: false,
      default: null,
      index: true,
    },
    passwordResetExpiresAt: {
      type: Date,
      select: false,
      default: null,
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
        delete ret.passwordHash;
        delete ret.emailOtpHash;
        delete ret.emailOtpExpiresAt;
        delete ret.emailOtpAttempts;
        delete ret.emailOtpLastSentAt;
        delete ret.passwordResetTokenHash;
        delete ret.passwordResetExpiresAt;
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
      transform(doc, ret) {
        delete ret.passwordHash;
        delete ret.emailOtpHash;
        delete ret.emailOtpExpiresAt;
        delete ret.emailOtpAttempts;
        delete ret.emailOtpLastSentAt;
        delete ret.passwordResetTokenHash;
        delete ret.passwordResetExpiresAt;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Method to verify candidate password with stored hash
userSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.passwordHash) {
    throw new Error('Password hash not loaded for verification');
  }
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

// Static helper to hash password with standard work factor
userSchema.statics.hashPassword = async function (plainPassword) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(plainPassword, salt);
};

const User = mongoose.model('User', userSchema);

module.exports = User;
