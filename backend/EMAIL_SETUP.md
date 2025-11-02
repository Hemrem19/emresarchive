# Email Service Setup Guide

This guide explains how to configure email sending for verification emails in citavErs.

## Available Email Services

The application supports three email service types:

1. **Resend** (Recommended) - Modern API-based email service
2. **SMTP** - Any SMTP server (Gmail, SendGrid, etc.)
3. **Log** - Development mode (logs emails to console)

## Option 1: Resend (Recommended)

Resend is a modern, developer-friendly email API service.

### Setup Steps:

1. **Create a Resend account:**
   - Go to https://resend.com
   - Sign up for a free account
   - Free tier: 3,000 emails/month, 100 emails/day

2. **Create an API key:**
   - Go to https://resend.com/api-keys
   - Click "Create API Key"
   - Name it (e.g., "citavErs Production")
   - Copy the API key (starts with `re_`)

3. **Verify your domain (recommended):**
   - Go to https://resend.com/domains
   - Add your domain (e.g., `citavers.com`)
   - Add the DNS records provided by Resend
   - Wait for verification (can take a few minutes to hours)

4. **Set Railway environment variables:**
   ```
   EMAIL_SERVICE_TYPE=resend
   RESEND_API_KEY=re_your_api_key_here
   EMAIL_FROM=noreply@noreply.citavers.com  # Use your verified domain from Resend dashboard
   EMAIL_FROM_NAME=Citavers
   
   # Note: If you verified "noreply.citavers.com" in Resend:
   # - You can use: noreply@noreply.citavers.com
   # - Or: anything@noreply.citavers.com (any address on your verified domain)
   # - If sending subdomain is configured: use send.noreply.citavers.com format
   ```

5. **Test the setup:**
   - Register a new user
   - Check your email inbox (and spam folder)
   - You should receive a verification email

### Resend Pricing:
- **Free**: 3,000 emails/month, 100/day
- **Pro ($20/mo)**: 50,000 emails/month
- **Business**: Custom pricing

## Option 2: SMTP (Any SMTP Server)

Works with any SMTP provider: Gmail, SendGrid, Mailgun, AWS SES, etc.

### Setup Steps:

1. **Choose an SMTP provider:**
   - **Gmail**: Use App Password (free)
   - **SendGrid**: Free tier available
   - **Mailgun**: Free tier available
   - **AWS SES**: Pay-as-you-go

2. **Get SMTP credentials:**
   - **Gmail**: 
     - Enable 2-factor authentication
     - Generate App Password: https://myaccount.google.com/apppasswords
   - **SendGrid**: 
     - Create API Key: https://app.sendgrid.com/settings/api_keys
     - Use SMTP Relay settings

3. **Set Railway environment variables:**
   ```
   EMAIL_SERVICE_TYPE=smtp
   SMTP_HOST=smtp.gmail.com  # or your SMTP host
   SMTP_PORT=587  # or 465 for SSL
   SMTP_USER=your-email@gmail.com  # or API username
   SMTP_PASS=your-app-password  # or API key
   SMTP_SECURE=false  # true for port 465, false for 587
   EMAIL_FROM=noreply@citavers.com
   EMAIL_FROM_NAME=Citavers
   ```

### Example SMTP Configurations:

**Gmail:**
```
EMAIL_SERVICE_TYPE=smtp
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-16-char-app-password
SMTP_SECURE=false
EMAIL_FROM=your-email@gmail.com
EMAIL_FROM_NAME=Citavers
```

**SendGrid:**
```
EMAIL_SERVICE_TYPE=smtp
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key
SMTP_SECURE=false
EMAIL_FROM=noreply@yourdomain.com
EMAIL_FROM_NAME=Citavers
```

**Mailgun:**
```
EMAIL_SERVICE_TYPE=smtp
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_USER=postmaster@yourdomain.mailgun.org
SMTP_PASS=your-mailgun-password
SMTP_SECURE=false
EMAIL_FROM=noreply@yourdomain.com
EMAIL_FROM_NAME=Citavers
```

## Option 3: Log Mode (Development)

In development, emails are logged to the console instead of being sent.

**Set Railway environment variable:**
```
EMAIL_SERVICE_TYPE=log
```

**Or don't set email service variables** - it defaults to log mode.

## Railway Environment Variables Summary

### For Resend:
```
EMAIL_SERVICE_TYPE=resend
RESEND_API_KEY=re_your_api_key_here
EMAIL_FROM=noreply@citavers.com
EMAIL_FROM_NAME=Citavers
```

### For SMTP:
```
EMAIL_SERVICE_TYPE=smtp
SMTP_HOST=your-smtp-host.com
SMTP_PORT=587
SMTP_USER=your-username
SMTP_PASS=your-password
SMTP_SECURE=false
EMAIL_FROM=noreply@citavers.com
EMAIL_FROM_NAME=Citavers
```

### For Development/Logging:
```
EMAIL_SERVICE_TYPE=log
# Or simply don't set email variables
```

## Testing Email Configuration

1. **Register a new user** on your application
2. **Check the Railway logs** for email sending status
3. **Check your email inbox** (and spam folder)
4. **Verify the verification link works** by clicking it

## Troubleshooting

### Emails not being sent:
1. Check Railway logs for error messages
2. Verify all environment variables are set correctly
3. For Resend: Check API key is valid and domain is verified
4. For SMTP: Verify credentials and firewall/security settings
5. Check spam folder - emails might be filtered

### "RESEND_API_KEY is required" error:
- Make sure `RESEND_API_KEY` is set in Railway
- Check the API key starts with `re_`
- Verify the key hasn't expired

### "SMTP credentials required" error:
- Make sure all SMTP variables are set: `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`
- For Gmail: Make sure you're using an App Password, not your regular password
- Verify SMTP port and secure settings match your provider

### Email domain not verified (Resend):
- You can use Resend without domain verification, but emails come from `onboarding@resend.dev`
- To use your domain, verify it in Resend dashboard
- Set `EMAIL_FROM` to your verified domain email

## Security Best Practices

1. **Never commit API keys or passwords to Git**
2. **Use Railway environment variables** (they're encrypted)
3. **Use App Passwords for Gmail** (not your regular password)
4. **Rotate API keys periodically**
5. **Monitor email sending** for unusual activity
6. **Set up email sending limits** to prevent abuse

## Next Steps

After setting up email:
1. Test registration and email verification flow
2. Monitor email delivery rates
3. Set up email sending alerts/monitoring
4. Consider setting up email templates in your email service dashboard

