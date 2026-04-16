import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from "npm:stripe@17.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2024-11-20.acacia",
  httpClient: Stripe.createFetchHttpClient(),
});

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

console.log("=== WEBHOOK INITIALIZATION ===");
console.log("SUPABASE_URL exists:", !!supabaseUrl);
console.log("SUPABASE_SERVICE_ROLE_KEY exists:", !!supabaseServiceRoleKey);

const supabaseAdmin = createClient(
  supabaseUrl ?? "",
  supabaseServiceRoleKey ?? ""
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  console.log("=== WEBHOOK REQUEST RECEIVED ===");

  const event = await req.json();

  console.log("WEBHOOK_STEP: Data received");
  console.log("WEBHOOK_TYPE:", event.type);

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session);
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaymentSucceeded(invoice);
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(subscription);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentFailed(invoice);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(
      JSON.stringify({ received: true }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error(`Error processing ${event.type}:`, error);
    return new Response(
      JSON.stringify({ received: true, error: "Processing failed" }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  console.log("=== PROCESSING CHECKOUT.SESSION.COMPLETED ===");
  console.log("Session ID:", session.id);
  console.log("Session Metadata:", JSON.stringify(session.metadata, null, 2));
  console.log("Customer ID:", session.customer);
  console.log("Subscription ID:", session.subscription);

  const userId = session.metadata?.supabase_user_id;
  const planType = session.metadata?.plan_type;

  console.log("WEBHOOK_STEP: Extracted metadata");
  console.log("User ID from metadata:", userId);
  console.log("Plan Type from metadata:", planType);

  if (!userId) {
    console.error("ERROR: Missing supabase_user_id in metadata!");
    throw new Error("Missing user ID in session metadata");
  }

  if (!session.subscription) {
    console.error("ERROR: No subscription ID in checkout session");
    throw new Error("No subscription ID in checkout session");
  }

  console.log("WEBHOOK_STEP: Database insert attempted");
  console.log("Upserting for user_id:", userId);

  const { data, error } = await supabaseAdmin
    .from("subscriptions")
    .upsert({
      user_id: userId,
      plan_type: planType,
      status: "active",
      stripe_subscription_id: session.subscription as string,
      stripe_customer_id: session.customer as string,
      updated_at: new Date().toISOString(),
    })
    .select();

  if (error) {
    console.error("DATABASE UPSERT ERROR:", JSON.stringify(error, null, 2));
    throw error;
  }

  console.log("=== SUCCESS ===");
  console.log("Subscription created/updated for user:", userId);
  console.log("Returned data:", JSON.stringify(data, null, 2));
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  console.log("=== PROCESSING INVOICE.PAYMENT_SUCCEEDED ===");
  console.log("Invoice ID:", invoice.id);
  console.log("Customer ID:", invoice.customer);
  console.log("Subscription ID:", invoice.subscription);

  if (!invoice.customer) {
    console.error("ERROR: Missing customer ID in invoice!");
    throw new Error("Missing customer ID in invoice");
  }

  if (!invoice.subscription) {
    console.log("No subscription on invoice, skipping");
    return;
  }

  console.log("WEBHOOK_STEP: Querying stripe_customers table");
  console.log("Looking up customer_id:", invoice.customer);

  const { data: customerData, error: customerError } = await supabaseAdmin
    .from("stripe_customers")
    .select("user_id")
    .eq("customer_id", invoice.customer as string)
    .maybeSingle();

  if (customerError) {
    console.error("Error querying stripe_customers:", customerError);
    throw customerError;
  }

  if (!customerData) {
    console.error("ERROR: No user found for customer_id:", invoice.customer);
    throw new Error(`No user found for customer_id: ${invoice.customer}`);
  }

  const userId = customerData.user_id;
  console.log("WEBHOOK_STEP: User found from stripe_customers");
  console.log("HANDLING INVOICE SUCCESS for user:", userId);

  console.log("WEBHOOK_STEP: Database insert attempted");

  const { data, error } = await supabaseAdmin
    .from("subscriptions")
    .upsert({
      user_id: userId,
      status: "active",
      stripe_subscription_id: invoice.subscription as string,
      stripe_customer_id: invoice.customer as string,
      updated_at: new Date().toISOString(),
    })
    .select();

  if (error) {
    console.error("DATABASE UPSERT ERROR:", JSON.stringify(error, null, 2));
    throw error;
  }

  console.log("=== SUCCESS ===");
  console.log("Subscription activated via invoice payment for user:", userId);
  console.log("Returned data:", JSON.stringify(data, null, 2));
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  console.log("=== PROCESSING SUBSCRIPTION.UPDATED ===");
  console.log("Subscription ID:", subscription.id);

  console.log("WEBHOOK_STEP: Database update attempted");

  const { error } = await supabaseAdmin
    .from("subscriptions")
    .update({
      status: subscription.status,
      current_period_end: new Date(
        subscription.current_period_end * 1000
      ).toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_subscription_id", subscription.id);

  if (error) {
    console.error("Database update error:", error);
    throw error;
  }

  console.log("Subscription updated:", subscription.id);
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  console.log("=== PROCESSING SUBSCRIPTION.DELETED ===");
  console.log("Subscription ID:", subscription.id);

  console.log("WEBHOOK_STEP: Database update attempted");

  const { error } = await supabaseAdmin
    .from("subscriptions")
    .update({
      status: "canceled",
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_subscription_id", subscription.id);

  if (error) {
    console.error("Database update error:", error);
    throw error;
  }

  console.log("Subscription canceled:", subscription.id);
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  console.log("=== PROCESSING PAYMENT_FAILED ===");
  console.log("Invoice ID:", invoice.id);

  if (!invoice.subscription) {
    console.log("No subscription on invoice, skipping");
    return;
  }

  console.log("WEBHOOK_STEP: Database update attempted");

  const { error } = await supabaseAdmin
    .from("subscriptions")
    .update({
      status: "past_due",
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_subscription_id", invoice.subscription as string);

  if (error) {
    console.error("Database update error:", error);
    throw error;
  }

  console.log("Subscription marked past_due:", invoice.subscription);
}
