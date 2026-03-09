let lightboxItems = [];
let lightboxIndex = 0;

function qs(id) {
  return document.getElementById(id);
}

function renderLightboxImage() {
  const current = lightboxItems[lightboxIndex];
  if (!current) return;

  qs("lightboxImage").src = current.public_url;
  qs("lightboxCaption").textContent = current.localized_caption || "";
  qs("lightboxCounter").textContent =
    `${lightboxIndex + 1} / ${lightboxItems.length}`;
}

export function openLightbox(items, index = 0) {
  lightboxItems = items;
  lightboxIndex = index;

  qs("lightbox").classList.remove("hidden");
  renderLightboxImage();
}

export function initLightbox() {
  qs("lightboxClose")?.addEventListener("click", () => {
    qs("lightbox").classList.add("hidden");
  });

  qs("lightboxNext")?.addEventListener("click", () => {
    lightboxIndex =
      (lightboxIndex + 1) % lightboxItems.length;
    renderLightboxImage();
  });

  qs("lightboxPrev")?.addEventListener("click", () => {
    lightboxIndex =
      (lightboxIndex - 1 + lightboxItems.length) %
      lightboxItems.length;
    renderLightboxImage();
  });
}
