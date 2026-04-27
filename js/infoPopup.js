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

  if (!modal || !titleEl || !contentEl) {
    console.warn("Popup fehlt im HTML");
    return;
  }

  function closePopup() {
    modal.classList.add("hidden");
    titleEl.textContent = "";
    contentEl.innerHTML = "";
    if (imageEl) imageEl.src = "";
    if (imageWrap) imageWrap.classList.add("hidden");
  }

  async function openPopup(slug) {
    try {
      if (!slug) return;

      const popup = await getInfoPopupBySlug(slug);

      if (!popup) {
        console.warn("Popup nicht gefunden:", slug);
        return;
      }

      const lang = getLang();

      titleEl.textContent = pickLocalized(popup.title, lang);
      contentEl.innerHTML = pickLocalized(popup.content, lang).replace(/\n/g, "<br>");

      if (popup.image_url && imageEl && imageWrap) {
        imageEl.src = popup.image_url;
        imageWrap.classList.remove("hidden");
      } else if (imageWrap) {
        imageWrap.classList.add("hidden");
      }

      modal.classList.remove("hidden");
    } catch (err) {
      console.error("Popup Fehler:", err);
    }
  }

  document.addEventListener("click", (event) => {
    const btn = event.target.closest("[data-popup-slug]");
    if (btn) {
      openPopup(btn.dataset.popupSlug);
      return;
    }

    if (event.target.closest("[data-popup-close]")) {
      closePopup();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closePopup();
  });
}
