import { supabase } from "./api.js";

export async function fetchGalleryItems(galleryId) {
  const { data, error } = await supabase
    .from("gallery_items")
    .select("*")
    .eq("gallery_id", galleryId)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("Gallery items error:", error);
    return [];
  }

  return (data || []).map((item) => ({
    ...item,
    localized_caption:
      item.caption?.de || item.caption?.en || item.caption?.tr || "",
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
      title: { de: title.trim(), tr: title.trim(), en: title.trim() },
      description: { de: "", tr: "", en: "" },
      status,
      sort_order: 0
    })
    .select()
    .single();

  if (galleryError) {
    console.error("Galerie-Fehler:", galleryError);
    throw galleryError;
  }

  let successCount = 0;
  let firstPublicUrl = "";

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

    if (!firstPublicUrl) {
      firstPublicUrl = publicUrl;
    }

    const { error: itemError } = await supabase
      .from("gallery_items")
      .insert({
        gallery_id: gallery.id,
        caption: { de: file.name, tr: file.name, en: file.name },
        file_url: publicUrl,
        thumb_url: publicUrl,
        sort_order: i
      });

    if (itemError) {
      console.error("gallery_items Fehler:", itemError);
      continue;
    }

    successCount++;
  }

  if (successCount === 0) {
    throw new Error("Kein Bild konnte gespeichert werden. Bitte Storage und gallery_items prüfen.");
  }

  if (firstPublicUrl) {
    const { error: coverError } = await supabase
      .from("galleries")
      .update({ cover_url: firstPublicUrl })
      .eq("id", gallery.id);

    if (coverError) {
      console.error("Coverbild Fehler:", coverError);
    }
    return gallery.id;
  }

  export async function updateGalleryItemOrder(items = []) {
  for (let i = 0; i < items.length; i++) {
    const item = items[i];

    const { error } = await supabase
      .from("gallery_items")
      .update({ sort_order: i })
      .eq("id", item.id);

    if (error) {
      console.error("Sortierung Fehler:", error);
    }
  }
}
  return gallery.id;
}
