import { supabase } from "../api.js";
import { toast } from "../ui.js";

export async function listAuditLogs(){
  const { data, error } = await supabase
    .from("audit_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(120);

  if(error){ console.error(error); toast("Audit logs laden fehlgeschlagen", "bad"); return []; }
  return data ?? [];
}
