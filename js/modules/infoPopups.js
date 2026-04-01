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
    titleEl.textContent = "";
    contentEl.innerHTML = "";
    imageEl.src = "";
    imageEl.alt = "";
    imageWrap.classList.add("hidden");
  }

  async function openPopup(slug) {
    if (!slug) return;

    try {
      const popup = await getInfoPopupBySlug(slug);
      if (!popup) {
        console.warn("Kein Popup gefunden für slug:", slug);
        return;
      }

      const lang = getLang();

      titleEl.textContent = pickLocalized(popup.title, lang);
      contentEl.textContent = pickLocalized(popup.content, lang);

      if (popup.image_url) {
        imageEl.src = popup.image_url;
        imageEl.alt = pickLocalized(popup.title, lang) || "Popup Bild";
        imageWrap.classList.remove("hidden");
      } else {
        imageEl.src = "";
        imageEl.alt = "";
        imageWrap.classList.add("hidden");
      }

      modal.classList.remove("hidden");
    } catch (err) {
      console.error("Popup Fehler:", err);
    }
  }

  document.querySelectorAll("[data-popup-close]").forEach((el) => {
    el.addEventListener("click", closePopup);
  });

  document.addEventListener("click", (event) => {
    const trigger = event.target.closest(".home-popup-btn[data-popup-slug]");
    if (!trigger) return;

    const hash = location.hash || "#/";
    if (hash !== "#/" && hash !== "") return;

    const slug = trigger.getAttribute("data-popup-slug");
    if (!slug) return;

    openPopup(slug);
  });
}
