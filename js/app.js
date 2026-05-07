import { getSiteSettings } from "./modules/siteSettings.js";
import { initRouter } from "./router.js?v=117";
import { initInfoPopup } from "./infoPopup.js";
import { initAuth } from "./auth.js";
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
    const faviconEl = document.querySelector('link[rel="icon"]');

    const siteTitle = settings?.site_title || "Gustavsburg Cem Evi";
    const logoUrl = settings?.logo_url || "";
    const faviconUrl = settings?.favicon_url || "";

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

    if (faviconEl && faviconUrl) {
      faviconEl.href = faviconUrl;
    }
  } catch (err) {
    console.error("Branding Fehler:", err);
  }
}

async function main() {
  try {
    await initI18n();
    setLangFromStorage();
    bindLangButtons();
    await initAuth();

    initInfoPopup();

    await applyBranding();
    initRouter();
  } catch (err) {
    console.error("App Fehler:", err);
  }
}

main();
