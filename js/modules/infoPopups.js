import { supabase, SUPABASE_ANON_KEY, SUPABASE_URL } from "../api.js";

function popupError(action, error) {
  const details = [error?.message, error?.details, error?.hint, error?.code]
    .filter(Boolean)
    .join(" | ");
  return new Error(`${action}: ${details || "Unbekannter Supabase-Fehler"}`);
}

function withTimeout(promise, action, ms = 12000) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error(`${action}: Keine Antwort von Supabase nach ${Math.round(ms / 1000)} Sekunden. Bitte Internet, Login und Supabase-Rechte prüfen.`));
    }, ms);
  });

  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

async function callSaveInfoPopup(params, action) {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData?.session?.access_token;

  if (!token) {
    throw new Error(`${action}: Du bist nicht mehr eingeloggt. Bitte im Admin-Bereich neu anmelden.`);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/save_info_popup`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(params),
      signal: controller.signal
    });

    const text = await response.text();

    if (!response.ok) {
      let message = text;
      try {
        const parsed = JSON.parse(text);
        message = [parsed.message, parsed.details, parsed.hint, parsed.code]
          .filter(Boolean)
          .join(" | ");
      } catch {
        // Keep raw response text.
      }

      throw new Error(`${action}: ${message || `HTTP ${response.status}`}`);
    }

    return text ? JSON.parse(text) : true;
  } catch (err) {
    if (err?.name === "AbortError") {
      throw new Error(`${action}: Supabase antwortet nicht. Bitte SQL-Funktion save_info_popup prüfen und danach neu einloggen.`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

export async function listInfoPopups() {
  const { data, error } = await supabase
    .from("info_popups")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) throw popupError("Info-Popups konnten nicht geladen werden", error);
  return data || [];
}

export async function getInfoPopupBySlug(slug) {
  const { data, error } = await supabase
    .from("info_popups")
    .select("*")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (error) throw popupError("Info-Popup konnte nicht geladen werden", error);
  return data || null;
}

export async function listInfoPopupsAdmin() {
  const { data, error } = await supabase
    .from("info_popups")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) throw popupError("Info-Popups konnten nicht geladen werden", error);
  return data || [];
}

export async function createInfoPopup(payload) {
  await callSaveInfoPopup(
    {
      p_id: null,
      p_slug: payload.slug,
      p_title: payload.title,
      p_content: payload.content,
      p_image_url: payload.image_url || "",
      p_sort_order: Number(payload.sort_order ?? 0),
      p_is_active: payload.is_active !== false
    },
    "Info-Popup konnte nicht erstellt werden"
  );
  return true;
}

export async function updateInfoPopup(id, payload) {
  await callSaveInfoPopup(
    {
      p_id: id,
      p_slug: payload.slug,
      p_title: payload.title,
      p_content: payload.content,
      p_image_url: payload.image_url || "",
      p_sort_order: Number(payload.sort_order ?? 0),
      p_is_active: payload.is_active !== false
    },
    "Info-Popup konnte nicht aktualisiert werden"
  );
  return true;
}

export async function deleteInfoPopup(id) {
  const { error } = await supabase
    .from("info_popups")
    .delete()
    .eq("id", id);

  if (error) throw popupError("Info-Popup konnte nicht geloescht werden", error);
  return true;
}

export async function uploadInfoPopupImage(file) {
  if (!file) return "";

  const ext = file.name.split(".").pop();
  const fileName = `${crypto.randomUUID()}.${ext}`;
  const filePath = `images/${fileName}`;

  const { error } = await supabase.storage
    .from("info-popups")
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false
    });

  if (error) throw popupError("Info-Popup-Bild konnte nicht hochgeladen werden", error);

  const { data } = supabase.storage
    .from("info-popups")
    .getPublicUrl(filePath);

  return data.publicUrl;
}
