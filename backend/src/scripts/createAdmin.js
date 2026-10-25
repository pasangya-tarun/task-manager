const crypto = require('crypto');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const { connectDB, disconnectDB } = require('../config/database');
const User = require('../models/User');

const run = async () => {
  const args = process.argv.slice(2);
  const name = args[0] || process.env.ADMIN_NAME || 'System Administrator';
  const email = (args[1] || process.env.ADMIN_EMAIL || 'admin@taskmanager.local').toLowerCase().trim();
  
  // Either accept CLI/env password or generate a cryptographically strong random password
  let password = args[2] || process.env.ADMIN_PASSWORD;
  let isGeneratedPassword = false;

  if (!password) {
    // Generate secure 16-character alphanumeric password with upper, lower, number
    const randomBytes = crypto.randomBytes(8).toString('hex');
    password = `Admin@${randomBytes}`;
    isGeneratedPassword = true;
  }

  // Validate password strength
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/;
  if (password.length < 8 || !passwordRegex.test(password)) {
    console.error('❌ Error: Password must be at least 8 characters and contain at least one uppercase letter, one lowercase letter, and one number.');
    process.exit(1);
  }

  try {
    await connectDB();

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      if (existingUser.role === 'admin') {
        console.log(`ℹ️ Admin user with email "${email}" already exists (ID: ${existingUser._id}).`);
      } else {
        existingUser.role = 'admin';
        existingUser.isActive = true;
        existingUser.isEmailVerified = true;
        await existingUser.save();
        console.log(`✅ Existing user "${email}" has been successfully promoted to "admin".`);
      }
    } else {
      const passwordHash = await User.hashPassword(password);
      const newAdmin = await User.create({
        name,
        email,
        passwordHash,
        role: 'admin',
        isActive: true,
        isEmailVerified: true,
      });

      console.log('====================================================');
      console.log('✅ Initial Administrator Created Successfully!');
      console.log(`   ID:       ${newAdmin._id}`);
      console.log(`   Name:     ${newAdmin.name}`);
      console.log(`   Email:    ${newAdmin.email}`);
      console.log(`   Role:     ${newAdmin.role}`);
      if (isGeneratedPassword) {
        console.log(`   Password: ${password}`);
        console.log('   ⚠️  NOTE: Save this generated password securely. It will not be shown again.');
      } else {
        console.log('   Password: [Supplied via command-line / environment]');
      }
      console.log('====================================================');
    }

    await disconnectDB();
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to create administrator:', error.message);
    try {
      await disconnectDB();
    } catch (_) {}
    process.exit(1);
  }
};

run();
