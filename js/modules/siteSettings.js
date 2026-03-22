import { supabase } from "../api.js";
import { toast } from "../ui.js";

export async function getSiteSettings() {
  const { data, error } = await supabase
    .from("site_settings")
    .select("*")
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error(error);
    return { site_title: "Gustavsburg Cem Evi", logo_url: "" };
  }

  return data || { site_title: "Gustavsburg Cem Evi", logo_url: "" };
}

export async function updateSiteSettings(patch) {
  const current = await getSiteSettings();

  if (current?.id) {
    await supabase
      .from("site_settings")
      .update(patch)
      .eq("id", current.id);
    return;
  }

  await supabase.from("site_settings").insert([patch]);
}

export async function uploadBrandLogo(file) {
  if (!file) throw new Error("Keine Datei");

  const path = `logo/${Date.now()}_${file.name}`;

  const { error } = await supabase.storage
    .from("branding")
    .upload(path, file);

  if (error) throw error;

  const { data } = supabase.storage
    .from("branding")
    .getPublicUrl(path);

  return data.publicUrl;
}
