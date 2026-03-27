"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath, unstable_noStore as noStore } from "next/cache";

export async function saveQuoteToProject(
  projectId: string, 
  lots: any[], 
  tva?: number,
  clientInfo?: { client_name?: string; city?: string; project_name?: string }
) {
  if (!projectId) return { error: "ID manquant" };
  const cleanId = String(projectId).replace(/%20/g, '-').replace(/ /g, '-');
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: "Non authentifié" };

  const updatePayload: Record<string, any> = { results: lots };
  if (tva !== undefined) updatePayload.tva = tva;
  if (clientInfo?.client_name !== undefined) updatePayload.client_name = clientInfo.client_name || null;
  if (clientInfo?.city !== undefined) updatePayload.city = clientInfo.city || null;
  if (clientInfo?.project_name !== undefined) updatePayload.project_name = clientInfo.project_name || null;

  const { error } = await supabase
    .from("projects")
    .update(updatePayload)
    .eq("id", cleanId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  return { success: true };
}

export async function getProjects() {
  noStore(); // Force real-time query bypassing Next.js cache
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: "Non authentifié", data: null };

  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("user_id", user.id)
    .neq("file_url", "deleted")
    .order("created_at", { ascending: false });

  if (error) return { error: error.message, data: null };
  return { data, error: null };
}

export async function deleteProject(id: string) {
  if (!id) return { error: "ID manquant" };
  const cleanId = String(id).replace(/%20/g, '-').replace(/ /g, '-');
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: "Non authentifié" };
  
  // Soft-delete: marquer le projet comme supprimé sans le retirer de la DB
  // Cela préserve l'intégrité du compteur de quotas
  const { data, error } = await supabase
    .from("projects")
    .update({ file_url: "deleted", status: "pending" })
    .eq("id", cleanId)
    .eq("user_id", user.id)
    .select();

  if (error) return { error: error.message };
  if (!data || data.length === 0) {
    return { error: `Erreur de suppression. ID='${cleanId}'.` };
  }
  
  revalidatePath("/dashboard/projects");
  return { success: true };
}

export async function getProjectById(id: string) {
  noStore();
  if (!id) return { error: "ID manquant", data: null };
  const cleanId = String(id).replace(/%20/g, '-').replace(/ /g, '-');
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: "Non authentifié", data: null };

  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", cleanId)
    .eq("user_id", user.id)
    .single();

  if (error) {
    return { error: `GET Error: ${error.message} | RawID: '${id}' | CleanID: '${cleanId}'`, data: null };
  }
  return { data, error: null };
}
