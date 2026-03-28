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
    .select("plan_tier, email, first_name, last_name, company_name, address, siret, logo_url, brand_hex_color, customer_portal_url, subscription_id, billing_interval, subscription_ends_at, subscription_status, is_beta")
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
    .select("plan_tier, email, billing_interval, is_beta")
    .eq("id", user.id)
    .single();

  const tier = profile?.plan_tier || 'decouverte';

  // ── Beta credit enforcement: 5 total (IA + manual), no free ──
  if (profile?.is_beta) {
    const { count: betaTotal } = await supabase.from('projects')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .neq('file_url', 'deleted');
    if ((betaTotal || 0) >= 5) {
      // Auto-graduate to Pro trial
      const trialEnd = new Date();
      trialEnd.setMonth(trialEnd.getMonth() + 1);
      await supabase.from('users').update({
        is_beta: false,
        plan_tier: 'pro',
        subscription_status: 'trial',
        subscription_ends_at: trialEnd.toISOString(),
      }).eq('id', user.id);
      return { error: "BETA_EXHAUSTED", message: "Vos 5 cr\u00e9dits b\u00eata sont \u00e9puis\u00e9s. Vous b\u00e9n\u00e9ficiez maintenant d'un mois d'acc\u00e8s Pro gratuit !" };
    }
  } else if (tier === 'decouverte') {
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

  const { data: userProfile } = await supabase.from('users').select('plan_tier, is_beta').eq('id', user.id).single();
  const tier = userProfile?.plan_tier || 'decouverte';

  // Allow for Pro AND Beta users
  if (tier !== 'pro' && !userProfile?.is_beta) {
    return { error: "La cr\u00e9ation manuelle de devis est une fonctionnalit\u00e9 exclusive au plan PRO et B\u00eata." };
  }

  // Beta credit check before manual creation
  if (userProfile?.is_beta) {
    const { count: betaTotal } = await supabase.from('projects')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .neq('file_url', 'deleted');
    if ((betaTotal || 0) >= 5) {
      // Auto-graduate to Pro trial
      const trialEnd = new Date();
      trialEnd.setMonth(trialEnd.getMonth() + 1);
      await supabase.from('users').update({
        is_beta: false,
        plan_tier: 'pro',
        subscription_status: 'trial',
        subscription_ends_at: trialEnd.toISOString(),
      }).eq('id', user.id);
      return { error: "BETA_EXHAUSTED", message: "Vos 5 cr\u00e9dits b\u00eata sont \u00e9puis\u00e9s. Vous b\u00e9n\u00e9ficiez maintenant d'un mois d'acc\u00e8s Pro gratuit !" };
    }
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

export async function enrollInBeta() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Non authentifié" };
  }

  // Beta deadline: April 16, 2026
  const BETA_DEADLINE = new Date('2026-04-16T23:59:59');
  if (new Date() > BETA_DEADLINE) {
    return { error: "La période d'inscription à la bêta est terminée." };
  }

  const { error } = await supabase
    .from("users")
    .update({ is_beta: true })
    .eq("id", user.id);

  if (error) {
    return { error: `Erreur lors de l'inscription : ${error.message}` };
  }

  return { success: true };
}
