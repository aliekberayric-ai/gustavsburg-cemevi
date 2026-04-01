import { supabase } from "../api.js";

// --------------------------------------------------
// LISTE (ADMIN)
// --------------------------------------------------
export async function listInfoPopupsAdmin() {
  const { data, error } = await supabase
    .from("info_popups")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return data || [];
}

// --------------------------------------------------
// CREATE
// --------------------------------------------------
export async function createInfoPopup(payload) {
  const { error } = await supabase
    .from("info_popups")
    .insert([payload]);

  if (error) throw error;
}

// --------------------------------------------------
// UPDATE
// --------------------------------------------------
export async function updateInfoPopup(id, payload) {
  const { error } = await supabase
    .from("info_popups")
    .update(payload)
    .eq("id", id);

  if (error) throw error;
}

// --------------------------------------------------
// DELETE
// --------------------------------------------------
export async function deleteInfoPopup(id) {
  const { error } = await supabase
    .from("info_popups")
    .delete()
    .eq("id", id);

  if (error) throw error;
}
