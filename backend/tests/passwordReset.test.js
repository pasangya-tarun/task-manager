const request = require('supertest');
const app = require('../src/app');
const User = require('../src/models/User');
const emailService = require('../src/services/emailService');
const { generateToken, COOKIE_NAME } = require('../src/utils/token');

describe('Forgot Password & Reset Password Workflow Suite', () => {
  const testUser = {
    name: 'Robert Stark',
    email: 'robert@example.com',
    password: 'InitialPassword123!',
    confirmPassword: 'InitialPassword123!',
  };

  let capturedResetUrl = null;
  let capturedToken = null;
  let sendEmailSpy = null;

  beforeEach(() => {
    capturedResetUrl = null;
    capturedToken = null;

    sendEmailSpy = jest.spyOn(emailService, 'sendPasswordResetEmail').mockImplementation(async (options) => {
      capturedResetUrl = options.resetUrl;
      const urlObj = new URL(options.resetUrl);
      capturedToken = urlObj.searchParams.get('token');
      return { messageId: 'mock-reset-mail-id' };
    });
  });

  afterEach(() => {
    if (sendEmailSpy) {
      sendEmailSpy.mockRestore();
    }
  });

  // Helper to create an active, verified user
  const createVerifiedUser = async (userData = testUser) => {
    const passwordHash = await User.hashPassword(userData.password);
    return User.create({
      name: userData.name,
      email: userData.email.toLowerCase().trim(),
      passwordHash,
      role: 'user',
      isActive: true,
      isEmailVerified: true,
      tokenVersion: 0,
    });
  };

  describe('1. Forgot Password Request & Account Enumeration Defenses', () => {
    it('1 & 3: sends reset email for existing verified account and returns generic response', async () => {
      await createVerifiedUser();

      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: testUser.email });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe(
        'If an account exists for this email address, you will receive instructions to reset your password.'
      );

      // Verify email was dispatched with secure token
      expect(sendEmailSpy).toHaveBeenCalledTimes(1);
      expect(capturedToken).toBeDefined();
      expect(capturedToken).toMatch(/^[a-f0-9]{64}$/); // 32-byte hex

      // Verify DB stores hash and expiry, but NEVER raw token
      const dbUser = await User.findOne({ email: testUser.email }).select(
        '+passwordResetTokenHash +passwordResetExpiresAt'
      );
      expect(dbUser.passwordResetTokenHash).toBeDefined();
      expect(dbUser.passwordResetTokenHash).not.toBe(capturedToken);
      expect(dbUser.passwordResetExpiresAt).toBeDefined();
      expect(new Date(dbUser.passwordResetExpiresAt).getTime()).toBeGreaterThan(Date.now());
    });

    it('2 & 3: returns identical generic response for unknown account without sending email', async () => {
      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'nonexistent@example.com' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe(
        'If an account exists for this email address, you will receive instructions to reset your password.'
      );

      expect(sendEmailSpy).not.toHaveBeenCalled();
    });

    it('4: rejects invalid email format with 400 Bad Request', async () => {
      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'not-a-valid-email' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/valid email/i);
    });

    it('13: handles SMTP email delivery failures safely and rolls back token', async () => {
      await createVerifiedUser();

      sendEmailSpy.mockImplementationOnce(async () => {
        const error = new Error('SMTP Connection timeout');
        error.statusCode = 502;
        throw error;
      });

      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: testUser.email });

      expect(res.status).toBe(502);
      expect(res.body.success).toBe(false);

      // DB token should have been rolled back to prevent hanging invalid state
      const dbUser = await User.findOne({ email: testUser.email }).select(
        '+passwordResetTokenHash +passwordResetExpiresAt'
      );
      expect(dbUser.passwordResetTokenHash).toBeNull();
    });

    it('14: does not send reset email for unverified user accounts', async () => {
      const passwordHash = await User.hashPassword(testUser.password);
      await User.create({
        name: testUser.name,
        email: testUser.email,
        passwordHash,
        isEmailVerified: false,
      });

      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: testUser.email });

      // Returns generic message to prevent leaking verification status
      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/If an account exists/i);
      expect(sendEmailSpy).not.toHaveBeenCalled();
    });
  });

  describe('2. Reset Password Submission & Token Verification', () => {
    it('5: rejects expired reset token with 400', async () => {
      const user = await createVerifiedUser();
      const rawToken = 'a'.repeat(64);
      const { hashResetToken } = require('../src/utils/resetToken');

      user.passwordResetTokenHash = hashResetToken(rawToken);
      user.passwordResetExpiresAt = new Date(Date.now() - 5000); // Expired 5 seconds ago
      await user.save();

      const res = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: rawToken,
          password: 'NewValidPassword123!',
          confirmPassword: 'NewValidPassword123!',
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/invalid or has expired/i);
    });

    it('6: rejects invalid or non-existent token with 400', async () => {
      await createVerifiedUser();

      const res = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: 'nonexistenttoken123456789012345678901234567890123456789012345678',
          password: 'NewValidPassword123!',
          confirmPassword: 'NewValidPassword123!',
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/invalid or has expired/i);
    });

    it('rejects password failing policy or confirmation mismatch', async () => {
      const res = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: 'sometoken',
          password: 'weak',
          confirmPassword: 'weak',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);

      const mismatchRes = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: 'sometoken',
          password: 'ValidPassword123!',
          confirmPassword: 'DifferentPassword123!',
        });

      expect(mismatchRes.status).toBe(400);
      expect(mismatchRes.body.message).toMatch(/passwords do not match/i);
    });

    it('7, 8, 9, 10, 11: successfully resets password, invalidates token, and allows login with new password', async () => {
      const user = await createVerifiedUser();

      // Request forgot password
      await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: testUser.email });

      expect(capturedToken).toBeDefined();

      const newPassword = 'BrandNewPassword456!';

      // 7: Submit password reset
      const resetRes = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: capturedToken,
          password: newPassword,
          confirmPassword: newPassword,
        });

      expect(resetRes.status).toBe(200);
      expect(resetRes.body.success).toBe(true);
      expect(resetRes.body.message).toMatch(/password has been reset successfully/i);

      // Verify reset does NOT automatically log in the user (no cookie returned)
      expect(resetRes.headers['set-cookie']).toBeUndefined();

      // 8: Token reuse fails
      const reuseRes = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: capturedToken,
          password: 'AnotherPassword789!',
          confirmPassword: 'AnotherPassword789!',
        });

      expect(reuseRes.status).toBe(400);
      expect(reuseRes.body.message).toMatch(/invalid or has expired/i);

      // 10: Login with OLD password fails
      const oldLoginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        });

      expect(oldLoginRes.status).toBe(401);

      // 9: Login with NEW password succeeds
      const newLoginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: newPassword,
        });

      expect(newLoginRes.status).toBe(200);
      expect(newLoginRes.headers['set-cookie']).toBeDefined();

      // 11: Password is stored hashed in MongoDB
      const updatedUser = await User.findById(user._id).select('+passwordHash');
      expect(updatedUser.passwordHash).toMatch(/^\$2[aby]\$\d+\$/);
      expect(updatedUser.passwordHash).not.toBe(newPassword);
    });

    it('14 (Session Revocation): invalidates previously issued JWT sessions upon password reset', async () => {
      const user = await createVerifiedUser();

      // Generate a JWT token before password reset
      const activeJwt = generateToken(user);

      // Verify that activeJwt works on protected route
      const meBeforeRes = await request(app)
        .get('/api/auth/me')
        .set('Cookie', [`${COOKIE_NAME}=${activeJwt}`]);

      expect(meBeforeRes.status).toBe(200);

      // Trigger forgot password and reset
      await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: testUser.email });

      await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: capturedToken,
          password: 'BrandNewSecurePass999!',
          confirmPassword: 'BrandNewSecurePass999!',
        });

      // Verify that previous JWT is now rejected with 401 Session Invalidated
      const meAfterRes = await request(app)
        .get('/api/auth/me')
        .set('Cookie', [`${COOKIE_NAME}=${activeJwt}`]);

      expect(meAfterRes.status).toBe(401);
      expect(meAfterRes.body.message).toMatch(/session invalidated/i);
    });

    it('15: prevents concurrent requests from reusing the same single-use token', async () => {
      await createVerifiedUser();

      // Request reset token
      await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: testUser.email });

      expect(capturedToken).toBeDefined();

      // Fire two concurrent reset requests with identical token
      const req1 = request(app)
        .post('/api/auth/reset-password')
        .send({
          token: capturedToken,
          password: 'ConcurrentPass1!',
          confirmPassword: 'ConcurrentPass1!',
        });

      const req2 = request(app)
        .post('/api/auth/reset-password')
        .send({
          token: capturedToken,
          password: 'ConcurrentPass2!',
          confirmPassword: 'ConcurrentPass2!',
        });

      const [res1, res2] = await Promise.all([req1, req2]);

      const statuses = [res1.status, res2.status].sort();
      // Exactly one request must succeed (200), and the other must fail (400)
      expect(statuses).toEqual([200, 400]);
    });
  });

  describe('3. Rate Limiting Protection', () => {
    it('12: enforces rate limiting on password reset endpoint when header is present', async () => {
      await createVerifiedUser();

      // Send 20 rapid requests with x-test-rate-limit header (limiter max is 20)
      for (let i = 0; i < 20; i++) {
        await request(app)
          .post('/api/auth/forgot-password')
          .set('x-test-rate-limit', 'true')
          .send({ email: testUser.email });
      }

      // 21st request should hit rate limit
      const rateLimitedRes = await request(app)
        .post('/api/auth/forgot-password')
        .set('x-test-rate-limit', 'true')
        .send({ email: testUser.email });

      expect(rateLimitedRes.status).toBe(429);
      expect(rateLimitedRes.body.message).toMatch(/too many password reset requests/i);
    });
  });
});
