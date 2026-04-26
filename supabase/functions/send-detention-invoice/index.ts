import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface SendInvoicePayload {
  loadId: string;
  recipientEmail: string;
  filename: string;
  pdfBase64: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const resendKey = Deno.env.get("RESEND_API_KEY");
    const fromEmail = Deno.env.get("DETENTION_FROM_EMAIL") ?? "Detention <detention@loadhunter.app>";
    if (!resendKey) {
      return new Response(
        JSON.stringify({ success: false, error: "RESEND_API_KEY is not configured." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
      }
    );

    const {
      data: { user },
    } = await supabaseClient.auth.getUser();

    if (!user) {
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = (await req.json()) as SendInvoicePayload;
    if (!body.loadId || !body.recipientEmail || !body.filename || !body.pdfBase64) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required fields." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [body.recipientEmail],
        subject: `Detention Invoice - Load ${body.loadId.slice(0, 8)}`,
        html: `
          <p>Hello,</p>
          <p>Please find the attached detention invoice for load <strong>${body.loadId}</strong>.</p>
          <p>This invoice includes timeline proof, timestamps, GPS coordinates, and BOL documentation when available.</p>
          <p>Thank you.</p>
        `,
        attachments: [
          {
            filename: body.filename,
            content: body.pdfBase64,
          },
        ],
      }),
    });

    const resendJson = await resendResponse.json();
    if (!resendResponse.ok) {
      return new Response(
        JSON.stringify({
          success: false,
          error: resendJson?.message ?? "Failed to send detention invoice email.",
          details: resendJson,
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, id: resendJson?.id ?? null }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unexpected error sending invoice email.",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
