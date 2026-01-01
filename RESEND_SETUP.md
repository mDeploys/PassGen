# Resend Email Service Setup Guide

PassGen now uses [Resend](https://resend.com) for sending activation request emails to `activation@mdeploy.dev` when users click "Request Activation" after payment.

## Quick Setup

### 1. Get Your Resend API Key

1. Go to [resend.com](https://resend.com) and sign up or log in
2. Navigate to **API Keys** in the dashboard
3. Click **Create API Key**
4. Give it a name (e.g., "PassGen Activation Emails")
5. Copy the API key (starts with `re_...`)

### 2. Configure the App

Add your Resend API key to the `.env` file in the project root:

```env
RESEND_API_KEY=re_your_api_key_here
```

### 3. Verify Domain (Optional but Recommended)

For production, verify your domain in Resend to avoid spam filters:

1. In Resend dashboard, go to **Domains**
2. Click **Add Domain**
3. Follow the DNS configuration steps
4. Update the `from` field in `electron/main.ts` to use your verified domain:
   ```typescript
   from: 'PassGen <activation@mdeploy.dev>',
   ```

## How It Works

When a user:
1. Pays via PayPal or crypto
2. Fills in their email in the Upgrade modal
3. Clicks "Request Activation"

The app sends a formatted email to `activation@mdeploy.dev` with:
- Install/Request ID
- User's email
- Payment plan ($15 / 6 months)
- Timestamp

### Email Format

The email is sent with both HTML and plain text versions:

**HTML version** includes a nicely formatted table with:
- User details
- Request ID for tracking
- Payment information

**Plain text version** is a fallback for email clients that don't support HTML.

### Fallback Behavior

If `RESEND_API_KEY` is not set:
- Opens the user's default email client (mailto: link)
- Pre-fills the email to `activation@mdeploy.dev`
- Includes all activation request details

This ensures users can always request activation even without the API key configured.

## Activation Dashboard

Once emails are being sent, you can manage activations using the built-in dashboard:

### Setup Dashboard
1. Install additional dependencies: `npm install express resend`
2. Run the dashboard: `npm run dashboard` or `start-dashboard.bat`
3. Open http://localhost:3001 in your browser

### Dashboard Features
- 📊 View real-time statistics (total requests, pending, activated, revenue)
- 📋 Manage activation requests with one-click activation
- ✅ Generate activation codes automatically
- 📧 Send activation emails to users
- 🔍 Track payment methods and user details
- 💰 Monitor revenue from premium activations

### Database Setup
The dashboard requires Supabase. Run the SQL schema from `supabase-schema.sql` in your Supabase dashboard to create the necessary tables.

## Pricing

- **Free tier**: 3,000 emails/month
- **Pro tier**: $20/month for 50,000 emails
- [View pricing](https://resend.com/pricing)

For PassGen's use case, the free tier is more than sufficient.

## Support

- [Resend Documentation](https://resend.com/docs)
- [Resend API Reference](https://resend.com/docs/api-reference/emails/send-email)
- [Node.js SDK](https://github.com/resendlabs/resend-node)

## Security Notes

⚠️ **Never commit your API key to Git!**

The `.env` file should be in `.gitignore` (already configured in this project).

For production deployment, set the `RESEND_API_KEY` environment variable through your deployment platform (e.g., Vercel, Netlify, etc.) or via system environment variables.
