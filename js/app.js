import { getSiteSettings } from "./modules/siteSettings.js";
import { initRouter } from "./router.js";

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

async function main() {
  await applyBranding();
  initRouter();
}

main().catch((err) => {
  console.error("App Fehler:", err);
});
