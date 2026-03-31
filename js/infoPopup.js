import { getLang } from "/gustavsburg-cemevi/js/i18n.js?v=11";
import { getInfoPopupBySlug } from "/gustavsburg-cemevi/js/modules/infoPopups.js?v=11";

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
        imageWrap.classList.add("hidden");
        imageEl.src = "";
        imageEl.alt = "";
      }

      modal.classList.remove("hidden");
    } catch (err) {
      console.error("Popup konnte nicht geöffnet werden:", err);
    }
  }

  document.addEventListener("click", async (e) => {
    const openBtn = e.target.closest("[data-popup-slug]");
    if (openBtn) {
      e.preventDefault();
      const slug = openBtn.getAttribute("data-popup-slug");
      await openPopup(slug);
      return;
    }

    const closeBtn = e.target.closest("[data-popup-close]");
    if (closeBtn) {
      closePopup();
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closePopup();
    }
  });
}
