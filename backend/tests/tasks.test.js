const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const User = require('../src/models/User');
const Task = require('../src/models/Task');
const { generateToken } = require('../src/utils/token');

describe('Task Management & Ownership Isolation Suite', () => {
  let userA, userB;
  let tokenA, tokenB;

  beforeEach(async () => {
    // Create two isolated users
    userA = await User.create({
      name: 'User A',
      email: 'usera@example.com',
      passwordHash: await User.hashPassword('Password123!'),
      role: 'user',
      isActive: true,
      isEmailVerified: true,
    });

    userB = await User.create({
      name: 'User B',
      email: 'userb@example.com',
      passwordHash: await User.hashPassword('Password123!'),
      role: 'user',
      isActive: true,
      isEmailVerified: true,
    });

    tokenA = generateToken(userA);
    tokenB = generateToken(userB);
  });

  describe('Task Creation & Server-side Owner Assignment', () => {
    it('creates task assigning owner strictly from session, ignoring client-provided owner', async () => {
      const spoofedOwnerId = new mongoose.Types.ObjectId();

      const res = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          title: 'Implement Authentication',
          description: 'Set up JWT and cookies',
          priority: 'high',
          status: 'pending',
          owner: spoofedOwnerId, // Attacker tries to set owner
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('Implement Authentication');
      // Server MUST assign authenticated user A's ID
      expect(res.body.data.owner.toString()).toBe(userA._id.toString());
      expect(res.body.data.owner.toString()).not.toBe(spoofedOwnerId.toString());
    });

    it('rejects task creation with empty title (400)', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          title: '',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('rejects invalid status and priority values (400)', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          title: 'Task with invalid values',
          status: 'unknown_status',
          priority: 'extreme',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Ownership Isolation (Cross-User Access Prevention)', () => {
    let taskOfUserA;

    beforeEach(async () => {
      taskOfUserA = await Task.create({
        title: 'User A Secret Task',
        description: 'Classified task details',
        status: 'pending',
        priority: 'high',
        owner: userA._id,
      });
    });

    it('user A can retrieve their own task by ID', async () => {
      const res = await request(app)
        .get(`/api/tasks/${taskOfUserA._id}`)
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.data.title).toBe('User A Secret Task');
    });

    it('user B cannot read user A’s task by ID (returns 404 to prevent resource disclosure)', async () => {
      const res = await request(app)
        .get(`/api/tasks/${taskOfUserA._id}`)
        .set('Authorization', `Bearer ${tokenB}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('user B cannot edit user A’s task (returns 404)', async () => {
      const res = await request(app)
        .put(`/api/tasks/${taskOfUserA._id}`)
        .set('Authorization', `Bearer ${tokenB}`)
        .send({
          title: 'Tampered Title by User B',
        });

      expect(res.status).toBe(404);

      // Verify the task remained unchanged
      const unaffectedTask = await Task.findById(taskOfUserA._id);
      expect(unaffectedTask.title).toBe('User A Secret Task');
    });

    it('user B cannot update user A’s task status (returns 404)', async () => {
      const res = await request(app)
        .patch(`/api/tasks/${taskOfUserA._id}/status`)
        .set('Authorization', `Bearer ${tokenB}`)
        .send({
          status: 'completed',
        });

      expect(res.status).toBe(404);

      const unaffectedTask = await Task.findById(taskOfUserA._id);
      expect(unaffectedTask.status).toBe('pending');
    });

    it('user B cannot delete user A’s task (returns 404)', async () => {
      const res = await request(app)
        .delete(`/api/tasks/${taskOfUserA._id}`)
        .set('Authorization', `Bearer ${tokenB}`);

      expect(res.status).toBe(404);

      const exists = await Task.findById(taskOfUserA._id);
      expect(exists).not.toBeNull();
    });

    it('handles invalid ObjectId format safely with 400', async () => {
      const res = await request(app)
        .get('/api/tasks/invalid-non-object-id')
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/Invalid ID format/i);
    });
  });

  describe('Search, Filtering, Sorting & Pagination', () => {
    beforeEach(async () => {
      // Seed several tasks for User A
      await Task.create([
        { title: 'Frontend Header Layout', status: 'pending', priority: 'high', owner: userA._id, createdAt: new Date('2026-01-01') },
        { title: 'Backend Database Models', status: 'in_progress', priority: 'medium', owner: userA._id, createdAt: new Date('2026-01-02') },
        { title: 'Write Documentation', status: 'completed', priority: 'low', owner: userA._id, createdAt: new Date('2026-01-03') },
        { title: 'Frontend Dashboard Widgets', status: 'completed', priority: 'high', owner: userA._id, createdAt: new Date('2026-01-04') },
        // Task for User B (must never appear in User A's list)
        { title: 'Frontend Header for User B', status: 'pending', priority: 'high', owner: userB._id },
      ]);
    });

    it('only lists tasks belonging to User A', async () => {
      const res = await request(app)
        .get('/api/tasks')
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(4);
      expect(res.body.meta.total).toBe(4);
      res.body.data.forEach((t) => {
        expect(t.owner.toString()).toBe(userA._id.toString());
      });
    });

    it('searches tasks by title case-insensitively', async () => {
      const res = await request(app)
        .get('/api/tasks?search=frontend')
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(2);
      expect(res.body.data.every((t) => t.title.toLowerCase().includes('frontend'))).toBe(true);
    });

    it('filters tasks by status and priority', async () => {
      const res = await request(app)
        .get('/api/tasks?status=completed&priority=high')
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].title).toBe('Frontend Dashboard Widgets');
    });

    it('sorts tasks by createdAt ascending and descending', async () => {
      const resAsc = await request(app)
        .get('/api/tasks?sortBy=createdAt&sortOrder=asc')
        .set('Authorization', `Bearer ${tokenA}`);

      expect(resAsc.status).toBe(200);
      expect(resAsc.body.data[0].title).toBe('Frontend Header Layout');

      const resDesc = await request(app)
        .get('/api/tasks?sortBy=createdAt&sortOrder=desc')
        .set('Authorization', `Bearer ${tokenA}`);

      expect(resDesc.status).toBe(200);
      expect(resDesc.body.data[0].title).toBe('Frontend Dashboard Widgets');
    });

    it('supports pagination with page and limit parameters', async () => {
      const res = await request(app)
        .get('/api/tasks?page=1&limit=2')
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(2);
      expect(res.body.meta.totalPages).toBe(2);
      expect(res.body.meta.hasNextPage).toBe(true);
    });
  });

  describe('Isolated Dashboard Statistics', () => {
    beforeEach(async () => {
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000);

      // User A tasks
      await Task.create([
        { title: 'A1', status: 'pending', dueDate: pastDate, owner: userA._id }, // overdue
        { title: 'A2', status: 'in_progress', dueDate: futureDate, owner: userA._id },
        { title: 'A3', status: 'completed', dueDate: pastDate, owner: userA._id }, // completed (not overdue)
      ]);

      // User B tasks (should not pollute User A stats)
      await Task.create([
        { title: 'B1', status: 'pending', owner: userB._id },
        { title: 'B2', status: 'pending', owner: userB._id },
      ]);
    });

    it('calculates dashboard stats strictly for the authenticated user', async () => {
      const resA = await request(app)
        .get('/api/tasks/stats')
        .set('Authorization', `Bearer ${tokenA}`);

      expect(resA.status).toBe(200);
      expect(resA.body.data.total).toBe(3);
      expect(resA.body.data.pending).toBe(1);
      expect(resA.body.data.inProgress).toBe(1);
      expect(resA.body.data.completed).toBe(1);
      expect(resA.body.data.overdue).toBe(1);

      const resB = await request(app)
        .get('/api/tasks/stats')
        .set('Authorization', `Bearer ${tokenB}`);

      expect(resB.status).toBe(200);
      expect(resB.body.data.total).toBe(2);
      expect(resB.body.data.pending).toBe(2);
      expect(resB.body.data.completed).toBe(0);
    });
  });
});
