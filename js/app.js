import { initI18n, setLangFromStorage, bindLangButtons } from "./i18n.js";
import { initAuth } from "./auth.js";
import { initRouter } from "./router.js";
import { getSiteSettings } from "./modules/siteSettings.js";

async function applyBranding() {
  const settings = await getSiteSettings();

  const titleEl = document.querySelector("#brandTitle");
  const logoEl = document.querySelector("#brandLogo");

  if (titleEl) {
    titleEl.textContent = settings?.site_title || "Gustavsburg Cem Evi";
  }

  if (logoEl) {
    if (settings?.logo_url) {
      logoEl.src = settings.logo_url;
      logoEl.classList.remove("hidden");
    } else {
      logoEl.classList.add("hidden");
    }
  }

  document.title = settings?.site_title || "Gustavsburg Cem Evi";
}

async function main() {
  await initI18n();
  setLangFromStorage();
  bindLangButtons();

  await initAuth();
  await applyBranding();
  initRouter();
}

main().catch((err) => {
  console.error(err);
  document.querySelector("#app").innerHTML = `
    <div class="page">
      <h1>App error</h1>
      <p>Bitte Konsole öffnen.</p>
    </div>
  `;
});
