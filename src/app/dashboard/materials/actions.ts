"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type CustomMaterial = {
  id: string;
  user_id: string;
  name: string;
  unit: string;
  default_price: number;
  created_at: string;
};

export async function getMaterials() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: "Non authentifié", data: null };

  const { data, error } = await supabase
    .from("custom_materials")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return { error: error.message, data: null };
  return { data: data as CustomMaterial[], error: null };
}

export async function addMaterial(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: "Non authentifié" };

  const name = formData.get("name") as string;
  const unit = formData.get("unit") as string;
  const default_price = parseFloat(formData.get("default_price") as string);

  if (!name || !unit || isNaN(default_price)) {
    return { error: "Données invalides" };
  }

  const { error } = await supabase
    .from("custom_materials")
    .insert([
      {
        user_id: user.id,
        name,
        unit,
        default_price,
      },
    ]);

  if (error) return { error: error.message };
  
  revalidatePath("/dashboard/materials");
  return { success: true };
}

export async function updateMaterial(id: string, formData: FormData) {
  const supabase = await createClient();
  
  const name = formData.get("name") as string;
  const unit = formData.get("unit") as string;
  const default_price = parseFloat(formData.get("default_price") as string);

  if (!name || !unit || isNaN(default_price)) {
    return { error: "Données invalides" };
  }

  const { error } = await supabase
    .from("custom_materials")
    .update({ name, unit, default_price })
    .eq("id", id);

  if (error) return { error: error.message };
  
  revalidatePath("/dashboard/materials");
  return { success: true };
}

export async function deleteMaterial(id: string) {
  const supabase = await createClient();
  
  const { error } = await supabase
    .from("custom_materials")
    .delete()
    .eq("id", id);

  if (error) return { error: error.message };
  
  revalidatePath("/dashboard/materials");
  return { success: true };
}
