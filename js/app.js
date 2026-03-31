import { getSiteSettings } from "./modules/siteSettings.js";
import { initRouter } from "./router.js";
import { initInfoPopup } from "/gustavsburg-cemevi/js/infoPopup.js?v=11";
import {
  initI18n,
  setLangFromStorage,
  bindLangButtons
} from "./i18n.js";

async function applyBranding() {
  try {
    const settings = await getSiteSettings();

    const titleEl = document.querySelector("#brandTitle");
    const logoEl = document.querySelector("#brandLogo");

    const siteTitle = settings?.site_title || "Gustavsburg Cem Evi";
    const logoUrl = settings?.logo_url || "";

    if (titleEl) {
      titleEl.textContent = siteTitle;
    }

    if (logoEl) {
      if (logoUrl) {
        logoEl.src = logoUrl;
        logoEl.classList.remove("hidden");
      } else {
        logoEl.classList.add("hidden");
      }
    }
  } catch (err) {
    console.error("Branding Fehler:", err);
  }
}

async function main() {
  try {
    initI18n();
    setLangFromStorage();
    bindLangButtons();

    initInfoPopup();

    await applyBranding();
    initRouter();
  } catch (err) {
    console.error("App Fehler:", err);
  }
}

main();
