import { supabase } from "../api.js";
import { toast } from "../ui.js";

export async function listHomeTiles() {
  const { data, error } = await supabase
    .from("home_tiles")
    .select("*")
    .eq("active", true)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error(error);
    toast("Kacheln laden fehlgeschlagen", "bad");
    return [];
  }

  return data ?? [];
}

export async function listHomeTilesAdmin() {
  const { data, error } = await supabase
    .from("home_tiles")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) {
    console.error(error);
    toast("Kacheln laden fehlgeschlagen", "bad");
    return [];
  }

  return data ?? [];
}

export async function createHomeTile(payload) {
  const { error } = await supabase.from("home_tiles").insert([payload]);
  if (error) {
    console.error(error);
    toast(error.message, "bad");
    throw error;
  }
}

export async function updateHomeTile(id, patch) {
  const { error } = await supabase
    .from("home_tiles")
    .update(patch)
    .eq("id", id);

  if (error) {
    console.error(error);
    toast(error.message, "bad");
    throw error;
  }
}

export async function deleteHomeTile(id) {
  const { error } = await supabase
    .from("home_tiles")
    .delete()
    .eq("id", id);

  if (error) {
    console.error(error);
    toast(error.message, "bad");
    throw error;
  }
}
