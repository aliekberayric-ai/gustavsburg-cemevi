let lightboxItems = [];
let lightboxIndex = 0;

function qs(id) {
  return document.getElementById(id);
}

function renderLightboxImage() {
  if (!lightboxItems.length) return;

  const current = lightboxItems[lightboxIndex];
  const img = qs("lightboxImage");
  const counter = qs("lightboxCounter");
  const caption = qs("lightboxCaption");

  img.src = current.public_url;
  img.alt = current.title || "";
  counter.textContent = `${lightboxIndex + 1} / ${lightboxItems.length}`;
  caption.textContent = current.title || "";
}

export function openLightbox(items, startIndex = 0) {
  lightboxItems = items || [];
  lightboxIndex = startIndex;

  qs("lightbox").classList.remove("hidden");
  document.body.classList.add("lightbox-open");
  renderLightboxImage();
}

export function closeLightbox() {
  qs("lightbox").classList.add("hidden");
  document.body.classList.remove("lightbox-open");
}

export function nextLightboxImage() {
  if (!lightboxItems.length) return;
  lightboxIndex = (lightboxIndex + 1) % lightboxItems.length;
  renderLightboxImage();
}

export function prevLightboxImage() {
  if (!lightboxItems.length) return;
  lightboxIndex = (lightboxIndex - 1 + lightboxItems.length) % lightboxItems.length;
  renderLightboxImage();
}

export function initLightbox() {
  qs("lightboxClose")?.addEventListener("click", closeLightbox);
  qs("lightboxNext")?.addEventListener("click", nextLightboxImage);
  qs("lightboxPrev")?.addEventListener("click", prevLightboxImage);

  qs("lightbox")?.addEventListener("click", (e) => {
    if (e.target.id === "lightbox") {
      closeLightbox();
    }
  });

  document.addEventListener("keydown", (e) => {
    const isHidden = qs("lightbox")?.classList.contains("hidden");
    if (isHidden) return;

    if (e.key === "Escape") closeLightbox();
    if (e.key === "ArrowRight") nextLightboxImage();
    if (e.key === "ArrowLeft") prevLightboxImage();
  });
}
