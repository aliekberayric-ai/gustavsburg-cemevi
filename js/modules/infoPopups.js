import { supabase } from "../api.js";

function popupError(action, error) {
  const details = [error?.message, error?.details, error?.hint, error?.code]
    .filter(Boolean)
    .join(" | ");
  return new Error(`${action}: ${details || "Unbekannter Supabase-Fehler"}`);
}

export async function listInfoPopups() {
  const { data, error } = await supabase
    .from("info_popups")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) throw popupError("Info-Popups konnten nicht geladen werden", error);
  return data || [];
}

export async function getInfoPopupBySlug(slug) {
  const { data, error } = await supabase
    .from("info_popups")
    .select("*")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (error) throw popupError("Info-Popup konnte nicht geladen werden", error);
  return data || null;
}

export async function listInfoPopupsAdmin() {
  const { data, error } = await supabase
    .from("info_popups")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) throw popupError("Info-Popups konnten nicht geladen werden", error);
  return data || [];
}

export async function createInfoPopup(payload) {
  const { data, error } = await supabase
    .from("info_popups")
    .insert([payload])
    .select()
    .single();

  if (error) throw popupError("Info-Popup konnte nicht erstellt werden", error);
  return data;
}

export async function updateInfoPopup(id, payload) {
  const { data, error } = await supabase
    .from("info_popups")
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) throw popupError("Info-Popup konnte nicht aktualisiert werden", error);
  return data;
}

export async function deleteInfoPopup(id) {
  const { error } = await supabase
    .from("info_popups")
    .delete()
    .eq("id", id);

  if (error) throw popupError("Info-Popup konnte nicht geloescht werden", error);
  return true;
}

export async function uploadInfoPopupImage(file) {
  if (!file) return "";

  const ext = file.name.split(".").pop();
  const fileName = `${crypto.randomUUID()}.${ext}`;
  const filePath = `images/${fileName}`;

  const { error } = await supabase.storage
    .from("info-popups")
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false
    });

  if (error) throw popupError("Info-Popup-Bild konnte nicht hochgeladen werden", error);

  const { data } = supabase.storage
    .from("info-popups")
    .getPublicUrl(filePath);

  return data.publicUrl;
}
