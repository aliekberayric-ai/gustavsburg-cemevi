import { t, getLang } from "../i18n.js";
import { getAuth, signIn, signOut, requireRole } from "../auth.js";
import { toast, confirmBox, fmtDateTime, escapeHtml } from "../ui.js";

import {
  getSiteSettings,
  updateSiteSettings,
  uploadBrandLogo
} from "../modules/siteSettings.js";

import {
  listEventsPublic,
  createEvent,
  updateEvent,
  deleteEvent,
  uploadEventPreviewImage
} from "../modules/events.js";

import {
  listGalleriesPublic,
  updateGallery,
  deleteGallery
} from "../modules/gallery.js";

import {
  listPeoplePublic,
  createPerson,
  updatePerson,
  deletePerson,
  uploadPersonImage
} from "../modules/people.js";

import {
  createGalleryWithFiles,
  fetchGalleryItems,
  updateGalleryItemOrder
} from "../galleryService.js";

import { openLightbox, initLightbox } from "../lightbox.js";
import { listFormSubmissions, updateFormStatus } from "../modules/forms.js";
import { listAuditLogs } from "../modules/audit.js";

import {
  listHomeTickerAdmin,
  createHomeTicker,
  updateHomeTicker,
  deleteHomeTicker
} from "../modules/homeTicker.js";

import {
  listHomeTilesAdmin,
  createHomeTile,
  updateHomeTile,
  deleteHomeTile
} from "../modules/homeTiles.js";

/* -----------------------------------------------------------
   ADMIN PAGE
----------------------------------------------------------- */

export async function renderAdmin(root) {
  const auth = getAuth();
  const isEditor = requireRole(["admin", "editor"]);
  const isAdmin = requireRole(["admin"]);

  // ---------------- LOGIN ----------------
  if (!auth.user) {
    root.innerHTML = `
      <div class="page">
        <h1>Admin</h1>
        <div class="card card__pad" style="max-width:520px">
          <h2>${t("admin.login")}</h2>
          <form id="loginForm" class="grid">
            <input class="input" name="email" placeholder="Email" required />
            <input class="input" name="password" type="password" placeholder="Passwort" required />
            <button class="btn btn--accent">${t("admin.signIn")}</button>
          </form>
        </div>
      </div>
    `;

    root.querySelector("#loginForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);

      try {
        await signIn(fd.get("email"), fd.get("password"));
        renderAdmin(root);
      } catch {
        toast("Login fehlgeschlagen", "bad");
      }
    });

    return;
  }

  // ---------------- DATA LOAD ----------------
  const [
    siteSettings,
    events,
    galleries,
    people,
    forms,
    audits
  ] = await Promise.all([
    getSiteSettings(),
    listEventsPublic(),
    listGalleriesPublic(),
    listPeoplePublic(),
    isEditor ? listFormSubmissions() : [],
    isAdmin ? listAuditLogs() : []
  ]);

  const lang = getLang();

  // ---------------- UI ----------------
  root.innerHTML = `
    <div class="page">

      <div style="display:flex;justify-content:space-between;">
        <h1>Admin</h1>
        <button id="logoutBtn" class="btn">${t("admin.signOut")}</button>
      </div>

      <hr/>

      <!-- BRANDING -->
      <div class="card card__pad">
        <h2>Branding</h2>

        <input id="siteTitleInput" class="input" value="${escapeHtml(siteSettings.site_title || "")}" />

        <input id="siteLogoInput" type="file" class="input" />

        <img id="siteLogoPreview"
          src="${siteSettings.logo_url || ""}"
          style="max-height:60px;margin-top:10px;${siteSettings.logo_url ? "" : "display:none;"}"
        />

        <button id="saveBrandingBtn" class="btn btn--accent" style="margin-top:10px">
          Speichern
        </button>
      </div>

      <hr/>

      <!-- EVENTS -->
      <div class="card card__pad">
        <h2>Events</h2>

        <button id="addEventBtn" class="btn btn--accent">Event hinzufügen</button>

        <table class="table">
          <tbody>
            ${events.map(e => `
              <tr>
                <td>${escapeHtml(e.title?.[lang] || e.title?.de || "")}</td>
                <td>${escapeHtml(fmtDateTime(e.start_time))}</td>
                <td>
                  <button data-del-event="${e.id}" class="btn btn--danger">X</button>
                </td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>

    </div>
  `;

  // ---------------- LOGOUT ----------------
  root.querySelector("#logoutBtn").onclick = async () => {
    await signOut();
    location.reload();
  };

  // ---------------- BRANDING ----------------
  let logoUrl = siteSettings.logo_url || "";

  root.querySelector("#siteLogoInput").addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const url = await uploadBrandLogo(file);
      logoUrl = url;

      const preview = root.querySelector("#siteLogoPreview");
      preview.src = url;
      preview.style.display = "block";

      toast("Logo hochgeladen", "ok");
    } catch {
      toast("Upload fehlgeschlagen", "bad");
    }
  });

  root.querySelector("#saveBrandingBtn").onclick = async () => {
    try {
      await updateSiteSettings({
        site_title: root.querySelector("#siteTitleInput").value,
        logo_url: logoUrl
      });

      toast("Gespeichert", "ok");
      location.reload();
    } catch {
      toast("Fehler beim Speichern", "bad");
    }
  };

  // ---------------- EVENTS DELETE ----------------
  root.querySelectorAll("[data-del-event]").forEach(btn => {
    btn.onclick = async () => {
      const id = btn.dataset.delEvent;

      const ok = await confirmBox("Löschen?", "Event löschen?");
      if (!ok) return;

      await deleteEvent(id);
      renderAdmin(root);
    };
  });

  initLightbox();
}
