const Task = require('../models/Task');
const Notification = require('../models/Notification');

/**
 * Escapes regex special characters to prevent ReDoS attacks in search queries
 */
const escapeRegex = (string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

class TaskService {
  /**
   * Create a new task strictly attached to the authenticated user
   */
  async createTask(ownerId, data) {
    const task = await Task.create({
      title: data.title.trim(),
      description: data.description ? data.description.trim() : '',
      status: data.status || 'pending',
      priority: data.priority || 'medium',
      dueDate: data.dueDate || null,
      owner: ownerId,
    });

    return task;
  }

  /**
   * Get paginated, searched, filtered, and sorted tasks owned by the authenticated user
   */
  async getTasks(ownerId, { page = 1, limit = 10, search, status, priority, sortBy = 'createdAt', sortOrder = 'desc' }) {
    const filter = { owner: ownerId };

    if (search && search.trim() !== '') {
      filter.title = { $regex: escapeRegex(search.trim()), $options: 'i' };
    }

    if (status) {
      filter.status = status;
    }

    if (priority) {
      filter.priority = priority;
    }

    // Allowlisted sort fields
    const allowedSortFields = ['createdAt', 'dueDate', 'priority', 'title'];
    const sanitizedSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const sanitizedSortOrder = sortOrder === 'asc' ? 1 : -1;

    const skip = (page - 1) * limit;

    const [tasks, total] = await Promise.all([
      Task.find(filter)
        .sort({ [sanitizedSortBy]: sanitizedSortOrder })
        .skip(skip)
        .limit(limit),
      Task.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      tasks,
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
   * Get a single task verifying ownership
   */
  async getTaskById(ownerId, taskId) {
    const task = await Task.findOne({ _id: taskId, owner: ownerId });
    if (!task) {
      const error = new Error('Task not found');
      error.statusCode = 404;
      throw error;
    }
    return task;
  }

  /**
   * Update task fields ensuring ownership
   */
  async updateTask(ownerId, taskId, updateData) {
    // Whitelist updatable fields strictly
    const allowedUpdates = {};
    if (updateData.title !== undefined) allowedUpdates.title = updateData.title.trim();
    if (updateData.description !== undefined) allowedUpdates.description = updateData.description.trim();
    if (updateData.status !== undefined) allowedUpdates.status = updateData.status;
    if (updateData.priority !== undefined) allowedUpdates.priority = updateData.priority;
    if (updateData.dueDate !== undefined) allowedUpdates.dueDate = updateData.dueDate;

    const task = await Task.findOneAndUpdate(
      { _id: taskId, owner: ownerId },
      { $set: allowedUpdates },
      { new: true, runValidators: true }
    );

    if (!task) {
      const error = new Error('Task not found');
      error.statusCode = 404;
      throw error;
    }

    return task;
  }

  /**
   * Dedicated status update endpoint ensuring ownership
   */
  async updateTaskStatus(ownerId, taskId, status) {
    const task = await Task.findOneAndUpdate(
      { _id: taskId, owner: ownerId },
      { $set: { status } },
      { new: true, runValidators: true }
    );

    if (!task) {
      const error = new Error('Task not found');
      error.statusCode = 404;
      throw error;
    }

    return task;
  }

  /**
   * Delete task ensuring ownership
   */
  async deleteTask(ownerId, taskId) {
    const task = await Task.findOneAndDelete({ _id: taskId, owner: ownerId });
    if (!task) {
      const error = new Error('Task not found');
      error.statusCode = 404;
      throw error;
    }

    // Cascade cleanup: remove notifications referencing the deleted task to prevent orphan links
    await Notification.deleteMany({ task: taskId });

    return { id: taskId };
  }

  /**
   * Compute task statistics strictly for the authenticated user
   */
  async getTaskStats(ownerId) {
    const now = new Date();

    const [total, pending, inProgress, completed, overdue] = await Promise.all([
      Task.countDocuments({ owner: ownerId }),
      Task.countDocuments({ owner: ownerId, status: 'pending' }),
      Task.countDocuments({ owner: ownerId, status: 'in_progress' }),
      Task.countDocuments({ owner: ownerId, status: 'completed' }),
      Task.countDocuments({
        owner: ownerId,
        status: { $ne: 'completed' },
        dueDate: { $ne: null, $lt: now },
      }),
    ]);

    return {
      total,
      pending,
      inProgress,
      completed,
      overdue,
    };
  }
}

module.exports = new TaskService();
