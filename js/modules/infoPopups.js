import { Supabase } from "../supabase.js";

export async function getInfoPopupBySlug(slug) {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("info_popups")
    .select("*")
    .eq("slug", slug)
    .eq("active", true)
    .maybeSingle();

  if (error) {
    console.error(error);
    return null;
  }

  return data;
}
