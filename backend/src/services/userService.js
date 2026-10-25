const User = require('../models/User');

class UserService {
  async getProfile(userId) {
    const user = await User.findById(userId);
    if (!user) {
      const error = new Error('User not found');
      error.statusCode = 404;
      throw error;
    }
    return user.toJSON();
  }

  async updateProfile(userId, updateData) {
    // Whitelist permitted fields strictly
    const allowedUpdates = {};
    if (updateData.name !== undefined) {
      allowedUpdates.name = updateData.name.trim();
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: allowedUpdates },
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      const error = new Error('User not found');
      error.statusCode = 404;
      throw error;
    }

    return updatedUser.toJSON();
  }
}

module.exports = new UserService();
