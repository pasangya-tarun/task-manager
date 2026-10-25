/**
 * Administrative Script: Verify User Email
 *
 * Usage:
 *   node src/scripts/verifyEmail.js [email]
 *
 * Example:
 *   node src/scripts/verifyEmail.js user@example.com
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const mongoose = require('mongoose');
const User = require('../models/User');

const targetEmail = process.argv[2];

if (!targetEmail) {
  console.error('\x1b[31mError: Please provide an email address to verify.\x1b[0m');
  console.log('Usage: node src/scripts/verifyEmail.js <email>');
  process.exit(1);
}

const normalizedEmail = targetEmail.trim().toLowerCase();

async function run() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error('\x1b[31mError: MONGODB_URI is not set in backend/.env\x1b[0m');
    process.exit(1);
  }

  try {
    await mongoose.connect(mongoUri);
    console.log('\x1b[34mConnected to MongoDB...\x1b[0m');

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      console.error(`\x1b[31mUser not found with email: ${normalizedEmail}\x1b[0m`);
      process.exit(1);
    }

    user.isEmailVerified = true;
    user.emailOtpHash = undefined;
    user.emailOtpExpiresAt = undefined;
    user.emailOtpAttempts = 0;
    user.emailOtpLastSentAt = undefined;

    await user.save();

    console.log('\x1b[32m✔ Email successfully verified:\x1b[0m');
    console.log(`  Name:     ${user.name}`);
    console.log(`  Email:    ${user.email}`);
    console.log(`  Role:     ${user.role}`);
    console.log(`  Verified: ${user.isEmailVerified}`);
    console.log(`  Active:   ${user.isActive}`);
  } catch (error) {
    console.error('\x1b[31mFailed to verify user email:\x1b[0m', error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from database.');
  }
}

run();
