import { supabase } from "../api.js";

export async function getInfoPopupBySlug(slug) {
  console.log("Popup geladen für slug:", slug);

  return {
    title: {
      de: "Test Popup DE",
      tr: "Test Popup TR",
      en: "Test Popup EN"
    },
    content: {
      de: "Das ist ein Testinhalt auf Deutsch.",
      tr: "Bu Türkçe test içeriğidir.",
      en: "This is a test content in English."
    },
    image_url: ""
  };
}
export async function getInfoPopupBySlug(slug) {
  const { data, error } = await supabase
    .from("info_popups")
    .select("*")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (error) throw error;
  return data || null;
}

export async function listInfoPopupsAdmin() {
  const { data, error } = await supabase
    .from("info_popups")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function createInfoPopup(payload) {
  const { error } = await supabase
    .from("info_popups")
    .insert([payload]);

  if (error) throw error;
}

export async function updateInfoPopup(id, payload) {
  const { error } = await supabase
    .from("info_popups")
    .update(payload)
    .eq("id", id);

  if (error) throw error;
}

export async function deleteInfoPopup(id) {
  const { error } = await supabase
    .from("info_popups")
    .delete()
    .eq("id", id);

  if (error) throw error;
}
