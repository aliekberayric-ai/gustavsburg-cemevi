import { getSiteSettings } from "./modules/siteSettings.js";
import { initRouter } from "./router.js?v=122";
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
  } catch (err) {
    console.error("i18n Fehler:", err);
  }

  try {
    setLangFromStorage();
    bindLangButtons();
  } catch (err) {
    console.error("Sprachbuttons Fehler:", err);
  }

  try {
    initInfoPopup();
  } catch (err) {
    console.error("Info-Popup Init Fehler:", err);
  }

  try {
    initRouter();
  } catch (err) {
    console.error("Router Start Fehler:", err);
    const app = document.querySelector("#app");
    if (app) {
      app.innerHTML = `<div class="page"><h1>Fehler beim Laden</h1><p>Die Seite konnte nicht aufgebaut werden.</p></div>`;
    }
  }

  try {
    await Promise.race([
      initAuth(),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Auth Timeout")), 5000))
    ]);
  } catch (err) {
    console.error("Auth Fehler:", err);
  }

  try {
    await applyBranding();
  } catch (err) {
    console.error("Branding Fehler:", err);
  }
}

main();
