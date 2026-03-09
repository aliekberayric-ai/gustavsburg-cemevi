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
    public_url: item.file_url,
    thumb_public_url: item.thumb_url || item.file_url
  }));
}

export async function createGalleryWithFiles({ title, status, files }) {
  const { data: gallery, error } = await supabase
    .from("galleries")
    .insert({
      title: { de: title, tr: title, en: title },
      description: { de: "", tr: "", en: "" },
      status,
      sort_order: 0
    })
    .select()
    .single();

  if (error) throw error;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const filePath = `${gallery.id}/${Date.now()}-${file.name}`;

    const { error: uploadError } = await supabase.storage
      .from("gallery")
      .upload(filePath, file);

    if (uploadError) continue;

    const { data } = supabase.storage
      .from("gallery")
      .getPublicUrl(filePath);

    await supabase.from("gallery_items").insert({
      gallery_id: gallery.id,
      caption: { de: file.name, tr: file.name, en: file.name },
      file_url: data.publicUrl,
      thumb_url: data.publicUrl,
      sort_order: i
    });
  }

  return gallery.id;
}
