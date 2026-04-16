# Stripe Checkout Debugging Guide

## Architecture Overview

This application uses **Supabase Edge Functions** (serverless functions) instead of traditional API routes. This is the correct architecture for Supabase-based applications.

### How It Works

1. **Frontend (Billing.tsx)** → Makes a fetch request to the Supabase Edge Function
2. **Edge Function (stripe-checkout)** → Processes the request and creates a Stripe checkout session
3. **Stripe** → Returns a checkout URL that redirects the user to Stripe's payment page

## No Traditional API Routes Needed

Unlike traditional Express/Next.js apps, you do NOT need:
- ❌ `/api/create-checkout-session.ts` file
- ❌ `loadStripe()` on the frontend (we redirect to Stripe Checkout)
- ❌ Stripe publishable key in the frontend .env

## What You DO Need

### Required Supabase Edge Function Secrets (Server-Side)

These are configured in your Supabase project dashboard and are automatically available to edge functions:

- `STRIPE_SECRET_KEY` - Your Stripe secret key (sk_test_... or sk_live_...)
- `STRIPE_PRICE_ID_SOLO` - Price ID for the Solo plan (price_...)
- `STRIPE_PRICE_ID_GROWTH` - Price ID for the Growth plan (price_...)
- `STRIPE_PRICE_ID_FLEET` - Price ID for the Fleet plan (price_...)
- `STRIPE_WEBHOOK_SECRET` - For webhook signature verification

### Frontend Environment Variables (.env)

Only these are needed in your `.env` file:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## Using the Debug Tool

### Step 1: Visit the Debug Page

Navigate to: `http://localhost:5173/stripe-debug`

### Step 2: Check Configuration Status

The debug page will show:
- ✅ Green checkmarks = Configured correctly
- ❌ Red X marks = Missing configuration

### Step 3: Verify Each Section

1. **Authentication Status**
   - Must show "Logged in as: your-email"
   - If not logged in, go to `/login` first

2. **Stripe Configuration**
   - All items should have green checkmarks
   - If any are red, the Stripe keys are not configured in Supabase

3. **Test Checkout**
   - Click "Test Checkout (Solo Plan)"
   - Check the browser console for detailed logs
   - The error message will show the exact issue

## Common Issues and Solutions

### Issue: "Stripe not configured"
**Solution:** Set the `STRIPE_SECRET_KEY` in your Supabase Edge Function secrets

### Issue: "Price ID not configured for plan: solo"
**Solution:** Set `STRIPE_PRICE_ID_SOLO` (and GROWTH, FLEET) in Supabase Edge Function secrets

### Issue: "Unauthorized - please log in first"
**Solution:** Log in at `/login` before attempting checkout

### Issue: "Could not determine application URL"
**Solution:** This is now fixed - the frontend sends the Origin header

## Browser Console Logs

When you click a pricing plan, you'll see detailed logs:

```
Creating checkout session for plan: solo user: abc-123-def
Response status: 200
Checkout session created: { url: "https://checkout.stripe.com/..." }
```

If there's an error:

```
Response status: 500
Checkout error response: {"error":"Price ID not configured for plan: solo"}
```

## Edge Function Architecture

### Files and Their Purpose

1. **`supabase/functions/stripe-checkout/index.ts`**
   - Creates Stripe checkout sessions
   - Validates user authentication
   - Creates/retrieves Stripe customers
   - Returns checkout URL

2. **`supabase/functions/stripe-portal/index.ts`**
   - Creates Stripe billing portal sessions
   - For managing existing subscriptions

3. **`supabase/functions/stripe-webhook/index.ts`**
   - Handles Stripe webhook events
   - Updates subscription status in database

4. **`supabase/functions/stripe-config-check/index.ts`**
   - Debug endpoint to verify configuration
   - Does not require authentication

## Testing the Complete Flow

1. Log in to your account (`/login`)
2. Go to Billing page (`/billing`)
3. Open browser DevTools → Console tab
4. Click on any pricing plan
5. Watch the console logs for detailed information
6. If successful, you'll be redirected to Stripe Checkout
7. If error, the exact error message will appear in console and on page

## Next Steps

If the debug page shows all green checkmarks and the test checkout works:
- The issue is resolved
- You can proceed with normal checkout

If you see red X marks:
- Those specific secrets need to be configured in Supabase
- The error messages will tell you exactly which ones
