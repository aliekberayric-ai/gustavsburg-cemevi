import { supabase } from "../api.js";
import { toast } from "../ui.js";

export async function listGalleriesPublic(){
  const { data, error } = await supabase
    .from("galleries")
    .select("*")
    .order("sort_order", { ascending: true });

  if(error){ console.error(error); toast("Galerien laden fehlgeschlagen", "bad"); return []; }
  return data ?? [];
}

export async function createGallery(payload){
  const { error } = await supabase.from("galleries").insert([payload]);
  if(error){ console.error(error); toast(error.message, "bad"); throw error; }
}

export async function updateGallery(id, patch){
  const { error } = await supabase.from("galleries").update(patch).eq("id", id);
  if(error){ console.error(error); toast(error.message, "bad"); throw error; }
}

export async function deleteGallery(id){
  const { error } = await supabase.from("galleries").delete().eq("id", id);
  if(error){ console.error(error); toast(error.message, "bad"); throw error; }
}
