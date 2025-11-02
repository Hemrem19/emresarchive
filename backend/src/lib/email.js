/**
 * Email Service
 * Handles sending verification emails and other transactional emails
 * Supports Resend API and SMTP (via Nodemailer)
 */

import crypto from 'crypto';

// Email service configuration
const EMAIL_CONFIG = {
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:8080',
  FROM_EMAIL: process.env.EMAIL_FROM || process.env.FROM_EMAIL || 'noreply@citavers.com',
  FROM_NAME: process.env.EMAIL_FROM_NAME || process.env.FROM_NAME || 'Citavers',
  // Service type: 'resend', 'smtp', or 'log' (for development)
  SERVICE_TYPE: process.env.EMAIL_SERVICE_TYPE || 'log',
  // Resend API key (if using Resend)
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  // SMTP configuration (if using SMTP)
  SMTP_HOST: process.env.SMTP_HOST,
  SMTP_PORT: parseInt(process.env.SMTP_PORT || '587', 10),
  SMTP_USER: process.env.SMTP_USER,
  SMTP_PASS: process.env.SMTP_PASS,
  SMTP_SECURE: process.env.SMTP_SECURE === 'true' || process.env.SMTP_PORT === '465'
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
 * Sends a verification email using the configured email service
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
  const subject = 'Verify Your Email Address';
  const from = `${EMAIL_CONFIG.FROM_NAME} <${EMAIL_CONFIG.FROM_EMAIL}>`;
  
  // Determine which service to use
  const serviceType = EMAIL_CONFIG.SERVICE_TYPE.toLowerCase();
  
  // Log mode (development or no service configured)
  if (serviceType === 'log' || (!EMAIL_CONFIG.RESEND_API_KEY && !EMAIL_CONFIG.SMTP_HOST)) {
    console.log('\n=== VERIFICATION EMAIL (LOG MODE) ===');
    console.log(`To: ${email}`);
    console.log(`From: ${from}`);
    console.log(`Subject: ${subject}`);
    console.log(`\nVerification URL: ${verificationUrl}`);
    console.log('=====================================\n');
    return;
  }
  
  try {
    if (serviceType === 'resend') {
      // Use Resend API
      if (!EMAIL_CONFIG.RESEND_API_KEY) {
        throw new Error('RESEND_API_KEY environment variable is required for Resend service');
      }
      
      // Dynamic import to avoid requiring it if not used
      const { Resend } = await import('resend');
      const resend = new Resend(EMAIL_CONFIG.RESEND_API_KEY);
      
      const result = await resend.emails.send({
        from: from,
        to: email,
        subject: subject,
        html: html,
        text: text
      });
      
      if (result.error) {
        throw new Error(`Resend API error: ${result.error.message}`);
      }
      
      console.log(`✅ Verification email sent via Resend to ${email}`);
      return;
      
    } else if (serviceType === 'smtp') {
      // Use SMTP via Nodemailer
      if (!EMAIL_CONFIG.SMTP_HOST || !EMAIL_CONFIG.SMTP_USER || !EMAIL_CONFIG.SMTP_PASS) {
        throw new Error('SMTP_HOST, SMTP_USER, and SMTP_PASS environment variables are required for SMTP service');
      }
      
      // Dynamic import to avoid requiring it if not used
      const nodemailer = await import('nodemailer');
      
      const transporter = nodemailer.createTransport({
        host: EMAIL_CONFIG.SMTP_HOST,
        port: EMAIL_CONFIG.SMTP_PORT,
        secure: EMAIL_CONFIG.SMTP_SECURE, // true for 465, false for other ports
        auth: {
          user: EMAIL_CONFIG.SMTP_USER,
          pass: EMAIL_CONFIG.SMTP_PASS
        }
      });
      
      const info = await transporter.sendMail({
        from: from,
        to: email,
        subject: subject,
        text: text,
        html: html
      });
      
      console.log(`✅ Verification email sent via SMTP to ${email} (Message ID: ${info.messageId})`);
      return;
      
    } else {
      throw new Error(`Unknown email service type: ${serviceType}. Use 'resend', 'smtp', or 'log'`);
    }
    
  } catch (error) {
    console.error('❌ Failed to send verification email:', error.message);
    console.error(`   Email was supposed to go to: ${email}`);
    console.error(`   Verification URL: ${verificationUrl}`);
    // Don't throw - user registration should still succeed
    // Email can be resent later
    throw error;
  }
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

