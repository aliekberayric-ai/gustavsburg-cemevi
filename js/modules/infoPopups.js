import { supabase } from "../api.js";

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
  const { data, error } = await supabase
    .from("info_popups")
    .insert([payload])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateInfoPopup(id, payload) {
  const { data, error } = await supabase
    .from("info_popups")
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteInfoPopup(id) {
  const { error } = await supabase
    .from("info_popups")
    .delete()
    .eq("id", id);

  if (error) throw error;
  return true;
}

import { supabase } from "../api.js";

export async function getInfoPopupBySlug(slug) {
  const { data, error } = await supabase
    .from("info_popups")
    .select("*")
    .eq("slug", slug)
    .eq("is_active", true)
    .single();

  if (error) {
    console.error("Popup fetch error:", error);
    return null;
  }

  return data;
}
