const User = require('../models/User');

const escapeRegex = (string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

class AdminService {
  /**
   * Get paginated user list with optional search and filters
   */
  async getUsers({ page = 1, limit = 10, search, role, isActive }) {
    const filter = {};

    if (search && search.trim() !== '') {
      const escaped = escapeRegex(search.trim());
      filter.$or = [
        { name: { $regex: escaped, $options: 'i' } },
        { email: { $regex: escaped, $options: 'i' } },
      ];
    }

    if (role) {
      filter.role = role;
    }

    if (isActive !== undefined) {
      filter.isActive = isActive;
    }

    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      User.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('-passwordHash'),
      User.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      users,
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  /**
   * Get basic details of a single user
   */
  async getUserById(id) {
    const user = await User.findById(id).select('-passwordHash');
    if (!user) {
      const error = new Error('User not found');
      error.statusCode = 404;
      throw error;
    }
    return user;
  }

  /**
   * Activate or deactivate a user account with last-active-admin protection
   */
  async updateUserStatus(targetUserId, isActive) {
    const user = await User.findById(targetUserId);
    if (!user) {
      const error = new Error('User not found');
      error.statusCode = 404;
      throw error;
    }

    // Protection: Prevent deactivating the last active administrator
    if (user.role === 'admin' && user.isActive && isActive === false) {
      const activeAdminCount = await User.countDocuments({
        role: 'admin',
        isActive: true,
      });

      if (activeAdminCount <= 1) {
        const error = new Error('Cannot deactivate the last active administrator account');
        error.statusCode = 400;
        throw error;
      }
    }

    user.isActive = isActive;
    await user.save();

    return user.toJSON();
  }

  /**
   * Change user role with last-active-admin demotion protection
   */
  async updateUserRole(targetUserId, newRole) {
    const user = await User.findById(targetUserId);
    if (!user) {
      const error = new Error('User not found');
      error.statusCode = 404;
      throw error;
    }

    // Protection: Prevent demoting the last active administrator
    if (user.role === 'admin' && newRole === 'user' && user.isActive) {
      const activeAdminCount = await User.countDocuments({
        role: 'admin',
        isActive: true,
      });

      if (activeAdminCount <= 1) {
        const error = new Error('Cannot demote the last active administrator account');
        error.statusCode = 400;
        throw error;
      }
    }

    user.role = newRole;
    await user.save();

    return user.toJSON();
  }
}

module.exports = new AdminService();
