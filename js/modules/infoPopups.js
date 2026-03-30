import { getSupabaseClient } from "../supabase.js";

export async function listInfoPopupsAdmin() {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("info_popups")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function getInfoPopupBySlug(slug) {
  if (!slug) return null;

  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("info_popups")
    .select("*")
    .eq("slug", slug)
    .eq("active", true)
    .maybeSingle();

  if (error) {
    console.error("Popup load error:", error);
    return null;
  }

  return data || null;
}

export async function createInfoPopup(payload) {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("info_popups")
    .insert([payload])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateInfoPopup(id, payload) {
  const supabase = getSupabaseClient();

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
  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from("info_popups")
    .delete()
    .eq("id", id);

  if (error) throw error;
  return true;
}
