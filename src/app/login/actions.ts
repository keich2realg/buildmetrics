"use server";

import { createClient } from "@supabase/supabase-js";

export async function syncUserProfile(userProfile: any) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase Service Role Key");
    return { error: "Server Configuration Error" };
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

  const { error } = await supabaseAdmin
    .from("users")
    .upsert({
      id: userProfile.id,
      email: userProfile.email,
      first_name: userProfile.first_name,
      last_name: userProfile.last_name,
      company_name: userProfile.company_name,
      address: userProfile.address,
      siret: userProfile.siret,
      plan_tier: "decouverte",
      plan_count: 0
    });

  if (error) {
    console.error("Error syncing user profile:", error);
    return { error: error.message };
  }

  return { success: true };
}
