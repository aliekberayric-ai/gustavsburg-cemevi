// ================================
// IMPORTS (ALLE RELATIV - WICHTIG!)
// ================================

import { getSiteSettings } from "./modules/siteSettings.js";
import { initRouter } from "./router.js";
/* import { initInfoPopup } from "./infoPopup.js"; // ✅ FIXED */

import {
  initI18n,
  setLangFromStorage,
  bindLangButtons
} from "./i18n.js";


// ================================
// BRANDING (LOGO + TITLE)
// ================================

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
      if (logoUrl && logoUrl.trim() !== "") {
        logoEl.src = logoUrl;
        logoEl.classList.remove("hidden");
      } else {
        logoEl.classList.add("hidden");
      }
    }

  } catch (err) {
    console.error("❌ Branding Fehler:", err);
  }
}


// ================================
// APP START
// ================================

async function main() {
  try {
    console.log("🚀 App startet...");

    // 🌍 Sprache initialisieren
    initI18n();
    setLangFromStorage();
    bindLangButtons();

    // 📢 Popup initialisieren
    // initInfoPopup(); //

    // 🎨 Branding laden
    await applyBranding();

    // 🧭 Router starten
    initRouter();

    console.log("✅ App erfolgreich geladen");

  } catch (err) {
    console.error("❌ App Fehler:", err);
  }
}
