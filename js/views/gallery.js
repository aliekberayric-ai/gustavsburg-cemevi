import { t, getLang } from "../i18n.js";
import { listGalleriesPublic } from "../modules/gallery.js";
import { fetchGalleryItems } from "../galleryService.js";
import { openLightbox, initLightbox } from "../lightbox.js";
import { escapeHtml } from "../ui.js";

async function openGalleryDetail(root, gallery) {
  const lang = getLang();
  const items = await fetchGalleryItems(gallery.id);

  const detail = root.querySelector("#galleryDetail");
  const titleEl = root.querySelector("#galleryDetailTitle");
  const metaEl = root.querySelector("#galleryDetailMeta");
  const wrap = root.querySelector("#galleryItems");

  if (!detail || !titleEl || !metaEl || !wrap) return;

  const title = gallery.title?.[lang] ?? gallery.title?.de ?? "Galerie";

  detail.classList.remove("hidden");
  titleEl.textContent = title;
  metaEl.textContent = `${items.length} Bilder`;
  wrap.innerHTML = "";

  if (!items.length) {
    wrap.innerHTML = `<div class="empty-state">In dieser Galerie sind noch keine Bilder.</div>`;
    return;
  }

  items.forEach((item, index) => {
    const btn = document.createElement("button");
    btn.className = "gallery-thumb";
    btn.type = "button";
    btn.innerHTML = `
      <img src="${item.thumb_public_url}" alt="${escapeHtml(item.localized_caption || "")}">
      <span class="gallery-thumb-overlay">Ansehen</span>
    `;

    btn.addEventListener("click", () => {
      openLightbox(items, index);
    });

    wrap.appendChild(btn);
  });

  detail.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}

export async function renderGallery(root) {
  const galleries = await listGalleriesPublic();
  const lang = getLang();

  root.innerHTML = `
    <div class="page">
      <h1 data-i18n="gallery.h1">${t("gallery.h1")}</h1>
      <p data-i18n="gallery.p">${t("gallery.p")}</p>

      <div class="gallery-grid" style="margin-top:16px">
        ${
          galleries.map((g) => {
            const title = g.title?.[lang] ?? g.title?.de ?? "—";
            const desc = g.description?.[lang] ?? g.description?.de ?? "";
            const badge = g.status === "archived"
              ? `<span class="gallery-status-badge archived">${t("gallery.archived")}</span>`
              : `<span class="gallery-status-badge active">${t("gallery.active")}</span>`;

            return `
              <article class="gallery-card" data-gallery-id="${escapeHtml(g.id)}">
                <div class="gallery-card-image-wrap">
                  <div class="gallery-card-image" style="background:linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02));display:flex;align-items:center;justify-content:center;">
                    <span style="opacity:.75;font-weight:700">${escapeHtml(title)}</span>
                  </div>
                  ${badge}
                </div>

                <div class="gallery-card-body">
                  <h3 class="gallery-card-title">${escapeHtml(title)}</h3>
                  <div class="gallery-card-meta">${escapeHtml(desc)}</div>
                  <div style="margin-top:10px;color:var(--muted)">
                    ${t("gallery.hintAdmin")}
                  </div>
                </div>
              </article>
            `;
          }).join("")
        }
      </div>

      <div id="galleryDetail" class="gallery-detail hidden">
        <div class="gallery-detail-head">
          <h3 id="galleryDetailTitle">Galerie</h3>
          <p id="galleryDetailMeta">0 Bilder</p>
        </div>

        <div id="galleryItems" class="gallery-items-grid"></div>
      </div>
    </div>
  `;

  root.querySelectorAll("[data-gallery-id]").forEach((card) => {
    card.addEventListener("click", async () => {
      const id = card.getAttribute("data-gallery-id");
      const gallery = galleries.find((g) => g.id === id);
      if (!gallery) return;

      await openGalleryDetail(root, gallery);
    });
  });

    initLightbox();
}
