let lightboxItems = [];
let lightboxIndex = 0;
let lightboxInitialized = false;

function qs(id) {
  return document.getElementById(id);
}

function renderLightboxImage() {
  const current = lightboxItems[lightboxIndex];
  if (!current) return;

  const img = qs("lightboxImage");
  const caption = qs("lightboxCaption");
  const counter = qs("lightboxCounter");

  if (img) {
    img.src = current.public_url;
    img.alt = current.localized_caption || "";
  }

  if (caption) {
    caption.textContent = current.localized_caption || "";
  }

  if (counter) {
    counter.textContent = `${lightboxIndex + 1} / ${lightboxItems.length}`;
  }
}

function closeLightbox() {
  qs("lightbox")?.classList.add("hidden");
  document.body.classList.remove("lightbox-open");
}

function nextLightbox() {
  if (!lightboxItems.length) return;
  lightboxIndex = (lightboxIndex + 1) % lightboxItems.length;
  renderLightboxImage();
}

function prevLightbox() {
  if (!lightboxItems.length) return;
  lightboxIndex = (lightboxIndex - 1 + lightboxItems.length) % lightboxItems.length;
  renderLightboxImage();
}

export function openLightbox(items, index = 0) {
  lightboxItems = items || [];
  lightboxIndex = index;

  qs("lightbox")?.classList.remove("hidden");
  document.body.classList.add("lightbox-open");
  renderLightboxImage();
}

export function initLightbox() {
  if (lightboxInitialized) return;
  lightboxInitialized = true;

  qs("lightboxClose")?.addEventListener("click", closeLightbox);
  qs("lightboxNext")?.addEventListener("click", nextLightbox);
  qs("lightboxPrev")?.addEventListener("click", prevLightbox);

  qs("lightbox")?.addEventListener("click", (e) => {
    if (e.target?.id === "lightbox") {
      closeLightbox();
    }
  });

  document.addEventListener("keydown", (e) => {
    const isHidden = qs("lightbox")?.classList.contains("hidden");
    if (isHidden) return;

    if (e.key === "Escape") closeLightbox();
    if (e.key === "ArrowRight") nextLightbox();
    if (e.key === "ArrowLeft") prevLightbox();
  });
}
