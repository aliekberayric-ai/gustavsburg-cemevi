/**
 * router.js
 * SPA Router mit:
 * - Page Transitions (fade)
 * - i18n Re-Apply nach jedem Render
 * - Smooth Scroll nach oben
 */

import { renderHome } from "./views/home.js?v=125";
import { renderGallery } from "./views/gallery.js?v=125";
import { renderCalendar } from "./views/calendar.js?v=125";
import { renderPeople } from "./views/people.js?v=125";
import { renderForms } from "./views/forms.js?v=125";
import { renderAdmin } from "./views/admin.js?v=125";

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
    // CLEAR CONTENT
    // -----------------------
    app.classList.remove("fade-out", "fade-in");
    app.innerHTML = "";

    // -----------------------
    // RENDER VIEW
    // -----------------------
    await Promise.race([
      view(app),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Seite braucht zu lange zum Laden.")), 10000))
    ]);

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
    app.classList.remove("fade-out", "fade-in");

    app.innerHTML = `
      <div class="page" style="padding:40px;">
        <h1>Fehler beim Laden der Seite</h1>
        <p>${err?.message || "Unbekannter Fehler"}</p>
        <p>Bitte die Seite neu laden oder eine andere Seite im Menü öffnen.</p>
      </div>
    `;
  } finally {
    app.classList.remove("fade-out", "fade-in");
    app.style.opacity = "1";
    app.style.transform = "none";
  }
}

// -------------------------------
// SLEEP HELPER
// -------------------------------
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
