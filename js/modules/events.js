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
    if (isMissingOptionalEventColumn(error)) {
      const { error: fallbackError } = await supabase
        .from("events")
        .insert([stripOptionalEventColumns(payload)]);

      if (!fallbackError) return;

      console.error(fallbackError);
      toast(fallbackError.message, "bad");
      throw fallbackError;
    }

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
    if (isMissingOptionalEventColumn(error)) {
      const { error: fallbackError } = await supabase
        .from("events")
        .update(stripOptionalEventColumns(patch))
        .eq("id", id);

      if (!fallbackError) return;

      console.error(fallbackError);
      toast(fallbackError.message, "bad");
      throw fallbackError;
    }

    console.error(error);
    toast(error.message, "bad");
    throw error;
  }
}

function isMissingOptionalEventColumn(error) {
  const message = String(error?.message || "");
  return (
    message.includes("preview_image_url") ||
    message.includes("display_type") ||
    message.includes("schema cache")
  );
}

function stripOptionalEventColumns(payload) {
  const { preview_image_url, display_type, ...basePayload } = payload;
  return basePayload;
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

  const { error } = await supabase.storage
    .from("events")
    .upload(filePath, file);

  if (error) throw error;

  const { data } = supabase.storage
    .from("events")
    .getPublicUrl(filePath);

  return data?.publicUrl;
}
