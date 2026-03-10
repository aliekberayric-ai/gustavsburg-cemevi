/**
 * app.js
 * entry point
 */

import { initI18n, setLangFromStorage, bindLangButtons } from "./i18n.js";
import { initAuth } from "./auth.js";
import { initRouter } from "./router.js";
import { fetchGalleryItems } from "./services/galleryService.js";

async function main(){
  await initI18n();
  setLangFromStorage();
  bindLangButtons();

  await initAuth();
  initRouter();
}

main().catch(err=>{
  console.error(err);
  document.querySelector("#app").innerHTML = `
    <div class="page">
      <h1>App error</h1>
      <p>Bitte Konsole öffnen.</p>
    </div>
  `;
});
