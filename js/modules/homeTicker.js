import { supabase } from "../api.js";
import { toast } from "../ui.js";

export async function listHomeTicker() {
  const { data, error } = await supabase
    .from("home_ticker")
    .select("*")
    .eq("active", true)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error(error);
    toast("Ticker laden fehlgeschlagen", "bad");
    return [];
  }

  return data ?? [];
}

export async function listHomeTickerAdmin() {
  const { data, error } = await supabase
    .from("home_ticker")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) {
    console.error(error);
    toast("Ticker laden fehlgeschlagen", "bad");
    return [];
  }

  return data ?? [];
}

export async function createHomeTicker(payload) {
  const { error } = await supabase
    .from("home_ticker")
    .insert([payload]);

  if (error) {
    console.error(error);
    toast(error.message, "bad");
    throw error;
  }
}

export async function updateHomeTicker(id, patch) {
  const { error } = await supabase
    .from("home_ticker")
    .update(patch)
    .eq("id", id);

  if (error) {
    console.error(error);
    toast(error.message, "bad");
    throw error;
  }
}

export async function deleteHomeTicker(id) {
  const { error } = await supabase
    .from("home_ticker")
    .delete()
    .eq("id", id);

  if (error) {
    console.error(error);
    toast(error.message, "bad");
    throw error;
  }
}
