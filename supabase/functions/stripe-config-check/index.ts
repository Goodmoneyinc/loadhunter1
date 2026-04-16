import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const config = {
      hasStripeSecretKey: !!Deno.env.get("STRIPE_SECRET_KEY"),
      hasStripeSoloPrice: !!Deno.env.get("STRIPE_PRICE_ID_SOLO"),
      hasStripeGrowthPrice: !!Deno.env.get("STRIPE_PRICE_ID_GROWTH"),
      hasStripeFleetPrice: !!Deno.env.get("STRIPE_PRICE_ID_FLEET"),
      hasWebhookSecret: !!Deno.env.get("STRIPE_WEBHOOK_SECRET"),
      stripeSoloPrice: Deno.env.get("STRIPE_PRICE_ID_SOLO") ?
        `${Deno.env.get("STRIPE_PRICE_ID_SOLO")?.substring(0, 10)}...` : "NOT SET",
      stripeGrowthPrice: Deno.env.get("STRIPE_PRICE_ID_GROWTH") ?
        `${Deno.env.get("STRIPE_PRICE_ID_GROWTH")?.substring(0, 10)}...` : "NOT SET",
      stripeFleetPrice: Deno.env.get("STRIPE_PRICE_ID_FLEET") ?
        `${Deno.env.get("STRIPE_PRICE_ID_FLEET")?.substring(0, 10)}...` : "NOT SET",
    };

    return new Response(
      JSON.stringify(config, null, 2),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
