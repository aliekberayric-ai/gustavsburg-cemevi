import { supabase } from "../api.js";
import { toast } from "../ui.js";

/** Public: list events for calendar */
export async function listEventsPublic(){
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .order("start_time", { ascending: true });

  if(error){ console.error(error); toast("Events laden fehlgeschlagen", "bad"); return []; }
  return data ?? [];
}

/** Admin/editor: create event */
export async function createEvent(payload){
  const { error } = await supabase.from("events").insert([payload]);
  if(error){ console.error(error); toast(error.message, "bad"); throw error; }
}

/** Admin/editor: update event */
export async function updateEvent(id, patch){
  const { error } = await supabase.from("events").update(patch).eq("id", id);
  if(error){ console.error(error); toast(error.message, "bad"); throw error; }
}

/** Admin: delete event */
export async function deleteEvent(id){
  const { error } = await supabase.from("events").delete().eq("id", id);
  if(error){ console.error(error); toast(error.message, "bad"); throw error; }
}
export async function uploadEventPreviewImage(file) {
  if (!file) return "";

  const safeName = file.name.replace(/\s+/g, "-");
  const filePath = `event-${Date.now()}-${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from("event-previews")
    .upload(filePath, file, { upsert: false });

  if (uploadError) {
    console.error(uploadError);
    toast("Event-Bild Upload fehlgeschlagen", "bad");
    throw uploadError;
  }

  const { data } = supabase.storage
    .from("event-previews")
    .getPublicUrl(filePath);

  return data?.publicUrl || "";
}
