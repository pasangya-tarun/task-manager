/**
 * Diagnostic Script: Test SMTP Connection & Email Delivery
 *
 * Usage:
 *   node src/scripts/testSmtp.js [optional_recipient_email]
 *
 * Example:
 *   node src/scripts/testSmtp.js
 *   node src/scripts/testSmtp.js myemail@gmail.com
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const nodemailer = require('nodemailer');

async function test() {
  console.log('\n\x1b[34m=== SMTP Configuration Check ===\x1b[0m');
  console.log('Host:       ', process.env.EMAIL_HOST || '(not set)');
  console.log('Port:       ', process.env.EMAIL_PORT || '(not set)');
  console.log('Secure:     ', process.env.EMAIL_SECURE || 'false');
  console.log('User:       ', process.env.EMAIL_USER || '(not set)');
  console.log('Pass Length:', process.env.EMAIL_PASS ? `${process.env.EMAIL_PASS.length} chars` : '(not set)');
  console.log('From:       ', process.env.EMAIL_FROM || '(not set)');

  if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.error('\n\x1b[31mError: Incomplete SMTP configuration in backend/.env\x1b[0m');
    console.log('Please ensure EMAIL_HOST, EMAIL_PORT, EMAIL_USER, and EMAIL_PASS are set.');
    process.exit(1);
  }

  const isSecure = process.env.EMAIL_SECURE === 'true' || process.env.EMAIL_PORT === '465';

  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT) || 587,
    secure: isSecure,
    auth: {
      user: process.env.EMAIL_USER.trim(),
      pass: process.env.EMAIL_PASS.trim(),
    },
    // Force IPv4 to avoid IPv6 routing delays on local Wi-Fi
    family: 4,
    tls: {
      rejectUnauthorized: true,
    },
  });

  console.log('\n\x1b[34mTesting connection to SMTP server...\x1b[0m');

  try {
    await transporter.verify();
    console.log('\x1b[32m✔ SMTP Transporter authentication SUCCEEDED!\x1b[0m');

    const recipient = process.argv[2] || process.env.EMAIL_USER;
    console.log(`\nAttempting to send a test email to \x1b[36m${recipient}\x1b[0m...`);

    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: recipient,
      subject: 'TaskFlow Pro — SMTP Verification Test',
      text: 'This is a test email confirming your SMTP configuration is working correctly.',
      html: '<h3>TaskFlow Pro</h3><p>Your SMTP credentials are configured and functioning properly!</p>',
    });

    console.log('\x1b[32m✔ Test email dispatched successfully!\x1b[0m');
    console.log('Message ID:', info.messageId);
    console.log('Accepted recipients:', info.accepted);
  } catch (error) {
    console.error('\n\x1b[31m✖ SMTP Connection Failed:\x1b[0m');
    console.error('Error Code:    ', error.code || 'N/A');
    console.error('Response Code: ', error.responseCode || 'N/A');
    console.error('Error Message: ', error.message);

    if (error.code === 'EAUTH') {
      console.log('\n\x1b[33m--- Troubleshooting EAUTH (Bad Credentials) ---\x1b[0m');
      console.log('1. Verify 2-Step Verification is turned ON for the Google account.');
      console.log('2. Ensure you are using a 16-character Google App Password (not your normal Gmail password).');
      console.log('3. Confirm that the App Password was generated for the EXACT account specified in EMAIL_USER:');
      console.log(`   -> Current EMAIL_USER: ${process.env.EMAIL_USER}`);
      console.log('4. App passwords can be generated at: https://myaccount.google.com/apppasswords');
      console.log('------------------------------------------------');
    }
    process.exit(1);
  }
}

test();
