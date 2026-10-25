const cron = require('node-cron');
const mongoose = require('mongoose');
const User = require('../models/User');
const Task = require('../models/Task');
const Notification = require('../models/Notification');

let cronTask = null;

/**
 * Checks for tasks due or overdue and generates in-app notifications.
 * Safe to call standalone or in test suites with controllable referenceTime.
 * 
 * @param {Date} [referenceTime=new Date()] Optional simulated time for deterministic testing
 * @returns {Promise<{ createdCount: number, skippedCount: number }>}
 */
const checkTaskReminders = async (referenceTime = new Date()) => {
  // Gracefully handle unready database connection
  if (mongoose.connection.readyState !== 1) {
    console.warn('⚠️ [Scheduler] Database connection not ready. Skipping reminder cycle.');
    return { createdCount: 0, skippedCount: 0 };
  }

  const now = referenceTime instanceof Date ? referenceTime : new Date(referenceTime);
  let createdCount = 0;
  let skippedCount = 0;

  try {
    // 1. Query incomplete tasks whose due dates have reached or passed the reference time
    const tasks = await Task.find({
      status: { $ne: 'completed' },
      dueDate: { $ne: null, $lte: now },
    }).populate('owner', '_id isActive isEmailVerified');

    const FIVE_MINUTES_MS = 5 * 60 * 1000;

    for (const task of tasks) {
      // Validate owner active status
      if (!task.owner || !task.owner.isActive) {
        skippedCount++;
        continue;
      }

      const diffMs = now.getTime() - new Date(task.dueDate).getTime();

      // Differentiate between tasks due right now vs tasks that are past due (overdue)
      let candidateType = 'TASK_DUE';
      let title = `Task Due: ${task.title}`;
      let message = `Your task "${task.title}" has reached its due date.`;

      if (diffMs >= FIVE_MINUTES_MS) {
        candidateType = 'TASK_OVERDUE';
        title = `Task Overdue: ${task.title}`;
        message = `Your task "${task.title}" is overdue and remains incomplete.`;
      }

      // Check for pre-existing reminder in database (first-line check)
      const existing = await Notification.findOne({
        task: task._id,
        user: task.owner._id,
        type: candidateType,
      });

      if (existing) {
        skippedCount++;
        continue;
      }

      // Attempt creation with database-level compound unique index protection (race-condition protection)
      try {
        await Notification.create({
          user: task.owner._id,
          task: task._id,
          type: candidateType,
          title,
          message,
        });
        createdCount++;
      } catch (insertErr) {
        // E11000 duplicate key error caught safely
        if (insertErr.code === 11000) {
          skippedCount++;
        } else {
          console.error(
            `❌ [Scheduler] Error saving ${candidateType} notification for task ${task._id}:`,
            insertErr.message
          );
        }
      }
    }
  } catch (error) {
    console.error('❌ [Scheduler] Error during reminder cycle execution:', error.message);
  }

  return { createdCount, skippedCount };
};

/**
 * Starts the reminder scheduler singleton if not already running.
 * Runs every 5 minutes ('* /5 * * * *').
 */
const startReminderScheduler = () => {
  if (cronTask) {
    console.log('ℹ️ [Scheduler] Reminder scheduler is already active.');
    return cronTask;
  }

  cronTask = cron.schedule('*/5 * * * *', async () => {
    try {
      await checkTaskReminders();
    } catch (err) {
      console.error('❌ [Scheduler] Unhandled error during scheduled reminder cycle:', err.message);
    }
  });

  console.log('⏰ [Scheduler] Task reminder scheduler initialized (running every 5 minutes)');
  return cronTask;
};

/**
 * Stops the reminder scheduler singleton gracefully.
 */
const stopReminderScheduler = () => {
  if (cronTask) {
    cronTask.stop();
    cronTask = null;
    console.log('🛑 [Scheduler] Task reminder scheduler stopped gracefully');
  }
};

/**
 * Returns whether the scheduler is currently active.
 */
const isSchedulerRunning = () => Boolean(cronTask);

module.exports = {
  checkTaskReminders,
  startReminderScheduler,
  stopReminderScheduler,
  isSchedulerRunning,
};
