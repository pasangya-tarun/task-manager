const request = require('supertest');
const app = require('../src/app');
const User = require('../src/models/User');
const { COOKIE_NAME } = require('../src/utils/token');

describe('Authentication & Security Suite', () => {
  const validUser = {
    name: 'Alice Johnson',
    email: 'alice@example.com',
    password: 'Password123!',
    confirmPassword: 'Password123!',
  };

  describe('POST /api/auth/register', () => {
    it('successfully registers a new user with default user role and sets HttpOnly cookie', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          ...validUser,
          role: 'admin', // Attempted role escalation should be ignored
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.name).toBe('Alice Johnson');
      expect(res.body.data.user.email).toBe('alice@example.com');
      expect(res.body.data.user.role).toBe('user'); // Enforces user role
      expect(res.body.data.user.passwordHash).toBeUndefined();

      // Check cookie was set
      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies.some((c) => c.includes(`${COOKIE_NAME}=`))).toBe(true);
      expect(cookies.some((c) => c.includes('HttpOnly'))).toBe(true);

      // Verify DB storage: password is hashed, not plaintext
      const dbUser = await User.findOne({ email: 'alice@example.com' }).select('+passwordHash');
      expect(dbUser).not.toBeNull();
      expect(dbUser.passwordHash).not.toBe(validUser.password);
      expect(dbUser.passwordHash.startsWith('$2')).toBe(true);
    });

    it('rejects registration with duplicate email (409 Conflict)', async () => {
      await request(app).post('/api/auth/register').send(validUser);

      const duplicateRes = await request(app)
        .post('/api/auth/register')
        .send({
          ...validUser,
          email: 'ALICE@EXAMPLE.COM', // normalized comparison
        });

      expect(duplicateRes.status).toBe(409);
      expect(duplicateRes.body.success).toBe(false);
      expect(duplicateRes.body.message).toMatch(/already exists/i);
    });

    it('rejects registration with invalid email, weak password, or password mismatch', async () => {
      const badRes = await request(app).post('/api/auth/register').send({
        name: 'A',
        email: 'invalid-email',
        password: 'weak',
        confirmPassword: 'mismatch',
      });

      expect(badRes.status).toBe(400);
      expect(badRes.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      await request(app).post('/api/auth/register').send(validUser);
    });

    it('successfully logs in with valid credentials and sets HttpOnly cookie', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: validUser.email,
        password: validUser.password,
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe(validUser.email);
      expect(res.body.data.user.passwordHash).toBeUndefined();

      const cookies = res.headers['set-cookie'];
      expect(cookies.some((c) => c.includes(`${COOKIE_NAME}=`))).toBe(true);
    });

    it('returns generic 401 error for incorrect password without leaking existence', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: validUser.email,
        password: 'WrongPassword999!',
      });

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Invalid email or password');
    });

    it('returns generic 401 error for non-existent email', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: 'nobody@example.com',
        password: 'Password123!',
      });

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Invalid email or password');
    });

    it('rejects login for deactivated user accounts with 403 Forbidden', async () => {
      await User.updateOne({ email: validUser.email }, { isActive: false });

      const res = await request(app).post('/api/auth/login').send({
        email: validUser.email,
        password: validUser.password,
      });

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/deactivated/i);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('clears the authentication cookie on logout', async () => {
      const res = await request(app).post('/api/auth/logout');
      expect(res.status).toBe(200);
      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies.some((c) => c.includes(`${COOKIE_NAME}=;`))).toBe(true);
    });
  });

  describe('GET /api/auth/me & Protected Route Checks', () => {
    let authCookie;

    beforeEach(async () => {
      const regRes = await request(app).post('/api/auth/register').send(validUser);
      authCookie = regRes.headers['set-cookie'];
    });

    it('returns current user profile when authenticated with cookie', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Cookie', authCookie);

      expect(res.status).toBe(200);
      expect(res.body.data.user.email).toBe(validUser.email);
    });

    it('rejects unauthenticated requests with 401', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
    });

    it('rejects invalid or tampered tokens with 401', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Cookie', [`${COOKIE_NAME}=invalid_tampered_token_value`]);
      expect(res.status).toBe(401);
    });

    it('rejects requests from deactivated users on protected endpoints with 403', async () => {
      await User.updateOne({ email: validUser.email }, { isActive: false });

      const res = await request(app)
        .get('/api/auth/me')
        .set('Cookie', authCookie);

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/deactivated/i);
    });
  });
});
