import { supabase } from "../api.js";
import { toast } from "../ui.js";

/** Public: submit form (no login needed) */
export async function submitForm(form_type, payload){
  const { error } = await supabase.from("form_submissions").insert([{ form_type, payload }]);
  if(error){ console.error(error); toast(error.message, "bad"); throw error; }
}

/** Admin/editor: list submissions */
export async function listFormSubmissions(){
  const { data, error } = await supabase
    .from("form_submissions")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  if(error){ console.error(error); toast("Formulare laden fehlgeschlagen", "bad"); return []; }
  return data ?? [];
}

export async function updateFormStatus(id, status){
  const { error } = await supabase.from("form_submissions").update({ status }).eq("id", id);
  if(error){ console.error(error); toast(error.message, "bad"); throw error; }
}
