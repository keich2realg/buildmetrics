"use server";

import { createClient } from "@/lib/supabase/server";

export async function updateUserProfile(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Utilisateur non authentifié. Veuillez vous reconnecter." };
  }

  // Extract text variables
  const firstName = formData.get("first_name") as string;
  const lastName = formData.get("last_name") as string;
  const companyName = formData.get("company_name") as string;
  const address = formData.get("address") as string;
  const siret = formData.get("siret") as string;
  const brandHexColor = formData.get("brand_hex_color") as string;

  // Extract and Handle Logo Upload
  const logoFile = formData.get("logo") as File;
  let logoUrl = null;

  if (logoFile && logoFile.size > 0) {
    if (logoFile.size > 2 * 1024 * 1024) {
      return { error: "Le logo ne doit pas dépasser 2 Mo." };
    }

    const timestamp = Date.now();
    const cleanFileName = logoFile.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const filePath = `${user.id}/${timestamp}_${cleanFileName}`;

    const { error: uploadError } = await supabase.storage
      .from("company_logos")
      .upload(filePath, logoFile, {
        cacheControl: "3600",
        upsert: true,
      });

    if (uploadError) {
      return { error: `Erreur d'upload du logo: ${uploadError.message}` };
    }

    const { data: { publicUrl } } = supabase.storage.from("company_logos").getPublicUrl(filePath);
    logoUrl = publicUrl;
  }

  const updateData: any = {
    first_name: firstName || null,
    last_name: lastName || null,
    company_name: companyName || null,
    address: address || null,
    siret: siret || null,
    brand_hex_color: brandHexColor || '#1e293b',
  };

  if (logoUrl) updateData.logo_url = logoUrl;

  // Insert or update profile on Supabase users table
  const { error } = await supabase
    .from("users")
    .update(updateData)
    .eq("id", user.id);

  if (error) {
    return { error: `Erreur lors de la mise à jour de la base de données : ${error.message}` };
  }

  return { success: true };
}

export async function deleteUserLogo() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Utilisateur non authentifié. Veuillez vous reconnecter." };
  }

  const { error } = await supabase
    .from("users")
    .update({ logo_url: null })
    .eq("id", user.id);

  if (error) {
    return { error: `Erreur base de données : ${error.message}` };
  }

  return { success: true };
}
