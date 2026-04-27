import { supabase } from "../api.js";

export async function listHomeTiles() {
  const { data, error } = await supabase
    .from("home_tiles")
    .select("*")
    .eq("active", true)
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function listHomeTilesAdmin() {
  const { data, error } = await supabase
    .from("home_tiles")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function createHomeTile(payload) {
  const { data, error } = await supabase
    .from("home_tiles")
    .insert([payload])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateHomeTile(id, payload) {
  const { data, error } = await supabase
    .from("home_tiles")
    .update(payoad)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteHomeTile(id) {
  const { error } = await supabase
    .from("home_tiles")
    .delete()
    .eq("id", id);

  if (error) throw error;
  return true;
}

export async function uploadTileImage(file) {
  if (!file) throw new Error("Keine Datei ausgewählt");

  const safeName = file.name.replace(/\s+/g, "_");
  const path = `tiles/${Date.now()}_${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from("branding")
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false
    });

  if (uploadError) throw uploadError;

  const { data } = supabase.storage
    .from("branding")
    .getPublicUrl(path);

  return data?.publicUrl || "";
}
