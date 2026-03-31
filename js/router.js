/**
 * router.js
 * SPA Router mit:
 * - Page Transitions (fade)
 * - i18n Re-Apply nach jedem Render
 * - Smooth Scroll nach oben
 */

import { renderHome } from "./view/home.js";
import { renderGallery } from "./view/gallery.js";
import { renderCalendar } from "./view/calendar.js";
import { renderPeople } from "./view/people.js";
import { renderForms } from "./view/forms.js";
import { renderAdmin } from "./view/admin.js";

import { applyTranslations } from "./i18n.js";

// -------------------------------
// ROUTES
// -------------------------------
const routes = {
  "/": renderHome,
  "/gallery": renderGallery,
  "/calendar": renderCalendar,
  "/people": renderPeople,
  "/forms": renderForms,
  "/admin": renderAdmin
};

// -------------------------------
// PATH HELPER
// -------------------------------
function getPath() {
  const hash = location.hash.replace("#", "") || "/";
  return hash.startsWith("/") ? hash : "/" + hash;
}

// -------------------------------
// INIT ROUTER
// -------------------------------
export function initRouter() {
  window.addEventListener("hashchange", navigate);
  navigate();
}

// -------------------------------
// NAVIGATION
// -------------------------------
async function navigate() {
  const app = document.querySelector("#app");
  if (!app) {
    console.error("#app nicht gefunden");
    return;
  }

  const path = getPath();
  const view = routes[path] || routes["/"];

  try {
    // -----------------------
    // FADE OUT
    // -----------------------
    app.classList.add("fade-out");
    await sleep(120);

    // -----------------------
    // CLEAR CONTENT
    // -----------------------
    app.innerHTML = "";

    // -----------------------
    // RENDER VIEW
    // -----------------------
    await view(app);

    // -----------------------
    // 🔥 i18n FIX (WICHTIG)
    // -----------------------
    applyTranslations();

    // -----------------------
    // SCROLL TOP
    // -----------------------
    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });

    // -----------------------
    // FADE IN
    // -----------------------
    app.classList.remove("fade-out");
    app.classList.add("fade-in");

    await sleep(150);
    app.classList.remove("fade-in");

  } catch (err) {
    console.error("Router Fehler:", err);

    app.innerHTML = `
      <div style="padding:40px; text-align:center;">
        <h2>⚠️ Fehler beim Laden der Seite</h2>
        <p>${err.message}</p>
      </div>
    `;
  }
}

// -------------------------------
// SLEEP HELPER
// -------------------------------
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
