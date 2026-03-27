import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: NextRequest) {
  try {
    const secret = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET;
    if (!secret) {
      console.error("Missing webhook secret");
      return NextResponse.json({ error: "Missing webhook secret" }, { status: 500 });
    }

    const payload = await request.text();
    const signature = request.headers.get("x-signature") || "";

    // Verify signature
    const hmac = crypto.createHmac("sha256", secret);
    const digest = Buffer.from(hmac.update(payload).digest("hex"), "utf8");
    const signatureBuffer = Buffer.from(signature, "utf8");

    if (digest.length !== signatureBuffer.length || !crypto.timingSafeEqual(digest, signatureBuffer)) {
      console.error("Invalid Lemon Squeezy signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const event = JSON.parse(payload);
    
    // We only care about subscription_created or subscription_updated
    if (event.meta.event_name === "subscription_created" || event.meta.event_name === "subscription_updated") {
      const email = event.data.attributes.user_email;
      const status = event.data.attributes.status;
      const variant_id = event.data.attributes.variant_id?.toString();
      const customer_portal_url = event.data.attributes.urls?.customer_portal;
      const renews_at = event.data.attributes.renews_at || null;
      const ends_at = event.data.attributes.ends_at || null;

      console.log(`[Webhook] event=${event.meta.event_name} status=${status} email=${email} variant=${variant_id} renews_at=${renews_at} ends_at=${ends_at}`);

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
      
      if (!supabaseUrl || !supabaseKey) {
        console.error("Missing Supabase Service Role Key");
        return NextResponse.json({ error: "Server Configuration Error" }, { status: 500 });
      }

      const supabase = createClient(supabaseUrl, supabaseKey);

      if (status === "active" || status === "past_due") {
        let newTier = "decouverte";
        let billingInterval = "monthly";
        if (
          variant_id === process.env.LEMON_SQUEEZY_VARIANT_PRO || 
          variant_id === process.env.LEMON_SQUEEZY_VARIANT_PRO_ANNUAL
        ) {
          newTier = "pro";
        } else if (
          variant_id === process.env.LEMON_SQUEEZY_VARIANT_ARTISAN || 
          variant_id === process.env.LEMON_SQUEEZY_VARIANT_ARTISAN_ANNUAL
        ) {
          newTier = "artisan";
        }

        // Détecter si l'abonnement est annuel
        if (
          variant_id === process.env.LEMON_SQUEEZY_VARIANT_PRO_ANNUAL ||
          variant_id === process.env.LEMON_SQUEEZY_VARIANT_ARTISAN_ANNUAL
        ) {
          billingInterval = "yearly";
        }
        
        const { error } = await supabase
          .from("users")
          .update({ 
            plan_tier: newTier,
            billing_interval: billingInterval,
            subscription_id: event.data.id,
            subscription_ends_at: renews_at,
            customer_portal_url: customer_portal_url || null
          })
          .eq("email", email);

        if (error) console.error("Error updating user subscription in Supabase:", error);
        else console.log(`[Webhook] SUCCESS: ${email} -> ${newTier} (${billingInterval}), renews_at=${renews_at}`);
      } else if (status === "cancelled") {
        // Annulé mais encore actif jusqu'à la fin de la période payée
        // On garde le plan actif et on stocke la date de fin
        const endsAt = event.data.attributes.ends_at || null;
        const { error } = await supabase
          .from("users")
          .update({ 
            subscription_ends_at: ends_at,
            customer_portal_url: customer_portal_url || null
          })
          .eq("email", email);
          
        if (error) console.error("Error storing cancellation end date in Supabase:", error);
        else console.log(`[Webhook] CANCELLED: ${email} keeps plan until ${ends_at}`);
      } else if (status === "expired" || status === "unpaid") {
        // Abonnement réellement expiré — downgrader maintenant
        const { error } = await supabase
          .from("users")
          .update({ 
            plan_tier: "decouverte",
            billing_interval: "monthly",
            subscription_ends_at: null,
            customer_portal_url: customer_portal_url || null
          })
          .eq("email", email);
          
        if (error) console.error("Error downgrading user subscription in Supabase:", error);
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook unexpected error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
