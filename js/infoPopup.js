import { getLang } from "./i18n.js";
import { getInfoPopupBySlug } from "./modules/infoPopups.js";

function pickLocalized(obj, lang) {
  if (!obj) return "";
  if (typeof obj === "string") return obj;
  return obj?.[lang] || obj?.de || obj?.tr || obj?.en || "";
}

export function initInfoPopup() {
  const modal = document.querySelector("#infoPopupModal");
  const titleEl = document.querySelector("#infoPopupTitle");
  const contentEl = document.querySelector("#infoPopupContent");
  const imageWrap = document.querySelector("#infoPopupImageWrap");
  const imageEl = document.querySelector("#infoPopupImage");

  if (!modal || !titleEl || !contentEl || !imageWrap || !imageEl) {
    console.warn("Popup Elemente nicht gefunden");
    return;
  }

  function closePopup() {
    modal.classList.add("hidden");
  }

  async function openPopup(slug) {
    try {
      const popup = await getInfoPopupBySlug(slug);
      if (!popup) return;

      const lang = getLang();

      titleEl.textContent = pickLocalized(popup.title, lang);
      contentEl.textContent = pickLocalized(popup.content, lang);

      if (popup.image_url) {
        imageEl.src = popup.image_url;
        imageWrap.classList.remove("hidden");
      } else {
        imageWrap.classList.add("hidden");
      }

      modal.classList.remove("hidden");
    } catch (err) {
      console.error(err);
    }
  }

  document.addEventListener("click", (e) => {
    const btn = e.target.closest(".home-popup-btn");
    if (!btn) return;

    const slug = btn.dataset.popupSlug;
    openPopup(slug);
  });

  document.querySelectorAll("[data-popup-close]").forEach(el => {
    el.addEventListener("click", closePopup);
  });
}
