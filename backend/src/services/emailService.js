const nodemailer = require('nodemailer');
const env = require('../config/env');

class EmailService {
  constructor() {
    this.transporter = null;
    this.initTransporter();
  }

  initTransporter() {
    // If SMTP host and user are provided, configure real SMTP transport
    if (env.EMAIL_HOST && env.EMAIL_USER && env.EMAIL_PASS) {
      const user = env.EMAIL_USER.trim();
      const pass = env.EMAIL_PASS.trim();
      const host = env.EMAIL_HOST.trim().toLowerCase();
      const isGmail = host.includes('gmail');

      if (isGmail) {
        // Use Nodemailer's built-in Gmail service to prevent Render cloud port 587 STARTTLS timeouts
        this.transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user,
            pass,
          },
          family: 4,
          connectionTimeout: 4000,
          greetingTimeout: 4000,
          socketTimeout: 5000,
        });
      } else {
        const isSecure = env.EMAIL_SECURE || env.EMAIL_PORT === 465;

        this.transporter = nodemailer.createTransport({
          host: env.EMAIL_HOST.trim(),
          port: env.EMAIL_PORT,
          secure: isSecure, // true for 465, false for 587 / STARTTLS
          auth: {
            user,
            pass,
          },
          family: 4,
          connectionTimeout: 4000,
          greetingTimeout: 4000,
          socketTimeout: 5000,
        });
      }
    } else {
      // In development or test without configured SMTP credentials, use a stub/stream transport
      this.transporter = nodemailer.createTransport({
        streamTransport: true,
        newline: 'unix',
        buffer: true,
      });
    }
  }

  /**
   * Set custom transporter (primarily for test mocking)
   */
  setTransporter(customTransporter) {
    this.transporter = customTransporter;
  }

  /**
   * Dispatch email via Resend HTTPS REST API (Bypasses cloud hosting SMTP port 465/587 blocks)
   */
  async sendViaResend({ to, subject, text, html }) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY.trim()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'TaskFlow Pro <onboarding@resend.dev>',
        to: [to],
        subject,
        text,
        html,
      }),
    });

    if (!res.ok) {
      const errData = await res.text();
      throw new Error(`Resend API error (${res.status}): ${errData}`);
    }

    return await res.json();
  }

  /**
   * Dispatch email via Brevo HTTPS REST API (Free 300 emails/day, bypasses cloud hosting SMTP blocks)
   */
  async sendViaBrevo({ to, name, subject, text, html }) {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': env.BREVO_API_KEY.trim(),
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        sender: {
          name: 'TaskFlow Pro',
          email: env.EMAIL_USER || 'pasangya.tarun@gmail.com',
        },
        to: [{ email: to, name: name || 'User' }],
        subject,
        htmlContent: html,
        textContent: text,
      }),
    });

    if (!res.ok) {
      const errData = await res.text();
      throw new Error(`Brevo API error (${res.status}): ${errData}`);
    }

    return await res.json();
  }

  /**
   * Send 6-digit OTP verification email
   * @param {Object} options
   * @param {string} options.to - Recipient email
   * @param {string} options.name - Recipient user name
   * @param {string} options.otp - Six digit OTP code
   * @param {number} [options.expiresInMinutes=10]
   */
  async sendOtpEmail({ to, name, otp, expiresInMinutes = 10 }) {
    const subject = `Your Verification Code: ${otp} - TaskFlow Pro`;

    const textContent = `Hello ${name || 'User'},

Thank you for registering with TaskFlow Pro.

Your verification code is: ${otp}

This code will expire in ${expiresInMinutes} minutes. If you did not create an account, please safely ignore this email.

Best regards,
The TaskFlow Pro Team`;

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0f19; color: #f8fafc; margin: 0; padding: 20px; }
    .card { max-width: 500px; margin: 0 auto; background: #1e293b; border-radius: 12px; padding: 32px; border: 1px solid rgba(255,255,255,0.1); }
    .brand { font-size: 22px; font-weight: 800; color: #6366f1; margin-bottom: 20px; }
    .title { font-size: 18px; font-weight: 600; margin-bottom: 12px; color: #f8fafc; }
    .message { font-size: 14px; color: #94a3b8; line-height: 1.6; margin-bottom: 24px; }
    .otp-box { background: rgba(99, 102, 241, 0.15); border: 1px solid #6366f1; border-radius: 8px; padding: 16px; text-align: center; margin-bottom: 24px; }
    .otp-code { font-family: 'Courier New', Courier, monospace; font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #ffffff; }
    .note { font-size: 12px; color: #64748b; line-height: 1.5; }
  </style>
</head>
<body>
  <div class="card">
    <div class="brand">TaskFlow<span style="color:#ec4899">Pro</span></div>
    <div class="title">Verify Your Email Address</div>
    <div class="message">
      Hello <strong>${name || 'User'}</strong>,<br><br>
      Please enter the verification code below to confirm your email and activate your account.
    </div>
    <div class="otp-box">
      <div class="otp-code">${otp}</div>
    </div>
    <div class="message">
      This code is valid for <strong>${expiresInMinutes} minutes</strong>. For security, never share this code with anyone.
    </div>
    <div class="note">
      If you did not request this email, no further action is required and you can safely disregard it.
    </div>
  </div>
</body>
</html>
    `;

    try {
      if (env.BREVO_API_KEY && process.env.NODE_ENV !== 'test') {
        return await this.sendViaBrevo({ to, subject, text: textContent, html: htmlContent });
      }

      if (env.RESEND_API_KEY && process.env.NODE_ENV !== 'test') {
        return await this.sendViaResend({ to, subject, text: textContent, html: htmlContent });
      }

      const mailOptions = {
        from: env.EMAIL_FROM,
        to,
        subject,
        text: textContent,
        html: htmlContent,
      };

      const info = await this.transporter.sendMail(mailOptions);
      return info;
    } catch (error) {
      console.error(`Failed to dispatch verification email to ${to}:`, error.message);

      const isConnectionIssue =
        error.message?.includes('timeout') ||
        error.code === 'ETIMEDOUT' ||
        error.code === 'ECONNECTION' ||
        error.code === 'ESOCKET';

      if (isConnectionIssue && process.env.NODE_ENV !== 'test') {
        console.warn('================================================================================');
        console.warn('[Render Cloud Alert]: Outbound SMTP port blocked by cloud hosting firewall.');
        console.warn(`[Generated Verification OTP for ${to}]: ${otp}`);
        console.warn('================================================================================');
        return { messageId: 'cloud-fallback-otp-logged', otp };
      }

      const deliveryError = new Error('Failed to send verification email. Please check SMTP settings or try again.');
      deliveryError.statusCode = 502;
      deliveryError.originalError = error;
      throw deliveryError;
    }
  }

  /**
   * Send password reset email with secure link
   * @param {Object} options
   * @param {string} options.to - Recipient email
   * @param {string} options.name - Recipient user name
   * @param {string} options.resetUrl - Full reset password link
   * @param {number} [options.expiresInMinutes=15]
   */
  async sendPasswordResetEmail({ to, name, resetUrl, expiresInMinutes = 15 }) {
    const subject = 'Reset Your Task Manager Password';

    const textContent = `Hello ${name || 'User'},

We received a request to reset the password for your TaskFlow Pro account.

To set a new password, please visit the following link:
${resetUrl}

This link is valid for ${expiresInMinutes} minutes and can only be used once.

If you did not request a password reset, please safely ignore this email. Your password will remain unchanged.

Best regards,
The TaskFlow Pro Team`;

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0f19; color: #f8fafc; margin: 0; padding: 20px; }
    .card { max-width: 520px; margin: 0 auto; background: #1e293b; border-radius: 12px; padding: 32px; border: 1px solid rgba(255,255,255,0.1); }
    .brand { font-size: 22px; font-weight: 800; color: #6366f1; margin-bottom: 20px; }
    .title { font-size: 18px; font-weight: 600; margin-bottom: 12px; color: #f8fafc; }
    .message { font-size: 14px; color: #94a3b8; line-height: 1.6; margin-bottom: 24px; }
    .btn-container { text-align: center; margin: 28px 0; }
    .btn { display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%); color: #ffffff !important; padding: 14px 28px; font-size: 14px; font-weight: 600; text-decoration: none; border-radius: 8px; box-shadow: 0 4px 14px rgba(99, 102, 241, 0.4); }
    .link-fallback { font-size: 12px; color: #64748b; word-break: break-all; margin-top: 16px; line-height: 1.5; }
    .note { font-size: 12px; color: #94a3b8; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 18px; margin-top: 24px; line-height: 1.5; }
  </style>
</head>
<body>
  <div class="card">
    <div class="brand">TaskFlow<span style="color:#ec4899">Pro</span></div>
    <div class="title">Reset Your Task Manager Password</div>
    <div class="message">
      Hello <strong>${name || 'User'}</strong>,<br><br>
      We received a request to reset the password for your account. Click the button below to choose a new password:
    </div>
    <div class="btn-container">
      <a href="${resetUrl}" class="btn" target="_blank" rel="noopener noreferrer">Reset My Password</a>
    </div>
    <div class="message" style="margin-bottom: 8px;">
      This link will expire in <strong>${expiresInMinutes} minutes</strong> and can only be used once.
    </div>
    <div class="link-fallback">
      If the button above does not work, copy and paste this link into your browser:<br>
      <a href="${resetUrl}" style="color: #818cf8;">${resetUrl}</a>
    </div>
    <div class="note">
      If you did not request a password reset, you can safely ignore this email. Your account remains secure and no changes will be made.
    </div>
  </div>
</body>
</html>
    `;

    try {
      if (env.BREVO_API_KEY && process.env.NODE_ENV !== 'test') {
        return await this.sendViaBrevo({ to, name, subject, text: textContent, html: htmlContent });
      }

      if (env.RESEND_API_KEY && process.env.NODE_ENV !== 'test') {
        return await this.sendViaResend({ to, subject, text: textContent, html: htmlContent });
      }

      const mailOptions = {
        from: env.EMAIL_FROM,
        to,
        subject,
        text: textContent,
        html: htmlContent,
      };

      const info = await this.transporter.sendMail(mailOptions);
      return info;
    } catch (error) {
      console.error(`Failed to dispatch password reset email to ${to}:`, error.message);

      const isConnectionIssue =
        error.message?.includes('timeout') ||
        error.code === 'ETIMEDOUT' ||
        error.code === 'ECONNECTION' ||
        error.code === 'ESOCKET';

      if (isConnectionIssue && process.env.NODE_ENV !== 'test') {
        console.warn('================================================================================');
        console.warn('[Render Cloud Alert]: Outbound SMTP port blocked by cloud hosting firewall.');
        console.warn(`[Generated Password Reset Link for ${to}]:`);
        console.warn(`${resetUrl}`);
        console.warn('================================================================================');
        return { messageId: 'cloud-fallback-link-logged', resetUrl };
      }

      const deliveryError = new Error('Failed to send password reset email. Please check SMTP settings or try again later.');
      deliveryError.statusCode = 502;
      deliveryError.originalError = error;
      throw deliveryError;
    }
  }
}

module.exports = new EmailService();
