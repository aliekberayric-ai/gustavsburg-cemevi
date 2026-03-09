import { t, getLang } from "../i18n.js";
import { listGalleriesPublic } from "../modules/gallery.js";
import { fetchGalleryItems } from "../js/galleryService.js";
import { openLightbox } from "../js/lightbox.js";
import { escapeHtml } from "../ui.js";

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
