"use server";

import { createClient } from "@/lib/supabase/server";
import { unstable_noStore as noStore } from "next/cache";

export async function getUserProfile() {
  noStore();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("users")
    .select("plan_tier, email, first_name, last_name, company_name, address, siret, logo_url, brand_hex_color, customer_portal_url, subscription_id, billing_interval, subscription_ends_at, subscription_status")
    .eq("id", user.id)
    .single();

  return profile;
}

export async function uploadPlanAndCreateProject(formData: FormData) {
  const supabase = await createClient();

  // Get current user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "Non authentifié. Veuillez vous reconnecter." };
  }

  // Check paywall limits via strict Postgres aggregation
  const { data: profile } = await supabase
    .from("users")
    .select("plan_tier, email, billing_interval")
    .eq("id", user.id)
    .single();

  const tier = profile?.plan_tier || 'decouverte';

  if (tier === 'decouverte') {
    const { count } = await supabase.from('projects').select('*', { count: 'exact', head: true }).eq('user_id', user.id).neq('file_url', 'manual').neq('file_url', 'deleted');
      if ((count || 0) >= 3) {
        return { error: "LIMIT_REACHED", message: "Vous avez atteint la limite de 3 devis gratuits (Plan Découverte). Passez au plan Artisan ou Pro pour continuer." };
      }
    } else {
      const billingInterval = profile?.billing_interval || 'monthly';
      const multiplier = billingInterval === 'yearly' ? 12 : 1;
      let anchorDay = 1;
      const { data: fourthProject } = await supabase
        .from('projects')
        .select('created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
        .range(3, 3)
        .maybeSingle();

      if (fourthProject) {
        anchorDay = new Date(fourthProject.created_at).getDate();
      } else {
        anchorDay = new Date().getDate();
      }

      const now = new Date();
      let cycleStartMonth = now.getMonth();
      let cycleStartYear = now.getFullYear();

      if (now.getDate() < anchorDay) {
        cycleStartMonth -= 1;
        if (cycleStartMonth < 0) {
          cycleStartMonth = 11;
          cycleStartYear -= 1;
        }
      }

      const daysInMonth = new Date(cycleStartYear, cycleStartMonth + 1, 0).getDate();
      const validAnchorDay = Math.min(anchorDay, daysInMonth);
      const cycleStartDate = new Date(cycleStartYear, cycleStartMonth, validAnchorDay).toISOString();

      const { count: cycleCount, error: cycleError } = await supabase
         .from('projects')
         .select('*', { count: 'exact', head: true })
         .eq('user_id', user.id)
         .neq('file_url', 'manual')
         .neq('file_url', 'deleted')
         .gte('created_at', cycleStartDate);

      const { count: lifetimeCount } = await supabase
         .from('projects')
         .select('*', { count: 'exact', head: true })
         .eq('user_id', user.id)
         .neq('file_url', 'manual')
         .neq('file_url', 'deleted');

      const currCycle = cycleCount || 0;
      const lifetime = lifetimeCount || 0;
      const projectsBeforeCycle = Math.max(0, lifetime - currCycle);
      const unusedFree = Math.max(0, 3 - projectsBeforeCycle);
      
      const limit = ((tier === 'artisan' ? 15 : 100) * multiplier) + unusedFree;
      
      if (currCycle >= limit) {
         return { error: "LIMIT_REACHED", message: `Vous avez atteint votre limite mensuelle de ${limit} devis pour votre abonnement (${tier.toUpperCase()}).` };
      }
    }

  // Extract data from form
  const file = formData.get("file") as File;
  const materialsRaw = formData.get("materials") as string;
  const materials: string[] = materialsRaw ? JSON.parse(materialsRaw) : [];
  const clientName = formData.get("clientName") as string;
  const city = formData.get("city") as string;
  const projectName = formData.get("projectName") as string;
  const tva = formData.get("tva") as string;
  const scaleValue = formData.get("scaleValue") as string;
  const scaleUnit = formData.get("scaleUnit") as string;
  const notes = formData.get("notes") as string;

  if (!file || file.size === 0) {
    return { error: "Aucun fichier fourni." };
  }

  if (materials.length === 0) {
    return { error: "Veuillez sélectionner au moins un matériau." };
  }

  // Generate unique file path
  const timestamp = Date.now();
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const filePath = `${user.id}/${timestamp}_${sanitizedName}`;

  // Upload file to Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from("plans")
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (uploadError) {
    return { error: `Erreur d'upload : ${uploadError.message}` };
  }

  // Get public URL
  const {
    data: { publicUrl },
  } = supabase.storage.from("plans").getPublicUrl(filePath);

  // Insert project record with all new metadata
  const { error: insertError, data: project } = await supabase
    .from("projects")
    .insert({
      user_id: user.id,
      file_url: publicUrl,
      status: "pending",
      materials,
      total_estimate: 0,
      client_name: clientName || null,
      city: city || null,
      project_name: projectName || null,
      tva: tva ? parseFloat(tva) : 20,
      scale_value: scaleValue || null,
      scale_unit: scaleUnit || "m",
      notes: notes || null,
    })
    .select("id")
    .single();

  if (insertError) {
    return { error: `Erreur base de données : ${insertError.message}` };
  }



  return { success: true, fileUrl: publicUrl, projectId: project?.id };
}

export async function createManualProject(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Non authentifié" };
  }

  const clientName = formData.get("clientName") as string;
  const city = formData.get("city") as string;
  const projectName = formData.get("projectName") as string;
  const tva = formData.get("tva") as string;

  const { data: userProfile } = await supabase.from('users').select('plan_tier').eq('id', user.id).single();
  const tier = userProfile?.plan_tier || 'decouverte';

  if (tier !== 'pro') {
    return { error: "La création manuelle de devis est une fonctionnalité exclusive au plan PRO." };
  }

  // Insert Blank Project
  const { data: project, error: insertError } = await supabase
    .from("projects")
    .insert({
      user_id: user.id,
      file_url: "manual",
      status: "pending",
      materials: null,
      total_estimate: 0,
      client_name: clientName || null,
      city: city || null,
      project_name: projectName || null,
      tva: tva ? parseFloat(tva) : 20,
      scale_value: null,
      scale_unit: "m",
      notes: "Devis entièrement manuel",
      results: []
    })
    .select("id")
    .single();

  if (insertError) {
    return { error: `Erreur base de données : ${insertError.message}` };
  }

  return { success: true, projectId: project?.id };
}
