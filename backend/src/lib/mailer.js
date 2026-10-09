/**
 * Worker-native transactional email (Resend over fetch).
 *
 * Reads config from the Worker env, not process.env:
 *   RESEND_API_KEY   – required to actually send; without it emails are only logged
 *   EMAIL_FROM       – verified sender address (default onboarding@resend.dev)
 *   EMAIL_FROM_NAME  – sender name (default Citavers)
 *   FRONTEND_URL     – base URL for links (default https://citavers.com)
 *
 * lib/email.js is the legacy Node/Express version kept for the old controllers.
 */

export const VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

export function generateVerificationToken() {
    const bytes = crypto.getRandomValues(new Uint8Array(32));
    return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[ch]));

function verificationEmail(name, url, fromName) {
    const greeting = name ? `Hi ${name},` : 'Hi there,';
    const text = `${greeting}

Thank you for signing up! Please verify your email address to complete your registration.

Click this link to verify your email:
${url}

This link will expire in 24 hours. If you didn't create an account, you can safely ignore this email.

${fromName}`;

    const html = `<!DOCTYPE html>
<html><body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h1 style="font-size: 24px;">Verify your email</h1>
  <p>${escapeHtml(greeting)}</p>
  <p>Thank you for signing up! Please verify your email address to complete your registration.</p>
  <p style="text-align: center; margin: 30px 0;">
    <a href="${escapeHtml(url)}" style="display: inline-block; background: #3b82f6; color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600;">Verify Email Address</a>
  </p>
  <p style="font-size: 13px; color: #6b7280;">Or paste this link into your browser:<br><span style="word-break: break-all;">${escapeHtml(url)}</span></p>
  <p style="font-size: 13px; color: #6b7280;">This link will expire in 24 hours. If you didn't create an account, you can safely ignore this email.</p>
</body></html>`;

    return { subject: 'Verify Your Email Address', text, html };
}

const EMAIL_RE = /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/;

/**
 * Accepts EMAIL_FROM as "a@b.c" or "Name <a@b.c>", tolerating quotes and
 * stray whitespace from secret entry. Returns { name?, email }.
 */
export function parseFromAddress(raw) {
    const value = String(raw || '').trim().replace(/^["']+|["']+$/g, '').trim();
    const match = value.match(/^(.*?)\s*<\s*([^>]+?)\s*>$/);
    const name = match?.[1].replace(/["']/g, '').trim() || undefined;
    const email = (match ? match[2] : value).trim();
    if (!EMAIL_RE.test(email)) {
        throw new Error('EMAIL_FROM must look like "noreply@example.com" or "Name <noreply@example.com>"');
    }
    return { name, email };
}

/**
 * @returns {Promise<{ sent: boolean }>} sent=false when no RESEND_API_KEY (log mode)
 */
export async function sendVerificationEmail(env, { email, token, name }) {
    const frontendUrl = (env.FRONTEND_URL || 'https://citavers.com').trim().replace(/\/$/, '');
    const sender = parseFromAddress(env.EMAIL_FROM || 'onboarding@resend.dev');
    const fromName = (env.EMAIL_FROM_NAME || sender.name || 'Citavers').replace(/[<>"]/g, '').trim();
    const fromEmail = sender.email;
    const url = `${frontendUrl}/#/verify-email?token=${token}`;
    const message = verificationEmail(name, url, fromName);

    if (!env.RESEND_API_KEY) {
        console.warn(`[mailer] RESEND_API_KEY not set; verification email for user not sent`);
        return { sent: false };
    }

    const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ from: `${fromName} <${fromEmail}>`, to: email, ...message }),
    });
    if (!res.ok) {
        throw new Error(`Resend API error ${res.status}: ${await res.text().catch(() => '')}`);
    }
    return { sent: true };
}
