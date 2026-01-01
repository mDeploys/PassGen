# Supabase Edge Functions Setup

This directory contains Supabase Edge Functions for PassGen activation management.

## Setup

1. Install Supabase CLI:
```bash
npm install -g supabase
```

2. Login to Supabase:
```bash
supabase login
```

3. Link to your project:
```bash
supabase link --project-ref ylzxeyqlqvziwnradcmy
```

## Deploy Edge Functions

To deploy the activation-request function:

```bash
supabase functions deploy activation-request
```

## Environment Variables

Make sure these environment variables are set in your Supabase project:

- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_ANON_KEY`: Your Supabase anon key
- `DISCORD_WEBHOOK_URL`: Discord webhook URL for notifications

You can set them using:

```bash
supabase secrets set SUPABASE_URL="https://ylzxeyqlqvziwnradcmy.supabase.co"
supabase secrets set SUPABASE_ANON_KEY="your-anon-key"
supabase secrets set DISCORD_WEBHOOK_URL="your-webhook-url"
```

## Testing Locally

To test the Edge Function locally:

```bash
supabase start
supabase functions serve activation-request
```

Then test with:
```bash
curl -X POST http://localhost:54321/functions/v1/activation-request \
  -H "Content-Type: application/json" \
  -d '{"install_id":"test-123","user_email":"test@example.com"}'
```