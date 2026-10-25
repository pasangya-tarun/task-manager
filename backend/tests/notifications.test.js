const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const User = require('../src/models/User');
const Task = require('../src/models/Task');
const Notification = require('../src/models/Notification');
const { generateToken } = require('../src/utils/token');
const { checkTaskReminders } = require('../src/services/reminderScheduler');

describe('Task Reminder & In-App Notification System Suite', () => {
  let userA, userB;
  let tokenA, tokenB;

  beforeEach(async () => {
    // Clear notifications and tasks
    await Notification.deleteMany({});
    await Task.deleteMany({});
    await User.deleteMany({});
    await Notification.init();

    // Create two isolated users
    userA = await User.create({
      name: 'Alice User',
      email: 'alice@example.com',
      passwordHash: await User.hashPassword('Password123!'),
      role: 'user',
      isActive: true,
      isEmailVerified: true,
    });

    userB = await User.create({
      name: 'Bob User',
      email: 'bob@example.com',
      passwordHash: await User.hashPassword('Password123!'),
      role: 'user',
      isActive: true,
      isEmailVerified: true,
    });

    tokenA = generateToken(userA);
    tokenB = generateToken(userB);
  });

  describe('1. Reminder Scheduler & Automated Due/Overdue Notifications', () => {
    it('Scenario 1: A task due now creates a notification for its owner', async () => {
      const now = new Date('2026-10-25T12:00:00Z');

      const task = await Task.create({
        title: 'Submit Project Proposal',
        dueDate: now,
        status: 'pending',
        priority: 'high',
        owner: userA._id,
      });

      const { createdCount } = await checkTaskReminders(now);
      expect(createdCount).toBe(1);

      const notifications = await Notification.find({ user: userA._id });
      expect(notifications).toHaveLength(1);
      expect(notifications[0].task.toString()).toBe(task._id.toString());
      expect(notifications[0].type).toBe('TASK_DUE');
      expect(notifications[0].isRead).toBe(false);
      expect(notifications[0].title).toContain('Task Due: Submit Project Proposal');
    });

    it('Scenario 2: A future task does not create a due notification prematurely', async () => {
      const now = new Date('2026-10-25T12:00:00Z');
      const futureDate = new Date('2026-10-26T12:00:00Z'); // 24 hours in the future

      await Task.create({
        title: 'Future Milestone',
        dueDate: futureDate,
        status: 'pending',
        priority: 'medium',
        owner: userA._id,
      });

      const { createdCount } = await checkTaskReminders(now);
      expect(createdCount).toBe(0);

      const notifications = await Notification.find({ user: userA._id });
      expect(notifications).toHaveLength(0);
    });

    it('Scenario 3: A completed task does not create a reminder', async () => {
      const now = new Date('2026-10-25T12:00:00Z');

      await Task.create({
        title: 'Already Completed Task',
        dueDate: now,
        status: 'completed',
        priority: 'high',
        owner: userA._id,
      });

      const { createdCount } = await checkTaskReminders(now);
      expect(createdCount).toBe(0);

      const notifications = await Notification.find({ user: userA._id });
      expect(notifications).toHaveLength(0);
    });

    it('Scenario 4: The scheduler does not create duplicate reminders', async () => {
      const now = new Date('2026-10-25T12:00:00Z');

      await Task.create({
        title: 'Single Notification Task',
        dueDate: now,
        status: 'pending',
        priority: 'low',
        owner: userA._id,
      });

      // First run: creates notification
      const firstRun = await checkTaskReminders(now);
      expect(firstRun.createdCount).toBe(1);

      // Second run at the same time: must skip and create zero duplicates
      const secondRun = await checkTaskReminders(now);
      expect(secondRun.createdCount).toBe(0);
      expect(secondRun.skippedCount).toBe(1);

      const notifications = await Notification.find({ user: userA._id });
      expect(notifications).toHaveLength(1);
    });

    it('Scenario 5: An overdue task does not generate a new notification every five minutes', async () => {
      const dueTime = new Date('2026-10-25T12:00:00Z');

      await Task.create({
        title: 'Important Overdue Deliverable',
        dueDate: dueTime,
        status: 'pending',
        priority: 'high',
        owner: userA._id,
      });

      // At dueTime (12:00:00), TASK_DUE is generated
      const runAtDue = await checkTaskReminders(dueTime);
      expect(runAtDue.createdCount).toBe(1);

      const notifsAfterDue = await Notification.find({ user: userA._id });
      expect(notifsAfterDue).toHaveLength(1);
      expect(notifsAfterDue[0].type).toBe('TASK_DUE');

      // 5 minutes later (12:05:00), task remains incomplete and is now overdue
      const run5MinLater = await checkTaskReminders(new Date('2026-10-25T12:05:00Z'));
      expect(run5MinLater.createdCount).toBe(1);

      const notifsAfterOverdue = await Notification.find({ user: userA._id });
      expect(notifsAfterOverdue).toHaveLength(2);
      const types = notifsAfterOverdue.map((n) => n.type);
      expect(types).toContain('TASK_DUE');
      expect(types).toContain('TASK_OVERDUE');

      // 10 minutes later (12:10:00): next 5-min cycle must NOT create any new notification
      const run10MinLater = await checkTaskReminders(new Date('2026-10-25T12:10:00Z'));
      expect(run10MinLater.createdCount).toBe(0);
      expect(run10MinLater.skippedCount).toBe(1);

      // 15 minutes later (12:15:00): another 5-min cycle must still create nothing
      const run15MinLater = await checkTaskReminders(new Date('2026-10-25T12:15:00Z'));
      expect(run15MinLater.createdCount).toBe(0);

      const finalNotifs = await Notification.find({ user: userA._id });
      expect(finalNotifs).toHaveLength(2);
    });

    it('Compound unique index prevents duplicate notification creation at database level', async () => {
      const task = await Task.create({
        title: 'DB Index Protection Task',
        dueDate: new Date(),
        status: 'pending',
        owner: userA._id,
      });

      await Notification.create({
        user: userA._id,
        task: task._id,
        type: 'TASK_DUE',
        title: 'Task Due',
        message: 'Task is due',
      });

      // Directly trying to insert duplicate with same user, task, and type must throw E11000
      await expect(
        Notification.create({
          user: userA._id,
          task: task._id,
          type: 'TASK_DUE',
          title: 'Duplicate Task Due',
          message: 'Duplicate notification',
        })
      ).rejects.toThrow();
    });
  });

  describe('2. Security, Access Isolation & API Ownership Enforcement', () => {
    let notifUserA, notifUserB;

    beforeEach(async () => {
      notifUserA = await Notification.create({
        user: userA._id,
        type: 'TASK_DUE',
        title: 'Alice Task Reminder',
        message: 'Alice has a deadline',
        isRead: false,
      });

      notifUserB = await Notification.create({
        user: userB._id,
        type: 'TASK_OVERDUE',
        title: 'Bob Task Reminder',
        message: 'Bob has an overdue item',
        isRead: false,
      });
    });

    it('Scenario 6: User A cannot access User B notifications', async () => {
      const res = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0]._id.toString()).toBe(notifUserA._id.toString());
      expect(res.body.data[0].title).toBe('Alice Task Reminder');

      // User A must not receive any trace of User B's notification
      const returnedIds = res.body.data.map((n) => n._id.toString());
      expect(returnedIds).not.toContain(notifUserB._id.toString());
    });

    it('Scenario 7: A user cannot mark another user notification as read', async () => {
      // User A attempts to mark User B's notification as read
      const res = await request(app)
        .patch(`/api/notifications/${notifUserB._id}/read`)
        .set('Authorization', `Bearer ${tokenA}`);

      // Returns 404 to avoid confirming existence of other users' records
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);

      // Verify User B's notification is still unread in database
      const freshNotifB = await Notification.findById(notifUserB._id);
      expect(freshNotifB.isRead).toBe(false);
    });

    it('Scenario 8: Mark-as-read updates the unread count correctly', async () => {
      // Create a second unread notification for User A
      await Notification.create({
        user: userA._id,
        type: 'TASK_OVERDUE',
        title: 'Alice Second Reminder',
        message: 'Second task warning',
        isRead: false,
      });

      // Check initial unread count: should be 2
      const initialCountRes = await request(app)
        .get('/api/notifications/unread-count')
        .set('Authorization', `Bearer ${tokenA}`);

      expect(initialCountRes.status).toBe(200);
      expect(initialCountRes.body.data.unreadCount).toBe(2);

      // Mark the first notification as read
      const markRes = await request(app)
        .patch(`/api/notifications/${notifUserA._id}/read`)
        .set('Authorization', `Bearer ${tokenA}`);

      expect(markRes.status).toBe(200);
      expect(markRes.body.success).toBe(true);
      expect(markRes.body.data.isRead).toBe(true);

      // Unread count should now decrease to 1
      const updatedCountRes = await request(app)
        .get('/api/notifications/unread-count')
        .set('Authorization', `Bearer ${tokenA}`);

      expect(updatedCountRes.status).toBe(200);
      expect(updatedCountRes.body.data.unreadCount).toBe(1);

      // Mark all as read: unread count should become 0
      const readAllRes = await request(app)
        .patch('/api/notifications/read-all')
        .set('Authorization', `Bearer ${tokenA}`);

      expect(readAllRes.status).toBe(200);
      expect(readAllRes.body.data.modifiedCount).toBe(1);

      const finalCountRes = await request(app)
        .get('/api/notifications/unread-count')
        .set('Authorization', `Bearer ${tokenA}`);

      expect(finalCountRes.body.data.unreadCount).toBe(0);
    });

    it('User cannot delete another user notification (returns 404)', async () => {
      const res = await request(app)
        .delete(`/api/notifications/${notifUserB._id}`)
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);

      // Ensure User B's notification still exists
      const checkNotif = await Notification.findById(notifUserB._id);
      expect(checkNotif).not.toBeNull();
    });

    it('Allows user to delete their own notification', async () => {
      const res = await request(app)
        .delete(`/api/notifications/${notifUserA._id}`)
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const checkNotif = await Notification.findById(notifUserA._id);
      expect(checkNotif).toBeNull();
    });

    it('Rejects invalid notification ID format with 400 Bad Request', async () => {
      const res = await request(app)
        .patch('/api/notifications/invalid-id-format/read')
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('Deleting a task cascades and removes linked notifications', async () => {
      const task = await Task.create({
        title: 'Task to be deleted',
        status: 'pending',
        priority: 'low',
        owner: userA._id,
      });

      const linkedNotif = await Notification.create({
        user: userA._id,
        task: task._id,
        type: 'TASK_DUE',
        title: 'Linked Notification',
        message: 'This notification should be cleaned up on task delete',
      });

      // Delete task via API
      const deleteRes = await request(app)
        .delete(`/api/tasks/${task._id}`)
        .set('Authorization', `Bearer ${tokenA}`);

      expect(deleteRes.status).toBe(200);

      // Linked notification must be removed so no orphan links remain
      const notifAfterTaskDelete = await Notification.findById(linkedNotif._id);
      expect(notifAfterTaskDelete).toBeNull();
    });
  });
});
