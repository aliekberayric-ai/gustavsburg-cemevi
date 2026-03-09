import { fetchGalleries, fetchGalleryItems } from "./galleryService.js";
import { openLightbox, initLightbox } from "./lightbox.js";

function badgeLabel(status) {
  return status === "archived" ? "Archiv" : "Aktiv";
}

function getEmptyCover() {
  return "data:image/svg+xml;utf8," + encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="800" height="500" viewBox="0 0 800 500">
      <rect width="800" height="500" fill="#1b1b22"/>
      <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"
            fill="#cfcfe8" font-size="32" font-family="Arial, sans-serif">
        Keine Vorschau
      </text>
    </svg>
  `);
}

export async function renderGalleryOverview() {
  const list = document.getElementById("galleryList");
  if (!list) return;

  const galleries = await fetchGalleries();
  list.innerHTML = "";

  if (!galleries.length) {
    list.innerHTML = `<div class="empty-state">Noch keine Galerien vorhanden.</div>`;
    return;
  }

  galleries.forEach((gallery) => {
    const card = document.createElement("article");
    card.className = "gallery-card";

    const cover = gallery.cover_url || getEmptyCover();

    card.innerHTML = `
      <div class="gallery-card-image-wrap">
        <img class="gallery-card-image" src="${cover}" alt="${gallery.title}">
        <span class="gallery-status-badge ${gallery.status === "archived" ? "archived" : "active"}">
          ${badgeLabel(gallery.status)}
        </span>
      </div>
      <div class="gallery-card-body">
        <h3 class="gallery-card-title">${gallery.title}</h3>
        <div class="gallery-card-meta">
          <span>${gallery.image_count} Bilder</span>
        </div>
      </div>
    `;

    card.addEventListener("click", async () => {
      await renderGalleryItems(gallery.id, gallery.title, gallery.image_count);
      document.getElementById("galleryDetail")?.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    });

    list.appendChild(card);
  });
}

export async function renderGalleryItems(galleryId, title = "", imageCount = 0) {
  const detail = document.getElementById("galleryDetail");
  const detailTitle = document.getElementById("galleryDetailTitle");
  const detailMeta = document.getElementById("galleryDetailMeta");
  const itemsWrap = document.getElementById("galleryItems");

  if (!detail || !itemsWrap) return;

  detail.classList.remove("hidden");
  detailTitle.textContent = title || "Galerie";
  detailMeta.textContent = `${imageCount} Bilder`;

  const items = await fetchGalleryItems(galleryId);
  itemsWrap.innerHTML = "";

  if (!items.length) {
    itemsWrap.innerHTML = `<div class="empty-state">In dieser Galerie sind noch keine Bilder.</div>`;
    return;
  }

  items.forEach((item, index) => {
    const btn = document.createElement("button");
    btn.className = "gallery-thumb";
    btn.type = "button";
    btn.innerHTML = `
      <img src="${item.public_url}" alt="${item.title || ""}">
      <span class="gallery-thumb-overlay">Ansehen</span>
    `;

    btn.addEventListener("click", () => {
      openLightbox(items, index);
    });

    itemsWrap.appendChild(btn);
  });
}

export function initGalleryPage() {
  initLightbox();
  renderGalleryOverview();
}
