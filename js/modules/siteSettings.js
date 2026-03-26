import { supabase } from "../api.js";
import { toast } from "../ui.js";

const DEFAULT_SETTINGS = {
  id: 1,
  site_title: "Gustavsburg Cem Evi",
  logo_url: ""
};

/* -----------------------------------------------------------
   HELPERS
----------------------------------------------------------- */

function sanitizeFileName(name = "logo") {
  return String(name)
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9.\-_]/g, "");
}

/* -----------------------------------------------------------
   GET SITE SETTINGS
----------------------------------------------------------- */

export async function getSiteSettings() {
  try {
    const { data, error } = await supabase
      .from("site_settings")
      .select("*")
      .order("id", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("getSiteSettings error:", error);
      return { ...DEFAULT_SETTINGS };
    }

    return {
      ...DEFAULT_SETTINGS,
      ...(data || {})
    };
  } catch (err) {
    console.error("getSiteSettings catch:", err);
    return { ...DEFAULT_SETTINGS };
  }
}

/* -----------------------------------------------------------
   UPDATE / SAVE SITE SETTINGS
----------------------------------------------------------- */

export async function updateSiteSettings(patch = {}) {
  try {
    const current = await getSiteSettings();

    const payload = {
      ...current,
      ...patch,
      id: current?.id || DEFAULT_SETTINGS.id
    };

    const { data, error } = await supabase
      .from("site_settings")
      .upsert([payload], { onConflict: "id" })
      .select()
      .single();

    if (error) {
      console.error("updateSiteSettings error:", error);
      toast("Seiteneinstellungen konnten nicht gespeichert werden", "bad");
      throw error;
    }

    toast("Seiteneinstellungen gespeichert", "ok");
    return data;
  } catch (err) {
    console.error("updateSiteSettings catch:", err);
    throw err;
  }
}

/* -----------------------------------------------------------
   UPLOAD BRAND LOGO
----------------------------------------------------------- */

export async function uploadBrandLogo(file) {
  try {
    if (!file) {
      throw new Error("Keine Datei ausgewählt");
    }

    const safeName = sanitizeFileName(file.name || "logo.png");
    const path = `logo/${Date.now()}_${safeName}`;

    const { error: uploadError } = await supabase.storage
      .from("branding")
      .upload(path, file, {
        cacheControl: "3600",
        upsert: true
      });

    if (uploadError) {
      console.error("uploadBrandLogo upload error:", uploadError);
      toast("Logo konnte nicht hochgeladen werden", "bad");
      throw uploadError;
    }

    const { data: publicData } = supabase.storage
      .from("branding")
      .getPublicUrl(path);

    const publicUrl = publicData?.publicUrl || "";

    if (!publicUrl) {
      throw new Error("Keine öffentliche URL für das Logo erhalten");
    }

    toast("Logo erfolgreich hochgeladen", "ok");
    return publicUrl;
  } catch (err) {
    console.error("uploadBrandLogo catch:", err);
    throw err;
  }
}
