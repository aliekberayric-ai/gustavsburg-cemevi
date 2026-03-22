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
    toast("Site Settings konnten nicht geladen werden.", "bad");
    return {
      site_title: "Gustavsburg Cem Evi",
      logo_url: ""
    };
  }

  return data || {
    site_title: "Gustavsburg Cem Evi",
    logo_url: ""
  };
}

export async function updateSiteSettings(patch) {
  const current = await getSiteSettings();

  if (current?.id) {
    const { error } = await supabase
      .from("site_settings")
      .update({
        ...patch,
        updated_at: new Date().toISOString()
      })
      .eq("id", current.id);

    if (error) {
      console.error(error);
      toast(error.message, "bad");
      throw error;
    }

    return;
  }

  const { error } = await supabase.from("site_settings").insert([
    {
      site_title: patch.site_title || "Gustavsburg Cem Evi",
      logo_url: patch.logo_url || null
    }
  ]);

  if (error) {
    console.error(error);
    toast(error.message, "bad");
    throw error;
  }
}

export async function uploadBrandLogo(file) {
  if (!file) {
    throw new Error("Keine Datei ausgewählt.");
  }

  const safeName = file.name.replace(/[^\w.\-]+/g, "_");
  const path = `logo/${Date.now()}_${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from("branding")
    .upload(path, file, {
      cacheControl: "3600",
      upsert: true
    });

  if (uploadError) {
    console.error(uploadError);
    toast(uploadError.message, "bad");
    throw uploadError;
  }

  const { data } = supabase.storage.from("branding").getPublicUrl(path);
  return data.publicUrl;
}
