const request = require('supertest');
const app = require('../src/app');
const User = require('../src/models/User');
const emailService = require('../src/services/emailService');
const { COOKIE_NAME } = require('../src/utils/token');

describe('Authentication, Security & Email OTP Verification Suite', () => {
  const validUser = {
    name: 'Alice Johnson',
    email: 'alice@example.com',
    password: 'Password123!',
    confirmPassword: 'Password123!',
  };

  let capturedOtp = null;
  let sendEmailSpy;

  beforeEach(() => {
    capturedOtp = null;
    sendEmailSpy = jest.spyOn(emailService, 'sendOtpEmail').mockImplementation(async (options) => {
      capturedOtp = options.otp;
      return { messageId: 'mock-mail-id' };
    });
  });

  afterEach(() => {
    if (sendEmailSpy) sendEmailSpy.mockRestore();
  });

  describe('POST /api/auth/register', () => {
    it('registers a user with isEmailVerified=false, dispatches OTP, and DOES NOT issue a session cookie', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send(validUser);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.name).toBe('Alice Johnson');
      expect(res.body.data.user.email).toBe('alice@example.com');
      expect(res.body.data.user.role).toBe('user');
      expect(res.body.data.isEmailVerified).toBe(false);

      // Must NOT issue authenticated session before verification
      expect(res.body.data.token).toBeUndefined();
      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeUndefined();

      // Verify email was sent with a 6-digit OTP
      expect(sendEmailSpy).toHaveBeenCalledTimes(1);
      expect(capturedOtp).toMatch(/^\d{6}$/);

      // Verify DB storage: raw OTP is NEVER stored; hash and expiry are stored
      const dbUser = await User.findOne({ email: 'alice@example.com' }).select(
        '+passwordHash +emailOtpHash +emailOtpExpiresAt +isEmailVerified'
      );
      expect(dbUser).not.toBeNull();
      expect(dbUser.isEmailVerified).toBe(false);
      expect(dbUser.emailOtpHash).toBeDefined();
      expect(dbUser.emailOtpHash).not.toBe(capturedOtp); // Must be a secure hash
      expect(dbUser.emailOtpExpiresAt).toBeDefined();
    });

    it('rejects registration with duplicate email for an already-verified user (409 Conflict)', async () => {
      // First user registered and verified
      await User.create({
        ...validUser,
        passwordHash: await User.hashPassword(validUser.password),
        isEmailVerified: true,
      });

      const res = await request(app)
        .post('/api/auth/register')
        .send(validUser);

      expect(res.status).toBe(409);
      expect(res.body.message).toMatch(/already exists/i);
    });

    it('rejects registration with invalid email, weak password, or password mismatch', async () => {
      const res = await request(app).post('/api/auth/register').send({
        name: 'A',
        email: 'invalid-email',
        password: 'weak',
        confirmPassword: 'mismatch',
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('handles email delivery failure safely returning a 502 error', async () => {
      sendEmailSpy.mockImplementationOnce(async () => {
        const error = new Error('Failed to send verification email. Please check SMTP settings or try again.');
        error.statusCode = 502;
        throw error;
      });

      const res = await request(app)
        .post('/api/auth/register')
        .send({
          ...validUser,
          email: 'smtp-fail@example.com',
        });

      expect(res.status).toBe(502);
      expect(res.body.message).toMatch(/failed to send verification email/i);
    });
  });

  describe('POST /api/auth/verify-email', () => {
    beforeEach(async () => {
      await request(app).post('/api/auth/register').send(validUser);
    });

    it('successfully verifies email with valid 6-digit OTP and clears OTP metadata', async () => {
      expect(capturedOtp).toBeDefined();

      const res = await request(app)
        .post('/api/auth/verify-email')
        .send({
          email: validUser.email,
          otp: capturedOtp,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toMatch(/verified successfully/i);

      // Verify in DB
      const dbUser = await User.findOne({ email: validUser.email }).select(
        '+emailOtpHash +emailOtpExpiresAt'
      );
      expect(dbUser.isEmailVerified).toBe(true);
      expect(dbUser.emailOtpHash).toBeNull();
      expect(dbUser.emailOtpExpiresAt).toBeNull();
    });

    it('rejects incorrect OTP and records failed attempt', async () => {
      const res = await request(app)
        .post('/api/auth/verify-email')
        .send({
          email: validUser.email,
          otp: '000000', // incorrect OTP
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/invalid verification code/i);

      // Verify attempts incremented
      const dbUser = await User.findOne({ email: validUser.email }).select('+emailOtpAttempts');
      expect(dbUser.emailOtpAttempts).toBe(1);
    });

    it('rejects expired OTP submissions', async () => {
      // Set expiry to past date
      await User.updateOne(
        { email: validUser.email },
        { emailOtpExpiresAt: new Date(Date.now() - 1000) }
      );

      const res = await request(app)
        .post('/api/auth/verify-email')
        .send({
          email: validUser.email,
          otp: capturedOtp,
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/expired/i);
    });

    it('rejects OTP after maximum attempts (5) are exceeded', async () => {
      // Set attempts to 5
      await User.updateOne({ email: validUser.email }, { emailOtpAttempts: 5 });

      const res = await request(app)
        .post('/api/auth/verify-email')
        .send({
          email: validUser.email,
          otp: capturedOtp,
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/maximum verification attempts exceeded/i);
    });

    it('prevents OTP reuse once already verified', async () => {
      // First verification succeeds
      await request(app)
        .post('/api/auth/verify-email')
        .send({ email: validUser.email, otp: capturedOtp });

      // Second verification attempt with same OTP returns already verified
      const secondRes = await request(app)
        .post('/api/auth/verify-email')
        .send({ email: validUser.email, otp: capturedOtp });

      expect(secondRes.status).toBe(200);
      expect(secondRes.body.data.alreadyVerified).toBe(true);
    });
  });

  describe('POST /api/auth/resend-otp', () => {
    beforeEach(async () => {
      await request(app).post('/api/auth/register').send(validUser);
    });

    it('enforces 60-second cooldown and rejects rapid resend requests (429)', async () => {
      // Attempt resend immediately after registration
      const res = await request(app)
        .post('/api/auth/resend-otp')
        .send({ email: validUser.email });

      expect(res.status).toBe(429);
      expect(res.body.message).toMatch(/Please wait \d+ seconds/i);
    });

    it('issues a replacement OTP and resets attempt counter when cooldown has elapsed', async () => {
      // Fast-forward last sent time past 60s
      await User.updateOne(
        { email: validUser.email },
        { emailOtpLastSentAt: new Date(Date.now() - 65 * 1000), emailOtpAttempts: 3 }
      );

      const res = await request(app)
        .post('/api/auth/resend-otp')
        .send({ email: validUser.email });

      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/new verification code has been sent/i);

      // Check that attempts were reset
      const dbUser = await User.findOne({ email: validUser.email }).select('+emailOtpAttempts');
      expect(dbUser.emailOtpAttempts).toBe(0);
    });

    it('responds generically for non-existent emails to mitigate account enumeration', async () => {
      const res = await request(app)
        .post('/api/auth/resend-otp')
        .send({ email: 'nonexistent@example.com' });

      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/If an unverified account exists/i);
    });
  });

  describe('POST /api/auth/login & Verification Enforcement', () => {
    beforeEach(async () => {
      await request(app).post('/api/auth/register').send(validUser);
    });

    it('rejects login for unverified user accounts with 403 and EMAIL_NOT_VERIFIED code', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: validUser.email,
        password: validUser.password,
      });

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('EMAIL_NOT_VERIFIED');
      expect(res.body.message).toMatch(/verify your email/i);
    });

    it('allows login once email is verified and sets HttpOnly session cookie', async () => {
      // Verify email
      await request(app)
        .post('/api/auth/verify-email')
        .send({ email: validUser.email, otp: capturedOtp });

      // Now login succeeds
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

    it('returns generic 401 error for incorrect password without revealing account status', async () => {
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
      await User.updateOne({ email: validUser.email }, { isEmailVerified: true, isActive: false });

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
      await request(app).post('/api/auth/register').send(validUser);
      // Verify email
      await request(app)
        .post('/api/auth/verify-email')
        .send({ email: validUser.email, otp: capturedOtp });
      // Log in
      const loginRes = await request(app).post('/api/auth/login').send({
        email: validUser.email,
        password: validUser.password,
      });
      authCookie = loginRes.headers['set-cookie'];
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

    it('rejects requests from unverified users on protected endpoints with 403', async () => {
      await User.updateOne({ email: validUser.email }, { isEmailVerified: false });

      const res = await request(app)
        .get('/api/auth/me')
        .set('Cookie', authCookie);

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/verify your email/i);
    });
  });
});
