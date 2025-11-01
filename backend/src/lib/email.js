/**
 * Email Service
 * Handles sending verification emails and other transactional emails
 */

import crypto from 'crypto';

// Email service configuration
const EMAIL_CONFIG = {
  // For now, we'll use a simple email service
  // In production, integrate with Resend, SendGrid, AWS SES, etc.
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:8080',
  FROM_EMAIL: process.env.FROM_EMAIL || 'noreply@citaversa.com',
  FROM_NAME: process.env.FROM_NAME || 'Citaversa'
};

/**
 * Generates a secure verification token
 * @returns {string} A cryptographically secure random token
 */
export const generateVerificationToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

/**
 * Generates verification token expiry (24 hours from now)
 * @returns {Date} Expiry date
 */
export const getVerificationTokenExpiry = () => {
  return new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
};

/**
 * Creates the verification email HTML content
 * @param {string} name - User's name (optional)
 * @param {string} verificationUrl - Full verification URL
 * @returns {string} HTML email content
 */
const createVerificationEmailHTML = (name, verificationUrl) => {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify Your Email</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 28px;">Verify Your Email</h1>
  </div>
  
  <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
    <p style="font-size: 16px; margin-bottom: 20px;">
      ${name ? `Hi ${name},` : 'Hi there,'}
    </p>
    
    <p style="font-size: 16px; margin-bottom: 20px;">
      Thank you for signing up! Please verify your email address to complete your registration.
    </p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${verificationUrl}" 
         style="display: inline-block; background: #667eea; color: white; text-decoration: none; padding: 14px 28px; border-radius: 6px; font-weight: 600; font-size: 16px;">
        Verify Email Address
      </a>
    </div>
    
    <p style="font-size: 14px; color: #6b7280; margin-top: 30px; margin-bottom: 10px;">
      Or copy and paste this link into your browser:
    </p>
    <p style="font-size: 12px; color: #9ca3af; word-break: break-all; background: #f9fafb; padding: 10px; border-radius: 4px; margin: 0;">
      ${verificationUrl}
    </p>
    
    <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
      This link will expire in 24 hours. If you didn't create an account, you can safely ignore this email.
    </p>
  </div>
  
  <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #9ca3af;">
    <p>This email was sent from ${EMAIL_CONFIG.FROM_NAME}</p>
  </div>
</body>
</html>
  `.trim();
};

/**
 * Creates the verification email plain text content
 * @param {string} name - User's name (optional)
 * @param {string} verificationUrl - Full verification URL
 * @returns {string} Plain text email content
 */
const createVerificationEmailText = (name, verificationUrl) => {
  return `
${name ? `Hi ${name},` : 'Hi there,'}

Thank you for signing up! Please verify your email address to complete your registration.

Click this link to verify your email:
${verificationUrl}

This link will expire in 24 hours. If you didn't create an account, you can safely ignore this email.

${EMAIL_CONFIG.FROM_NAME}
  `.trim();
};

/**
 * Sends a verification email
 * @param {string} email - Recipient email address
 * @param {string} token - Verification token
 * @param {string} name - User's name (optional)
 * @returns {Promise<void>}
 */
export const sendVerificationEmail = async (email, token, name = null) => {
  // Build verification URL
  const verificationUrl = `${EMAIL_CONFIG.FRONTEND_URL}/#/verify-email?token=${token}`;
  
  const html = createVerificationEmailHTML(name, verificationUrl);
  const text = createVerificationEmailText(name, verificationUrl);
  
  // For development: log the email instead of actually sending
  if (process.env.NODE_ENV !== 'production' || !process.env.EMAIL_SERVICE_ENABLED) {
    console.log('\n=== VERIFICATION EMAIL ===');
    console.log(`To: ${email}`);
    console.log(`From: ${EMAIL_CONFIG.FROM_NAME} <${EMAIL_CONFIG.FROM_EMAIL}>`);
    console.log(`Subject: Verify Your Email Address`);
    console.log(`\nVerification URL: ${verificationUrl}`);
    console.log('==========================\n');
    return;
  }
  
  // TODO: Integrate with actual email service (Resend, SendGrid, AWS SES, etc.)
  // Example with Resend:
  // const resend = new Resend(process.env.RESEND_API_KEY);
  // await resend.emails.send({
  //   from: `${EMAIL_CONFIG.FROM_NAME} <${EMAIL_CONFIG.FROM_EMAIL}>`,
  //   to: email,
  //   subject: 'Verify Your Email Address',
  //   html,
  //   text
  // });
  
  // For now, in production without email service, log the URL
  console.log(`[Email Service] Verification email would be sent to ${email}`);
  console.log(`[Email Service] Verification URL: ${verificationUrl}`);
};

/**
 * Sends a password reset email (placeholder for future implementation)
 * @param {string} email - Recipient email address
 * @param {string} token - Reset token
 * @param {string} name - User's name (optional)
 * @returns {Promise<void>}
 */
export const sendPasswordResetEmail = async (email, token, name = null) => {
  // Placeholder - implement when password reset is needed
  console.log(`[Email Service] Password reset email would be sent to ${email}`);
};

