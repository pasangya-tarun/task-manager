const User = require('../models/User');
const { generateToken } = require('../utils/token');

class AuthService {
  /**
   * Register a new regular user account
   * @param {Object} param0 
   * @returns {Promise<{ user: Object, token: string }>}
   */
  async register({ name, email, password }) {
    const normalizedEmail = email.toLowerCase().trim();

    // Check for existing user
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      const error = new Error('An account with this email already exists');
      error.statusCode = 409;
      throw error;
    }

    // Hash password with bcrypt
    const passwordHash = await User.hashPassword(password);

    // Always enforce 'user' role on public registration
    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      role: 'user',
      isActive: true,
    });

    const token = generateToken(user);

    return {
      user: user.toJSON(),
      token,
    };
  }

  /**
   * Authenticate user credentials and return session token
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

    const token = generateToken(user);

    return {
      user: user.toJSON(),
      token,
    };
  }
}

module.exports = new AuthService();
