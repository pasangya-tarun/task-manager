const dotenv = require('dotenv');
const path = require('path');
const { z } = require('zod');

// Load .env file from backend root or parent if needed
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const envSchema = z.object({
  PORT: z.string().default('5000').transform((val) => parseInt(val, 10)),
  MONGODB_URI: z.string({
    required_error: 'MONGODB_URI is required. Please check your .env configuration.',
  }).min(1, 'MONGODB_URI cannot be empty').transform((val) => val.replace(/^MONGODB_URI=/, '').trim()),
  CLIENT_URL: z.string().default('http://localhost:5173'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  JWT_SECRET: z.string({
    required_error: 'JWT_SECRET is required. Provide a secure random secret in .env.',
  }).min(16, 'JWT_SECRET must be at least 16 characters long'),
  JWT_EXPIRES_IN: z.string().default('15m'),
  COOKIE_SECRET: z.string({
    required_error: 'COOKIE_SECRET is required. Provide a distinct secret in .env.',
  }).min(16, 'COOKIE_SECRET must be at least 16 characters long'),
  EMAIL_HOST: z.string().optional().default(''),
  EMAIL_PORT: z.string().optional().default('587').transform((val) => parseInt(val, 10) || 587),
  EMAIL_SECURE: z.string().optional().default('false').transform((val) => val === 'true'),
  EMAIL_USER: z.string().optional().default(''),
  EMAIL_PASS: z.string().optional().default(''),
  EMAIL_FROM: z.string().optional().default('"TaskFlow Pro" <noreply@taskflowpro.local>'),
});

// Allow standalone in-memory demo mode if explicitly enabled
if (process.env.USE_IN_MEMORY_DB === 'true') {
  process.env.MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1/task_manager_in_memory';
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'dev_in_memory_jwt_secret_at_least_16_characters';
  process.env.COOKIE_SECRET = process.env.COOKIE_SECRET || 'dev_in_memory_cookie_secret_at_least_16_characters';
}

let envConfig;
try {
  envConfig = envSchema.parse(process.env);
} catch (error) {
  if (process.env.NODE_ENV !== 'test') {
    if (error instanceof z.ZodError) {
      console.error('❌ Environment Configuration Validation Failed:');
      error.errors.forEach((err) => {
        console.error(`   - ${err.path.join('.')}: ${err.message}`);
      });
    } else {
      console.error('❌ Unexpected error loading environment config:', error);
    }
    process.exit(1);
  } else {
    // Fallback defaults for test initialization if needed
    envConfig = {
      PORT: 5001,
      MONGODB_URI: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/task_manager_test',
      CLIENT_URL: 'http://localhost:5173',
      NODE_ENV: 'test',
      JWT_SECRET: process.env.JWT_SECRET || 'test_jwt_secret_must_be_at_least_16_chars_long',
      JWT_EXPIRES_IN: '15m',
      COOKIE_SECRET: process.env.COOKIE_SECRET || 'test_cookie_secret_must_be_at_least_16_chars_long',
    };
  }
}

module.exports = envConfig;
