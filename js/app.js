import { getSiteSettings } from "./modules/siteSettings.js";
import { initRouter } from "./router.js";
import { initInfoPopup } from "./modules/popup.js";

import {
  initI18n,
  setLangFromStorage,
  bindLangButtons
} from "./i18n.js";

initInfoPopup();

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
        logoEl.removeAttribute("src");
      }
    }

    document.title = siteTitle;

  } catch (err) {
    console.error("Branding konnte nicht geladen werden:", err);
  }
}

<button class="btn btn--accent" data-popup-slug="mitgliedschaft">
  Mehr erfahren
</button>

async function main() {
  try {
    // 🔥 1. Sprache laden
    await initI18n();

    // 🔥 2. gespeicherte Sprache setzen
    setLangFromStorage();

    // 🔥 3. Buttons aktivieren
    bindLangButtons();

    // 🔥 4. Branding laden
    await applyBranding();

    // 🔥 5. Router starten
    initRouter();

  } catch (err) {
    console.error("App Fehler:", err);
  }
}

main();
