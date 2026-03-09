import { t, getLang } from "../i18n.js";
import { listGalleriesPublic } from "../modules/gallery.js";
import { fetchGalleryItems } from "../js/galleryService.js";
import { openLightbox } from "../js/lightbox.js";
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

export async function renderGallery(root){
  const galleries = await listGalleriesPublic();

  root.innerHTML = `
    <div class="page">
      <h1 data-i18n="gallery.h1">${t("gallery.h1")}</h1>
      <p data-i18n="gallery.p">${t("gallery.p")}</p>

      <div class="grid grid-2" style="margin-top:12px">
        ${
          galleries.map(g=>{
            const lang = getLang();
            const title = g.title?.[lang] ?? g.title?.de ?? "—";
            const desc = g.description?.[lang] ?? g.description?.de ?? "";
            const badge = g.status === "archived"
              ? `<span class="badge badge--warn">${t("gallery.archived")}</span>`
              : `<span class="badge badge--ok">${t("gallery.active")}</span>`;

            return `
              <div class="card card__pad">
                <div style="display:flex;justify-content:space-between;gap:10px;align-items:center">
                  <div>
                    <div style="font-weight:780;font-size:18px">${escapeHtml(title)}</div>
                    <div style="color:var(--muted);margin-top:4px">${escapeHtml(desc)}</div>
                  </div>
                  ${badge}
                </div>
                <div style="margin-top:10px;color:var(--muted)">
                  ${t("gallery.hintAdmin")}
                </div>
              </div>
            `;
          }).join("")
        }
      </div>
    </div>
  `;
}
