import { supabase } from "../api.js";
import { toast } from "../ui.js";

/** Public: visible team members */
export async function listPeoplePublic() {
  const { data, error } = await supabase
    .from("people")
    .select("*")
    .eq("is_visible", true)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error(error);
    toast("Team laden fehlgeschlagen", "bad");
  }

  return data ?? [];
}

/** Admin/editor: create person */
export async function createPerson(payload) {
  const { error } = await supabase.from("people").insert(payload);
  if (error) {
    console.error(error);
    toast(error.message, "bad");
    throw error;
  }
}

/** Admin/editor: update person */
export async function updatePerson(id, patch) {
  const { error } = await supabase
    .from("people")
    .update(patch)
    .eq("id", id);

  if (error) {
    console.error(error);
    toast(error.message, "bad");
    throw error;
  }
}

/** Admin: delete person */
export async function deletePerson(id) {
  const { error } = await supabase
    .from("people")
    .delete()
    .eq("id", id);

  if (error) {
    console.error(error);
    toast(error.message, "bad");
    throw error;
  }
}

/** People - Select image */
export async function uploadPersonImage(file) {
  if (!file) return "";

  const safeName = file.name.replace(/\s+/g, "-");
  const filePath = `people/${Date.now()}-${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from("people")
    .upload(filePath, file, { upsert: false });

  if (uploadError) {
    console.error("Person image upload error:", uploadError);
    throw uploadError;
  }

  const { data } = supabase.storage
    .from("people")
    .getPublicUrl(filePath);

  return data?.publicUrl || "";
}
