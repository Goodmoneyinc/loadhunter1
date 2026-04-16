import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from "npm:stripe@17.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2024-11-20.acacia",
});

// Map plan IDs to Stripe Price IDs (price_xxx format, NOT product IDs)
// These must be set as Supabase Edge Function secrets
const priceIds = {
  solo: Deno.env.get("STRIPE_PRICE_ID_SOLO") || "",
  growth: Deno.env.get("STRIPE_PRICE_ID_GROWTH") || "",
  fleet: Deno.env.get("STRIPE_PRICE_ID_FLEET") || "",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    // Validate Stripe configuration
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeSecretKey) {
      console.error("STRIPE_SECRET_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Stripe not configured. Please set up your Stripe API keys." }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    const {
      data: { user },
    } = await supabaseClient.auth.getUser();

    if (!user) {
      console.error("No authenticated user");
      return new Response(
        JSON.stringify({ error: "Unauthorized - please log in first" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("Processing checkout for user:", user.id);

    const { planId } = await req.json();

    console.log("Plan ID:", planId);

    if (!planId || !priceIds[planId as keyof typeof priceIds]) {
      console.error("Invalid plan ID:", planId);
      return new Response(
        JSON.stringify({ error: `Invalid plan ID: ${planId}` }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const priceId = priceIds[planId as keyof typeof priceIds];
    if (!priceId) {
      console.error(`Price ID not configured for plan: ${planId}`);
      return new Response(
        JSON.stringify({ error: `Price ID not configured for plan: ${planId}` }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("Using Stripe Price ID:", priceId);
    console.log("Price ID format check:", priceId.startsWith("price_") ? "✓ Valid" : "✗ Invalid - must start with 'price_'");

    const { data: subscription } = await supabaseClient
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .maybeSingle();

    let customerId = subscription?.stripe_customer_id;

    if (!customerId) {
      console.log("Creating new Stripe customer for user:", user.id);
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          supabase_user_id: user.id,
        },
      });
      customerId = customer.id;
      console.log("Created customer:", customerId);
    } else {
      console.log("Using existing customer:", customerId);
    }

    // Get origin from request headers or use default
    const origin = req.headers.get("origin") || req.headers.get("referer")?.split("/").slice(0, 3).join("/") || "";

    if (!origin) {
      console.error("Could not determine origin for redirect URLs");
      return new Response(
        JSON.stringify({ error: "Could not determine application URL" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("Using origin for redirects:", origin);
    console.log("Creating Stripe Checkout Session with:");
    console.log("  - Mode: subscription");
    console.log("  - Price ID:", priceId);
    console.log("  - Customer ID:", customerId);

    // Create checkout session using ONLY the Price ID in subscription mode
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [
        {
          price: priceId, // Using Price ID (price_xxx), NOT Product ID (prod_xxx)
          quantity: 1,
        },
      ],
      mode: "subscription", // Strictly set to subscription for all tiers
      success_url: `${origin}/billing?success=true`,
      cancel_url: `${origin}/billing?canceled=true`,
      metadata: {
        supabase_user_id: user.id,
        plan_type: planId,
      },
    });

    console.log("Checkout session created:", session.id);

    return new Response(
      JSON.stringify({ url: session.url }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Stripe checkout error:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "An unexpected error occurred",
        details: error.toString()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
