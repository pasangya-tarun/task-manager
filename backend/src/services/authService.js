const User = require('../models/User');
const env = require('../config/env');
const { generateToken } = require('../utils/token');
const { generateNumericOtp, hashOtp, verifyOtpHash } = require('../utils/otp');
const { generateResetToken, hashResetToken } = require('../utils/resetToken');
const emailService = require('./emailService');

class AuthService {
  /**
   * Register a new user account with unverified status and generate 6-digit OTP
   * @param {Object} param0 
   * @returns {Promise<{ user: Object, message: string }>}
   */
  async register({ name, email, password }) {
    const normalizedEmail = email.toLowerCase().trim();

    // Check for existing user
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      if (existingUser.isEmailVerified) {
        const error = new Error('An account with this email already exists');
        error.statusCode = 409;
        throw error;
      }

      // If user registered earlier but never completed email verification,
      // allow updating credentials and reissue a fresh OTP
      const otp = generateNumericOtp();
      const passwordHash = await User.hashPassword(password);

      existingUser.name = name.trim();
      existingUser.passwordHash = passwordHash;
      existingUser.emailOtpHash = hashOtp(otp);
      existingUser.emailOtpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
      existingUser.emailOtpAttempts = 0;
      existingUser.emailOtpLastSentAt = new Date();
      await existingUser.save();

      // Dispatch OTP email
      await emailService.sendOtpEmail({
        to: normalizedEmail,
        name: existingUser.name,
        otp,
        expiresInMinutes: 10,
      });

      return {
        user: existingUser.toJSON(),
        message: 'Registration recorded. A 6-digit verification code has been sent to your email.',
      };
    }

    // Generate new secure 6-digit numeric OTP
    const otp = generateNumericOtp();
    const passwordHash = await User.hashPassword(password);

    // Create user with isEmailVerified: false
    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      role: 'user',
      isActive: true,
      isEmailVerified: false,
      emailOtpHash: hashOtp(otp),
      emailOtpExpiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes expiry
      emailOtpAttempts: 0,
      emailOtpLastSentAt: new Date(),
    });

    // Send verification email
    await emailService.sendOtpEmail({
      to: normalizedEmail,
      name: user.name,
      otp,
      expiresInMinutes: 10,
    });

    // Do NOT issue an authenticated session or JWT before email verification
    return {
      user: user.toJSON(),
      message: 'Registration successful. A 6-digit verification code has been sent to your email.',
    };
  }

  /**
   * Verify email using 6-digit OTP with rate limiting and atomic updates
   * @param {Object} param0 
   * @returns {Promise<{ message: string, user?: Object, alreadyVerified?: boolean }>}
   */
  async verifyEmail({ email, otp }) {
    const normalizedEmail = email.toLowerCase().trim();

    const user = await User.findOne({ email: normalizedEmail }).select(
      '+emailOtpHash +emailOtpExpiresAt +emailOtpAttempts'
    );

    if (!user) {
      const error = new Error('Invalid email or verification code');
      error.statusCode = 400;
      throw error;
    }

    if (user.isEmailVerified) {
      return {
        message: 'Email is already verified. You can now log in.',
        alreadyVerified: true,
      };
    }

    // Maximum attempts check (e.g. 5 attempts)
    if (user.emailOtpAttempts >= 5) {
      const error = new Error('Maximum verification attempts exceeded. Please request a new verification code.');
      error.statusCode = 400;
      throw error;
    }

    // Expiration check (10 minutes)
    if (!user.emailOtpExpiresAt || new Date() > user.emailOtpExpiresAt) {
      const error = new Error('Verification code has expired. Please request a new code.');
      error.statusCode = 400;
      throw error;
    }

    // Secure constant-time hash verification
    const isValid = verifyOtpHash(otp, user.emailOtpHash);
    if (!isValid) {
      await User.updateOne({ _id: user._id }, { $inc: { emailOtpAttempts: 1 } });
      const remainingAttempts = Math.max(0, 5 - (user.emailOtpAttempts + 1));
      const message = remainingAttempts > 0
        ? `Invalid verification code. ${remainingAttempts} attempt(s) remaining.`
        : 'Maximum verification attempts exceeded. Please request a new verification code.';
      const error = new Error(message);
      error.statusCode = 400;
      throw error;
    }

    // Atomic update to mark verified and clear OTP metadata protecting against concurrent reuse
    const updatedUser = await User.findOneAndUpdate(
      { _id: user._id, isEmailVerified: false, emailOtpHash: user.emailOtpHash },
      {
        $set: {
          isEmailVerified: true,
          emailOtpHash: null,
          emailOtpExpiresAt: null,
          emailOtpAttempts: 0,
          emailOtpLastSentAt: null,
        },
      },
      { new: true }
    );

    if (!updatedUser) {
      const checkUser = await User.findById(user._id);
      if (checkUser && checkUser.isEmailVerified) {
        return {
          message: 'Email verified successfully. You can now log in.',
          user: checkUser.toJSON(),
        };
      }
      const error = new Error('Verification code was already used or invalidated.');
      error.statusCode = 400;
      throw error;
    }

    return {
      message: 'Email verified successfully! You can now log in.',
      user: updatedUser.toJSON(),
    };
  }

  /**
   * Resend verification OTP enforcing 60-second cooldown
   * @param {Object} param0 
   * @returns {Promise<{ message: string, alreadyVerified?: boolean }>}
   */
  async resendOtp({ email }) {
    const normalizedEmail = email.toLowerCase().trim();

    const user = await User.findOne({ email: normalizedEmail }).select(
      '+emailOtpLastSentAt +emailOtpHash'
    );

    // Mitigate account enumeration: respond generically if user not found
    if (!user) {
      return {
        message: 'If an unverified account exists with this email, a new verification code has been sent.',
      };
    }

    if (user.isEmailVerified) {
      return {
        message: 'This email is already verified. You can log in directly.',
        alreadyVerified: true,
      };
    }

    // Enforce 60-second cooldown
    const COOLDOWN_SECONDS = 60;
    if (user.emailOtpLastSentAt) {
      const elapsedMs = Date.now() - new Date(user.emailOtpLastSentAt).getTime();
      if (elapsedMs < COOLDOWN_SECONDS * 1000) {
        const remaining = Math.ceil((COOLDOWN_SECONDS * 1000 - elapsedMs) / 1000);
        const error = new Error(`Please wait ${remaining} seconds before requesting a new code.`);
        error.statusCode = 429;
        error.remainingSeconds = remaining;
        throw error;
      }
    }

    // Generate new OTP and reset attempts
    const otp = generateNumericOtp();
    user.emailOtpHash = hashOtp(otp);
    user.emailOtpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
    user.emailOtpAttempts = 0;
    user.emailOtpLastSentAt = new Date();
    await user.save();

    // Dispatch email
    await emailService.sendOtpEmail({
      to: normalizedEmail,
      name: user.name,
      otp,
      expiresInMinutes: 10,
    });

    return {
      message: 'A new verification code has been sent to your email.',
    };
  }

  /**
   * Authenticate user credentials and return session token (rejects unverified accounts)
   * @param {Object} param0 
   * @returns {Promise<{ user: Object, token: string }>}
   */
  async login({ email, password }) {
    const normalizedEmail = email.toLowerCase().trim();

    // Query user including passwordHash for comparison
    const user = await User.findOne({ email: normalizedEmail }).select('+passwordHash');
    if (!user) {
      // Use generic error message to prevent email enumeration
      const error = new Error('Invalid email or password');
      error.statusCode = 401;
      throw error;
    }

    // Verify account active status
    if (!user.isActive) {
      const error = new Error('Your account has been deactivated. Please contact an administrator.');
      error.statusCode = 403;
      throw error;
    }

    // Verify password hash
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      const error = new Error('Invalid email or password');
      error.statusCode = 401;
      throw error;
    }

    // Check email verification status
    if (!user.isEmailVerified) {
      const error = new Error('Please verify your email address before logging in.');
      error.statusCode = 403;
      error.code = 'EMAIL_NOT_VERIFIED';
      error.email = user.email;
      throw error;
    }

    const token = generateToken(user);

    return {
      user: user.toJSON(),
      token,
    };
  }

  /**
   * Request password reset token and dispatch email
   * Returns generic response to prevent account enumeration
   * @param {Object} param0 
   * @returns {Promise<{ message: string }>}
   */
  async forgotPassword({ email }) {
    const normalizedEmail = email.toLowerCase().trim();
    const genericMessage = 'If an account exists for this email address, you will receive instructions to reset your password.';

    const user = await User.findOne({ email: normalizedEmail }).select('+passwordResetTokenHash +passwordResetExpiresAt');

    // Only process eligible accounts: exists, active, and verified
    if (!user || !user.isActive || !user.isEmailVerified) {
      return { message: genericMessage };
    }

    // Generate cryptographically secure random token (64 hex characters)
    const rawToken = generateResetToken();
    const hashedToken = hashResetToken(rawToken);

    user.passwordResetTokenHash = hashedToken;
    user.passwordResetExpiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes expiry
    await user.save();

    // Construct secure reset link using trusted FRONTEND_URL
    const frontendBase = env.FRONTEND_URL || env.CLIENT_URL || 'http://localhost:5173';
    const resetUrl = `${frontendBase.replace(/\/+$/, '')}/reset-password?token=${rawToken}`;

    try {
      await emailService.sendPasswordResetEmail({
        to: user.email,
        name: user.name,
        resetUrl,
        expiresInMinutes: 15,
      });
    } catch (error) {
      // Clean up token on operational failure so invalid state is not left behind
      await User.updateOne(
        { _id: user._id },
        { $set: { passwordResetTokenHash: null, passwordResetExpiresAt: null } }
      );
      console.error(`Failed to send password reset email to ${normalizedEmail}:`, error.message);
      const deliveryError = new Error('Failed to send password reset email. Please try again later.');
      deliveryError.statusCode = 502;
      throw deliveryError;
    }

    return { message: genericMessage };
  }

  /**
   * Reset user password using token
   * Validates token, hashes new password, invalidates token and existing sessions atomically
   * @param {Object} param0 
   * @returns {Promise<{ message: string }>}
   */
  async resetPassword({ token, password }) {
    if (!token || typeof token !== 'string') {
      const error = new Error('Password reset link is invalid or has expired.');
      error.statusCode = 400;
      throw error;
    }

    const hashedToken = hashResetToken(token);
    const newPasswordHash = await User.hashPassword(password);

    // Atomic update: finds user with exact token hash and valid expiry,
    // updates password, increments tokenVersion to revoke active JWTs,
    // and clears the token in one atomic operation (preventing concurrent reuse)
    const updatedUser = await User.findOneAndUpdate(
      {
        passwordResetTokenHash: hashedToken,
        passwordResetExpiresAt: { $gt: new Date() },
      },
      {
        $set: {
          passwordHash: newPasswordHash,
          passwordResetTokenHash: null,
          passwordResetExpiresAt: null,
        },
        $inc: { tokenVersion: 1 },
      },
      { new: true }
    );

    if (!updatedUser) {
      const error = new Error('Password reset link is invalid or has expired.');
      error.statusCode = 400;
      throw error;
    }

    return {
      message: 'Password has been reset successfully. You can now log in with your new password.',
    };
  }
}

module.exports = new AuthService();
