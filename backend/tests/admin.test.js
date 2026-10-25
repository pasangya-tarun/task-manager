const request = require('supertest');
const app = require('../src/app');
const User = require('../src/models/User');
const { generateToken } = require('../src/utils/token');

describe('Admin User Management & Role Authorization Suite', () => {
  let regularUser, adminUser, secondaryAdminUser;
  let regularToken, adminToken, secondaryAdminToken;

  beforeEach(async () => {
    regularUser = await User.create({
      name: 'Regular Bob',
      email: 'bob@example.com',
      passwordHash: await User.hashPassword('Password123!'),
      role: 'user',
      isActive: true,
    });

    adminUser = await User.create({
      name: 'Super Admin',
      email: 'admin@example.com',
      passwordHash: await User.hashPassword('Password123!'),
      role: 'admin',
      isActive: true,
    });

    secondaryAdminUser = await User.create({
      name: 'Secondary Admin',
      email: 'admin2@example.com',
      passwordHash: await User.hashPassword('Password123!'),
      role: 'admin',
      isActive: true,
    });

    regularToken = generateToken(regularUser);
    adminToken = generateToken(adminUser);
    secondaryAdminToken = generateToken(secondaryAdminUser);
  });

  describe('Authorization Barriers', () => {
    it('blocks regular users from accessing admin user list with 403 Forbidden', async () => {
      const res = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${regularToken}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/Insufficient permissions/i);
    });

    it('blocks regular users from updating another user status with 403', async () => {
      const res = await request(app)
        .patch(`/api/admin/users/${regularUser._id}/status`)
        .set('Authorization', `Bearer ${regularToken}`)
        .send({ isActive: false });

      expect(res.status).toBe(403);
    });

    it('blocks regular users from changing their own role via profile update', async () => {
      const res = await request(app)
        .patch('/api/users/me')
        .set('Authorization', `Bearer ${regularToken}`)
        .send({
          name: 'Bob Modified',
          role: 'admin', // Malicious attempt to escalate role
        });

      // Zod validation with strict schema rejects unknown/forbidden keys with 400
      expect(res.status).toBe(400);

      const unchanged = await User.findById(regularUser._id);
      expect(unchanged.role).toBe('user');
    });
  });

  describe('Admin Capabilities & Protections', () => {
    it('allows admin to list users with pagination, never leaking password hashes', async () => {
      const res = await request(app)
        .get('/api/admin/users?page=1&limit=10')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(3);
      expect(res.body.meta.total).toBe(3);

      res.body.data.forEach((u) => {
        expect(u.passwordHash).toBeUndefined();
        expect(u.email).toBeDefined();
        expect(u.role).toBeDefined();
      });
    });

    it('allows admin to deactivate a regular user account', async () => {
      const res = await request(app)
        .patch(`/api/admin/users/${regularUser._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isActive: false });

      expect(res.status).toBe(200);
      expect(res.body.data.isActive).toBe(false);

      const updated = await User.findById(regularUser._id);
      expect(updated.isActive).toBe(false);
    });

    it('allows admin to promote a regular user to admin', async () => {
      const res = await request(app)
        .patch(`/api/admin/users/${regularUser._id}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'admin' });

      expect(res.status).toBe(200);
      expect(res.body.data.role).toBe('admin');
    });

    it('prevents deactivating the last active administrator', async () => {
      // Deactivate secondary admin first
      await User.findByIdAndUpdate(secondaryAdminUser._id, { isActive: false });

      // Now only 1 active admin remains (adminUser)
      const res = await request(app)
        .patch(`/api/admin/users/${adminUser._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isActive: false });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/Cannot deactivate the last active administrator/i);

      // Verify still active in DB
      const checkAdmin = await User.findById(adminUser._id);
      expect(checkAdmin.isActive).toBe(true);
    });

    it('prevents demoting the last active administrator', async () => {
      // Deactivate secondary admin first
      await User.findByIdAndUpdate(secondaryAdminUser._id, { isActive: false });

      // Attempt to demote the sole active admin
      const res = await request(app)
        .patch(`/api/admin/users/${adminUser._id}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'user' });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/Cannot demote the last active administrator/i);

      // Verify still admin in DB
      const checkAdmin = await User.findById(adminUser._id);
      expect(checkAdmin.role).toBe('admin');
    });
  });
});
