# Stripe Setup Instructions

## Required Supabase Edge Function Secrets

Your Stripe configuration requires these **exact Price IDs** from your `stripe-config.ts`:

```bash
# Copy these exact values to your Supabase Edge Function Secrets:

STRIPE_SECRET_KEY=sk_test_... (or sk_live_...)

# From stripe-config.ts - SOLO plan:
STRIPE_PRICE_ID_SOLO=price_1THYiKA9uZVgLTxzgbeKiKJs

# From stripe-config.ts - Growth plan:
STRIPE_PRICE_ID_GROWTH=price_1THYitA9uZVgLTxzP5TQr9CK

# From stripe-config.ts - Fleet plan:
STRIPE_PRICE_ID_FLEET=price_1THYjRA9uZVgLTxzX6T5z6RK

# Webhook secret (from Stripe Dashboard > Developers > Webhooks):
STRIPE_WEBHOOK_SECRET=whsec_...
```

## Important Notes

### ✅ What the Edge Function Uses (Correct)
- **Price IDs** (`price_xxx`) - These are what you pass to Stripe Checkout
- **Subscription mode** - Hardcoded to `"subscription"` for all tiers
- **Only the Price ID** - No Product ID needed in the API call

### ❌ What NOT to Use
- ~~Product IDs (`prod_xxx`)~~ - These are NOT used in checkout sessions
- ~~Payment mode~~ - All plans use subscription mode
- ~~Mixing Product + Price IDs~~ - Only Price ID is needed

## How the Checkout Flow Works

1. **User clicks plan** → Billing.tsx sends `planId: 'solo'` (or 'growth', 'fleet')
2. **Edge function maps** → Looks up `STRIPE_PRICE_ID_SOLO` environment variable
3. **Validates Price ID** → Checks it starts with `'price_'`
4. **Creates session** → Calls `stripe.checkout.sessions.create()` with:
   ```javascript
   {
     line_items: [{ price: 'price_1THYiKA9uZVgLTxzgbeKiKJs', quantity: 1 }],
     mode: 'subscription',  // Always subscription, never 'payment'
     // ... other params
   }
   ```
5. **Redirects user** → To Stripe's hosted checkout page

## Verifying Your Setup

### Step 1: Check the Debug Page
Visit: `http://localhost:5173/stripe-debug`

You should see:
- ✅ Stripe Secret Key (configured)
- ✅ Solo Plan Price ID: `price_1THYiKA9uZVgLTxzgbeKiKJs`
- ✅ Growth Plan Price ID: `price_1THYitA9uZVgLTxzP5TQr9CK`
- ✅ Fleet Plan Price ID: `price_1THYjRA9uZVgLTxzX6T5z6RK`

### Step 2: Check Browser Console
When you click a plan, you should see:
```
Creating checkout session for plan: solo user: abc-123-def
Response status: 200
Using Stripe Price ID: price_1THYiKA9uZVgLTxzgbeKiKJs
Price ID format check: ✓ Valid
Creating Stripe Checkout Session with:
  - Mode: subscription
  - Price ID: price_1THYiKA9uZVgLTxzgbeKiKJs
  - Customer ID: cus_xxx
Checkout session created: cs_test_xxx
```

### Step 3: Check Edge Function Logs
If you have access to Supabase logs, you'll see detailed logging showing:
- Which Price ID is being used
- Validation that it starts with `price_`
- The exact parameters sent to Stripe

## Common Issues

### Issue: "Price ID not configured"
**Solution:** Set the environment variable in Supabase Edge Function secrets with the exact value from above

### Issue: "No such price"
**Cause:** The Price ID doesn't exist in your Stripe account
**Solution:** Verify the Price ID exists in your Stripe Dashboard → Products → Prices

### Issue: "Invalid mode for price"
**Cause:** Trying to use a one-time price in subscription mode (or vice versa)
**Solution:** Ensure your Stripe Price is configured as "Recurring" in the Stripe Dashboard

### Issue: Product/Price mismatch
**This is now impossible** - The edge function only uses the Price ID, ignoring Product IDs completely

## Stripe Dashboard Verification

1. Go to: https://dashboard.stripe.com/test/products
2. Find your products: SOLO, Growth, Fleet
3. Click on each product
4. Copy the **Price ID** (starts with `price_`)
5. Verify it matches the value in `stripe-config.ts`

## Testing in Stripe Test Mode

All the Price IDs in your config start with `price_1TH...` which indicates they're test mode prices.

To test:
1. Use test mode Stripe secret key (`sk_test_...`)
2. Use test card: `4242 4242 4242 4242`
3. Any future expiry date (e.g., 12/34)
4. Any 3-digit CVC (e.g., 123)

## Next Steps

Once you configure the secrets in Supabase:
1. The server will automatically restart
2. Visit `/stripe-debug` to verify all green checkmarks
3. Try the checkout flow from `/billing`
4. Check browser console for detailed logs
5. You should be redirected to Stripe Checkout successfully

https://bolt.new/setup/stripe
