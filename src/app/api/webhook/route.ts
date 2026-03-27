import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

export async function POST(request: NextRequest) {
  try {
    const secret = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET;
    if (!secret) {
      console.error("Missing webhook secret");
      return NextResponse.json({ error: "Missing webhook secret" }, { status: 500 });
    }

    const payload = await request.text();
    const signature = request.headers.get("x-signature") || "";

    // Vérification de la signature stricte via HMAC-SHA256
    const hmac = crypto.createHmac("sha256", secret);
    const digest = Buffer.from(hmac.update(payload).digest("hex"), "utf8");
    const signatureBuffer = Buffer.from(signature, "utf8");

    if (digest.length !== signatureBuffer.length || !crypto.timingSafeEqual(digest, signatureBuffer)) {
      console.error("Invalid Lemon Squeezy signature - Match Failed");
      return NextResponse.json({ error: "Unauthorized: Invalid signature" }, { status: 401 });
    }

    const event = JSON.parse(payload);
    const eventName = event.meta.event_name;
    
    console.log("\n\n=== 🚨 LEMON SQUEEZY WEBHOOK INCOMING 🚨 ===");
    console.log("EVENT TYPE:", eventName);
    
    // Traitement logique (Le cœur du réacteur)
    if (eventName === "subscription_created" || eventName === "subscription_updated") {
      const email = event.data.attributes.user_email;
      const status = event.data.attributes.status;
      const variant_id = event.data.attributes.variant_id?.toString();
      
      console.log("-----------------------------------------");
      console.log("PAYLOAD EMAIL:", email);
      console.log("VARIANT ID REÇU (VENANT DE LEMON SQUEEZY):", variant_id);
      console.log("VARIANT ID ATTENDU (PRO) DANS .ENV:", process.env.LEMON_SQUEEZY_VARIANT_PRO);
      console.log("VARIANT ID ATTENDU (ARTISAN) DANS .ENV:", process.env.LEMON_SQUEEZY_VARIANT_ARTISAN);
      console.log("-----------------------------------------");
      const customer_portal_url = event.data.attributes.urls?.customer_portal;
      
      // Extraction des custom_data
      const custom_data = event.meta.custom_data || {};
      const userId = custom_data.user_id;

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
      
      if (!supabaseUrl || !supabaseKey) {
        console.error("Missing Supabase Service Role Key");
        return NextResponse.json({ error: "Server Configuration Error" }, { status: 500 });
      }

      // Initialisation avec Service Role pour bypass RLS
      const supabase = createClient(supabaseUrl, supabaseKey);

      if (status === "active" || status === "past_due") {
        let newTier = "decouverte";
        let newCount = 3;

        // Classification par ID Variant
        if (
          variant_id === process.env.LEMON_SQUEEZY_VARIANT_PRO || 
          variant_id === process.env.LEMON_SQUEEZY_VARIANT_PRO_ANNUAL
        ) {
          newTier = "pro";
          newCount = 103;
        } else if (
          variant_id === process.env.LEMON_SQUEEZY_VARIANT_ARTISAN || 
          variant_id === process.env.LEMON_SQUEEZY_VARIANT_ARTISAN_ANNUAL
        ) {
          newTier = "artisan";
          newCount = 18;
        }
        
        console.log(">>> DÉCISION DE TIER FINAL:", newTier);
        
        let query = supabase.from("users").update({ 
          plan_tier: newTier,
          plan_count: newCount,
          subscription_id: event.data.id,
          customer_portal_url: customer_portal_url || null
        });

        // Identification ciblage (custom_data.user_id prioritaire, email en secours)
        if (userId) {
          query = query.eq("id", userId);
        } else {
          query = query.eq("email", email);
        }

        const { error } = await query;
        if (error) console.error("Error updating user subscription in Supabase:", error);
        else revalidatePath("/dashboard", "layout");

      } else if (status === "expired" || status === "cancelled" || status === "unpaid") {
        // Rétrogradation automatique en cas d'annulation
        let downgradeQuery = supabase.from("users").update({ 
          plan_tier: "decouverte",
          customer_portal_url: customer_portal_url || null
        });

        if (userId) downgradeQuery = downgradeQuery.eq("id", userId);
        else downgradeQuery = downgradeQuery.eq("email", email);

        const { error } = await downgradeQuery;
        if (error) console.error("Error downgrading user subscription in Supabase:", error);
        else revalidatePath("/dashboard", "layout");
      }
    }

    // Réponse de succès à Lemon Squeezy
    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error("Webhook unexpected error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
