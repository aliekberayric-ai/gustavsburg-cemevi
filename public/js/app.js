/**
 * app.js
 * - bootstraps i18n
 * - initializes Supabase
 * - sets up router with page transitions
 */

import { initI18n, setLangFromStorage, bindLangButtons } from "./i18n.js";
import { initRouter } from "./router.js";
import { initAuth } from "./auth.js";

async function main() {
  await initI18n();
  setLangFromStorage();
  bindLangButtons();

  // Auth boot (login state + role)
  await initAuth();

  // Router boot (views + transitions)
  initRouter();
}

main().catch((err) => {
  console.error(err);
  document.querySelector("#app").innerHTML = `
    <div class="page">
      <h1>Oops</h1>
      <p>App konnte nicht starten. Schau in die Konsole.</p>
    </div>
  `;
});
