import { supabase } from "./api.js";

export function getCurrentLang() {
  return document.documentElement.lang || "de";
}

export function pickLocalizedText(value, lang = "de") {
  if (!value) return "";
  if (typeof value === "string") return value;
  return value[lang] || value.de || value.en || value.tr || "";
}

export async function fetchGalleries() {
  const { data, error } = await supabase
    .from("galleries")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Fehler bei fetchGalleries:", error);
    return [];
  }

  const lang = getCurrentLang();
  const galleries = data || [];

  const galleriesWithCount = await Promise.all(
    galleries.map(async (gallery) => {
      const { data: items, error: itemsError, count } = await supabase
        .from("gallery_items")
        .select("*", { count: "exact" })
        .eq("gallery_id", gallery.id)
        .order("sort_order", { ascending: true })
        .limit(1);

      if (itemsError) {
        console.error("Fehler beim Laden der Galerie-Items:", itemsError);
      }

      const firstItem = items?.[0] || null;
      const coverUrl = firstItem?.thumb_url || firstItem?.file_url || "";

      return {
        ...gallery,
        localized_title: pickLocalizedText(gallery.title, lang),
        localized_description: pickLocalizedText(gallery.description, lang),
        image_count: count || 0,
        cover_url: coverUrl
      };
    })
  );

  return galleriesWithCount;
}

export async function fetchGalleryItems(galleryId) {
  const { data, error } = await supabase
    .from("gallery_items")
    .select("*")
    .eq("gallery_id", galleryId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Fehler bei fetchGalleryItems:", error);
    return [];
  }

  const lang = getCurrentLang();

  return (data || []).map((item) => ({
    ...item,
    localized_caption: pickLocalizedText(item.caption, lang),
    public_url: item.file_url || "",
    thumb_public_url: item.thumb_url || item.file_url || ""
  }));
}

export async function createGalleryWithFiles({ title, status = "active", files = [] }) {
  if (!title?.trim()) {
    throw new Error("Bitte einen Galerietitel eingeben.");
  }

  if (!files.length) {
    throw new Error("Bitte mindestens ein Bild auswählen.");
  }

  const { data: gallery, error: galleryError } = await supabase
    .from("galleries")
    .insert({
      title: {
        de: title.trim(),
        tr: title.trim(),
        en: title.trim()
      },
      description: {
        de: "",
        tr: "",
        en: ""
      },
      status,
      sort_order: 0
    })
    .select()
    .single();

  if (galleryError) {
    console.error(galleryError);
    throw new Error("Galerie konnte nicht angelegt werden.");
  }

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const safeName = file.name.replace(/\s+/g, "-");
    const filePath = `${gallery.id}/${Date.now()}-${i}-${safeName}`;

    const { error: uploadError } = await supabase.storage
      .from("gallery")
      .upload(filePath, file, { upsert: false });

    if (uploadError) {
      console.error("Upload-Fehler:", uploadError);
      continue;
    }

    const { data: publicUrlData } = supabase.storage
      .from("gallery")
      .getPublicUrl(filePath);

    const publicUrl = publicUrlData?.publicUrl || "";

    const { error: itemError } = await supabase
      .from("gallery_items")
      .insert({
        gallery_id: gallery.id,
        caption: {
          de: file.name,
          tr: file.name,
          en: file.name
        },
        file_url: publicUrl,
        thumb_url: publicUrl,
        sort_order: i
      });

    if (itemError) {
      console.error("Fehler bei gallery_items:", itemError);
    }
  }

  return gallery.id;
}
