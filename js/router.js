/**
 * router.js
 * - hash router
 * - animated transitions
 */

import { renderHome } from "../views/home.js";
import { renderGallery } from "../views/gallery.js";
import { renderCalendar } from "../views/calendar.js";
import { renderPeople } from "../views/people.js";
import { renderForms } from "../views/forms.js";
import { renderAdmin } from "../views/admin.js";

const routes = {
  "/": renderHome,
  "/gallery": renderGallery,
  "/calendar": renderCalendar,
  "/people": renderPeople,
  "/forms": renderForms,
  "/admin": renderAdmin,
};

function getPath(){
  const hash = location.hash.replace("#", "") || "/";
  return hash.startsWith("/") ? hash : "/";
}

export function initRouter(){
  window.addEventListener("hashchange", navigate);
  navigate();
}

async function navigate(){
  const app = document.querySelector("#app");
  const path = getPath();
  const view = routes[path] ?? routes["/"];

  app.classList.add("fade-out");
  await sleep(140);

  app.innerHTML = "";
  await view(app);

  app.classList.remove("fade-out");
  app.classList.add("fade-in");
  await sleep(180);
  app.classList.remove("fade-in");
}

function sleep(ms){ return new Promise(r=>setTimeout(r, ms)); }
