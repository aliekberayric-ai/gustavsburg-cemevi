import { supabase } from "../api.js";
import { toast } from "../ui.js";

export async function listEventsPublic() {
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .order("start_time", { ascending: true });

  if (error) {
    console.error(error);
    toast("Events laden fehlgeschlagen", "bad");
    return [];
  }

  return data ?? [];
}

export async function createEvent(payload) {
  const { error } = await supabase.from("events").insert([payload]);
  if (error) {
    console.error(error);
    toast(error.message, "bad");
    throw error;
  }
}

export async function updateEvent(id, patch) {
  const { error } = await supabase
    .from("events")
    .update(patch)
    .eq("id", id);

  if (error) {
    console.error(error);
    toast(error.message, "bad");
    throw error;
  }
}

export async function deleteEvent(id) {
  const { error } = await supabase
    .from("events")
    .delete()
    .eq("id", id);

  if (error) {
    console.error(error);
    toast(error.message, "bad");
    throw error;
  }
}

export async function uploadEventPreviewImage(file) {
  if (!file) return "";

  const safeName = file.name.replace(/\s+/g, "-");
  const filePath = `events/${Date.now()}-${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from("events")
    .upload(filePath, file, { upsert: false });

  if (uploadError) {
    console.error("Event image upload error:", uploadError);
    throw uploadError;
  }

  const { data } = supabase.storage
    .from("events")
    .getPublicUrl(filePath);

  return data?.publicUrl || "";
}
