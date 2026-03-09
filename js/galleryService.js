import { supabase } from "./api.js";

export function slugify(text = "") {
  return text
    .toLowerCase()
    .trim()
    .replace(/[ä]/g, "ae")
    .replace(/[ö]/g, "oe")
    .replace(/[ü]/g, "ue")
    .replace(/[ß]/g, "ss")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export function getPublicUrl(path) {
  if (!path) return "";
  const { data } = supabase.storage.from("gallery").getPublicUrl(path);
  return data?.publicUrl || "";
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

  const galleries = data || [];

  const galleriesWithCount = await Promise.all(
    galleries.map(async (gallery) => {
      const { count, error: countError } = await supabase
        .from("gallery_items")
        .select("id", { count: "exact", head: true })
        .eq("gallery_id", gallery.id);

      if (countError) {
        console.error("Fehler beim Zählen:", countError);
      }

      return {
        ...gallery,
        image_count: count || 0,
        cover_url: getPublicUrl(gallery.cover_image_path)
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

  return (data || []).map((item) => ({
    ...item,
    public_url: getPublicUrl(item.image_path)
  }));
}

export async function createGalleryWithFiles({ title, status = "active", files = [] }) {
  if (!title?.trim()) {
    throw new Error("Bitte einen Galerietitel eingeben.");
  }

  if (!files.length) {
    throw new Error("Bitte mindestens ein Bild auswählen.");
  }

  const slugBase = slugify(title);
  const slug = `${slugBase}-${Date.now()}`;

  const { data: gallery, error: galleryError } = await supabase
    .from("galleries")
    .insert({
      title: title.trim(),
      slug,
      status
    })
    .select()
    .single();

  if (galleryError) {
    console.error(galleryError);
    throw new Error("Galerie konnte nicht angelegt werden.");
  }

  let firstImagePath = null;

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

    if (!firstImagePath) {
      firstImagePath = filePath;
    }

    const { error: itemError } = await supabase
      .from("gallery_items")
      .insert({
        gallery_id: gallery.id,
        title: file.name,
        image_path: filePath,
        sort_order: i
      });

    if (itemError) {
      console.error("Fehler bei gallery_items:", itemError);
    }
  }

  if (firstImagePath) {
    const { error: coverError } = await supabase
      .from("galleries")
      .update({ cover_image_path: firstImagePath })
      .eq("id", gallery.id);

    if (coverError) {
      console.error("Fehler beim Coverbild:", coverError);
    }
  }

  return gallery.id;
}
