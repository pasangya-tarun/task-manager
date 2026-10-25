const express = require('express');
const authController = require('../controllers/authController');
const validate = require('../middleware/validate');
const authenticate = require('../middleware/authenticate');
const { authLimiter } = require('../middleware/rateLimiter');
const {
  registerSchema,
  loginSchema,
  verifyEmailSchema,
  resendOtpSchema,
} = require('../validators/authValidator');

const router = express.Router();

router.post(
  '/register',
  authLimiter,
  validate(registerSchema, 'body'),
  authController.register
);

router.post(
  '/verify-email',
  authLimiter,
  validate(verifyEmailSchema, 'body'),
  authController.verifyEmail
);

router.post(
  '/resend-otp',
  authLimiter,
  validate(resendOtpSchema, 'body'),
  authController.resendOtp
);

router.post(
  '/login',
  authLimiter,
  validate(loginSchema, 'body'),
  authController.login
);

router.post('/logout', authController.logout);

router.get('/me', authenticate, authController.getMe);

module.exports = router;
