import { supabase } from "../api.js";

export async function uploadEventPreviewImage(file) {

  const filePath = `events/${Date.now()}-${file.name}`;

  const { error } = await supabase.storage
    .from("events")
    .upload(filePath, file);

  if (error) {
    console.error("Event image upload error:", error);
    throw error;
  }

  const { data } = supabase.storage
    .from("events")
    .getPublicUrl(filePath);

  return data.publicUrl;
}
