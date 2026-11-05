const nodemailer = require('nodemailer');

const getClientUrl = () => {
  const url = process.env.CLIENT_URL || 'http://localhost:5173';
  return url.replace(/\/+$/, '');
};

const getFromEmail = () => {
  return process.env.FROM_EMAIL || '"SevaSetu Platform" <noreply@sevasetu.org>';
};

let cachedTransporter = null;

const getTransporter = () => {
  if (cachedTransporter) return cachedTransporter;

  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    cachedTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT, 10) || 587,
      secure: process.env.SMTP_SECURE === 'true' || process.env.SMTP_PORT === '465',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  } else {
    // Development / fallback console transport
    cachedTransporter = {
      sendMail: async (options) => {
        console.log('\n================================================================');
        console.log(' [EMAIL DISPATCHED]');
        console.log(` To:      ${options.to}`);
        console.log(` Subject: ${options.subject}`);
        if (options.text) {
          console.log(` Text:    ${options.text.trim()}`);
        }
        console.log('================================================================\n');
        return { messageId: `mock-${Date.now()}` };
      },
    };
  }

  return cachedTransporter;
};

/**
 * Send an email verification link
 */
const sendVerificationEmail = async ({ to, name, token }) => {
  const clientUrl = getClientUrl();
  const verifyUrl = `${clientUrl}/verify-email/${token}`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f7f7f8; color: #1a1a1c; margin: 0; padding: 40px 20px; }
          .container { max-width: 540px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e5e5e7; padding: 40px; }
          .header { font-size: 24px; font-weight: 600; margin-bottom: 16px; color: #111113; }
          .highlight { font-style: italic; }
          p { font-size: 15px; line-height: 1.6; color: #4a4a50; margin: 0 0 20px 0; }
          .button-wrap { margin: 30px 0; }
          .button { display: inline-block; background-color: #111113; color: #ffffff !important; text-decoration: none; font-size: 14px; font-weight: 500; padding: 13px 26px; border-radius: 9999px; }
          .footnote { font-size: 13px; color: #8a8a92; margin-top: 32px; border-top: 1px solid #eeeeef; padding-top: 20px; }
          .break-link { word-break: break-all; color: #5a5a64; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">Verify your <em>email</em>.</div>
          <p>Hi ${name || 'there'},</p>
          <p>Thank you for joining SevaSetu — connecting community members and volunteers for local service and support.</p>
          <p>Please confirm your email address by clicking the button below:</p>
          <div class="button-wrap">
            <a href="${verifyUrl}" class="button" target="_blank">Verify Email Address</a>
          </div>
          <p>This verification link will expire in 24 hours.</p>
          <div class="footnote">
            If the button doesn't work, copy and paste this URL into your browser:<br/>
            <span class="break-link">${verifyUrl}</span>
            <br/><br/>
            If you did not create an account on SevaSetu, you can safely ignore this email.
          </div>
        </div>
      </body>
    </html>
  `;

  const text = `Hi ${name || 'there'},\n\nThank you for joining SevaSetu!\n\nPlease verify your email address by visiting this link (valid for 24 hours):\n${verifyUrl}\n\nIf you did not create an account, you can safely ignore this email.`;

  try {
    const transporter = getTransporter();
    const result = await transporter.sendMail({
      from: getFromEmail(),
      to,
      subject: 'Verify your email address - SevaSetu',
      text,
      html,
    });
    return { success: true, messageId: result.messageId, verifyUrl };
  } catch (error) {
    console.error('[Mailer] Verification email error:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Send a password reset link
 */
const sendPasswordResetEmail = async ({ to, name, token }) => {
  const clientUrl = getClientUrl();
  const resetUrl = `${clientUrl}/reset-password/${token}`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f7f7f8; color: #1a1a1c; margin: 0; padding: 40px 20px; }
          .container { max-width: 540px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e5e5e7; padding: 40px; }
          .header { font-size: 24px; font-weight: 600; margin-bottom: 16px; color: #111113; }
          p { font-size: 15px; line-height: 1.6; color: #4a4a50; margin: 0 0 20px 0; }
          .button-wrap { margin: 30px 0; }
          .button { display: inline-block; background-color: #111113; color: #ffffff !important; text-decoration: none; font-size: 14px; font-weight: 500; padding: 13px 26px; border-radius: 9999px; }
          .footnote { font-size: 13px; color: #8a8a92; margin-top: 32px; border-top: 1px solid #eeeeef; padding-top: 20px; }
          .break-link { word-break: break-all; color: #5a5a64; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">Reset your <em>password</em>.</div>
          <p>Hi ${name || 'there'},</p>
          <p>We received a request to reset the password for your SevaSetu account. Click the button below to choose a new password:</p>
          <div class="button-wrap">
            <a href="${resetUrl}" class="button" target="_blank">Reset Password</a>
          </div>
          <p>This link is single-use and will expire in <strong>1 hour</strong>.</p>
          <div class="footnote">
            If the button doesn't work, copy and paste this URL into your browser:<br/>
            <span class="break-link">${resetUrl}</span>
            <br/><br/>
            If you did not request a password reset, no action is needed — your account is safe and your password has not been changed.
          </div>
        </div>
      </body>
    </html>
  `;

  const text = `Hi ${name || 'there'},\n\nWe received a request to reset your password on SevaSetu.\n\nPlease reset your password within 1 hour by visiting:\n${resetUrl}\n\nIf you did not request this, you can safely ignore this email.`;

  try {
    const transporter = getTransporter();
    const result = await transporter.sendMail({
      from: getFromEmail(),
      to,
      subject: 'Reset your password - SevaSetu',
      text,
      html,
    });
    return { success: true, messageId: result.messageId, resetUrl };
  } catch (error) {
    console.error('[Mailer] Password reset email error:', error.message);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail,
};
