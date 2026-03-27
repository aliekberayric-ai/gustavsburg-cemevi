import { t, getLang } from "../i18n.js";
import { getAuth, signIn, signOut, requireRole } from "../auth.js";
import { toast, confirmBox, fmtDateTime, escapeHtml } from "../ui.js";
import { getSiteSettings, updateSiteSettings, uploadBrandLogo } from "../modules/siteSettings.js";
import { uploadTileImage } from "../modules/homeTiles.js";

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
   HELPERS
----------------------------------------------------------- */

function safeText(value, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function pickLocalized(obj, lang) {
  return obj?.[lang] ?? obj?.de ?? obj?.tr ?? obj?.en ?? "";
}

function parseEventDateTime(date, time) {
  if (!date || !time) return null;

  const isoDate = /^\d{4}-\d{2}-\d{2}$/.test(date);
  const isoTime = /^\d{2}:\d{2}$/.test(time);

  if (isoDate && isoTime) {
    const d = new Date(`${date}T${time}:00`);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }

  const usDate = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(date);
  const ampmTime = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(time);

  if (usDate && ampmTime) {
    const month = Number(usDate[1]);
    const day = Number(usDate[2]);
    const year = Number(usDate[3]);

    let hour = Number(ampmTime[1]);
    const minute = Number(ampmTime[2]);
    const ampm = ampmTime[3].toUpperCase();

    if (ampm === "PM" && hour < 12) hour += 12;
    if (ampm === "AM" && hour === 12) hour = 0;

    const d = new Date(year, month - 1, day, hour, minute, 0);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }

  const fallback = new Date(`${date} ${time}`);
  return Number.isNaN(fallback.getTime()) ? null : fallback.toISOString();
}

function previewSelectedGalleryFiles(root, fileList) {
  const preview = root.querySelector("#galleryFilePreview");
  const counter = root.querySelector("#galleryFileCount");

  if (!preview || !counter) return;

  preview.innerHTML = "";
  const files = Array.from(fileList || []);

  counter.textContent = `${files.length} Bild${files.length === 1 ? "" : "er"} ausgewählt`;

  files.forEach((file) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const div = document.createElement("div");
      div.className = "upload-preview-card";
      div.innerHTML = `
        <img src="${e.target?.result || ""}" alt="${escapeHtml(file.name)}">
        <span title="${escapeHtml(file.name)}">${escapeHtml(file.name)}</span>
      `;
      preview.appendChild(div);
    };

    reader.readAsDataURL(file);
  });
}

async function fillGalleryCounts(root, galleries) {
  await Promise.all(
    galleries.map(async (g) => {
      const countCell = root.querySelector(`[data-gallery-count="${g.id}"]`);
      if (!countCell) return;

      try {
        const items = await fetchGalleryItems(g.id);
        countCell.textContent = String(items.length);
      } catch (err) {
        console.error("Gallery count error:", err);
        countCell.textContent = "0";
      }
    })
  );
}

function bindGalleryDropzone(root) {
  const dropzone = root.querySelector("#galleryDropzone");
  const fileInput = root.querySelector("#galleryFiles");

  if (!dropzone || !fileInput) return;

  ["dragenter", "dragover"].forEach((eventName) => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.add("is-dragover");
    });
  });

  ["dragleave", "drop"].forEach((eventName) => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.remove("is-dragover");
    });
  });

  dropzone.addEventListener("drop", (e) => {
    const files = e.dataTransfer?.files;
    if (!files?.length) return;

    fileInput.files = files;
    previewSelectedGalleryFiles(root, files);
  });

  dropzone.addEventListener("click", () => {
    fileInput.click();
  });
}

function bindGallerySorting(root, gallery, items) {
  const wrap = root.querySelector("#adminGalleryItems");
  if (!wrap) return;

  let draggedId = null;

  wrap.querySelectorAll(".admin-gallery-sort-card").forEach((card) => {
    card.addEventListener("dragstart", () => {
      draggedId = card.dataset.id;
      card.classList.add("is-dragging");
    });

    card.addEventListener("dragend", () => {
      card.classList.remove("is-dragging");
    });

    card.addEventListener("dragover", (e) => {
      e.preventDefault();
    });

    card.addEventListener("drop", async (e) => {
      e.preventDefault();

      const targetId = card.dataset.id;
      if (!draggedId || !targetId || draggedId === targetId) return;

      const draggedIndex = items.findIndex((x) => String(x.id) === String(draggedId));
      const targetIndex = items.findIndex((x) => String(x.id) === String(targetId));

      if (draggedIndex < 0 || targetIndex < 0) return;

      const moved = items.splice(draggedIndex, 1)[0];
      items.splice(targetIndex, 0, moved);

      try {
        await updateGalleryItemOrder(items);
        await openAdminGallery(root, gallery);
        toast("Sortierung gespeichert", "ok");
      } catch (err) {
        console.error(err);
        toast("Sortierung konnte nicht gespeichert werden", "bad");
      }
    });
  });
}

async function openAdminGallery(root, gallery) {
  const lang = getLang();
  const items = await fetchGalleryItems(gallery.id);

  const detail = root.querySelector("#adminGalleryDetail");
  const titleEl = root.querySelector("#adminGalleryDetailTitle");
  const metaEl = root.querySelector("#adminGalleryDetailMeta");
  const wrap = root.querySelector("#adminGalleryItems");

  if (!detail || !titleEl || !metaEl || !wrap) return;

  detail.classList.remove("hidden");
  titleEl.textContent = pickLocalized(gallery.title, lang) || "Galerie";
  metaEl.textContent = `${items.length} Bilder`;
  wrap.innerHTML = "";

  if (!items.length) {
    wrap.innerHTML = `<div class="empty-state">In dieser Galerie sind noch keine Bilder.</div>`;
    return;
  }

  items.forEach((item, index) => {
    const imageUrl = item.thumb_public_url || item.public_url || "";
    const caption = safeText(item.localized_caption);

    const card = document.createElement("div");
    card.className = "admin-gallery-sort-card";
    card.draggable = true;
    card.dataset.index = String(index);
    card.dataset.id = item.id;

    card.innerHTML = `
      <div class="admin-gallery-sort-card__image-wrap">
        <img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(caption)}">
        <button class="admin-gallery-sort-card__view btn" type="button">Ansehen</button>
      </div>
      <div class="admin-gallery-sort-card__caption">${escapeHtml(caption)}</div>
    `;

    card.querySelector(".admin-gallery-sort-card__view")?.addEventListener("click", () => {
      openLightbox(items, index);
    });

    wrap.appendChild(card);
  });

  bindGallerySorting(root, gallery, items);
}

/* -----------------------------------------------------------
   MAIN
----------------------------------------------------------- */

export async function renderAdmin(root) {
  const auth = getAuth();
  const isEditor = requireRole(["admin", "editor"]);
  const isAdmin = requireRole(["admin"]);

  if (!auth.user) {
    root.innerHTML = `
      <div class="page">
        <h1>Admin</h1>
        <div class="card card__pad" style="max-width:520px">
          <h2>${t("admin.login")}</h2>
          <form id="loginForm" class="grid" style="margin-top:10px;gap:10px">
            <input class="input" name="email" placeholder="Email" type="email" required />
            <input class="input" name="password" placeholder="Passwort" type="password" required />
            <button class="btn btn--accent" type="submit">${t("admin.signIn")}</button>
            <div class="mono">${t("admin.loginHint")}</div>
          </form>
        </div>
      </div>
    `;

    root.querySelector("#loginForm")?.addEventListener("submit", async (e) => {
      e.preventDefault();

      try {
        const fd = new FormData(e.target);
        await signIn(fd.get("email"), fd.get("password"));
        await renderAdmin(root);
      } catch (err) {
        console.error(err);
        toast("Login fehlgeschlagen", "bad");
      }
    });

    return;
  }

  const lang = getLang();

  let siteSettings = { site_title: "Gustavsburg Cem Evi", logo_url: "" };
  let events = [];
  let galleries = [];
  let people = [];
  let forms = [];
  let audits = [];
  let tickerItems = [];
  let homeTiles = [];

  try {
    [
      siteSettings,
      events,
      galleries,
      people,
      forms,
      audits,
      tickerItems,
      homeTiles
    ] = await Promise.all([
      getSiteSettings(),
      listEventsPublic(),
      listGalleriesPublic(),
      listPeoplePublic(),
      isEditor ? listFormSubmissions() : Promise.resolve([]),
      isAdmin ? listAuditLogs() : Promise.resolve([]),
      isEditor ? listHomeTickerAdmin() : Promise.resolve([]),
      isEditor ? listHomeTilesAdmin() : Promise.resolve([])
    ]);
  } catch (err) {
    console.error("Admin load error:", err);
    toast("Einige Admin-Daten konnten nicht geladen werden", "bad");
  }

  root.innerHTML = `
    <div class="page">
      <div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-end;flex-wrap:wrap">
        <div>
          <h1>Admin</h1>
          <div class="badge badge--ok">${escapeHtml(auth.user.email)} • ${escapeHtml(auth.profile?.role ?? "user")}</div>
        </div>
        <button id="logoutBtn" class="btn">${t("admin.signOut")}</button>
      </div>

      <hr/>

      <div class="admin-grid">
        <div class="card card__pad">
          <h2>${t("admin.sections")}</h2>
          <p class="mono">${t("admin.rolesHint")}</p>

          <div style="display:grid;gap:8px">
            <a href="#admin-branding" class="btn">Branding</a>
            <a href="#admin-events" class="btn">Events</a>
            <a href="#admin-galleries" class="btn">Galerien</a>
            <a href="#admin-people" class="btn">Team</a>
            <a href="#admin-home-ticker" class="btn">Live-Ticker</a>
            <a href="#admin-home-tiles" class="btn">Startseiten-Kacheln</a>
            ${isEditor ? `<a href="#admin-forms" class="btn">Formulare</a>` : ""}
            ${isAdmin ? `<a href="#admin-audit" class="btn">Audit Log</a>` : ""}
          </div>
        </div>

        <div class="grid" style="gap:14px">

          <!-- BRANDING -->
          <div id="admin-branding" class="card card__pad">
            <div style="display:flex;justify-content:space-between;gap:10px;align-items:center;flex-wrap:wrap">
              <h2 style="margin:0">Branding</h2>
              ${isEditor ? `<span class="badge badge--ok">Editor</span>` : `<span class="badge badge--warn">${t("admin.readOnly")}</span>`}
            </div>

            <div class="grid" style="gap:12px;margin-top:12px">
              <div>
                <label for="siteTitleInput">Seitentitel</label>
                <input
                  id="siteTitleInput"
                  class="input"
                  type="text"
                  value="${escapeHtml(siteSettings?.site_title || "Gustavsburg Cem Evi")}"
                  placeholder="Seitentitel"
                  ${isEditor ? "" : "disabled"}
                />
              </div>

              <div>
                <label for="siteLogoInput">Logo hochladen</label>
                <input
                  id="siteLogoInput"
                  class="input"
                  type="file"
                  accept="image/*"
                  ${isEditor ? "" : "disabled"}
                />
              </div>

              <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap">
                <img
                  id="siteLogoPreview"
                  src="${escapeHtml(siteSettings?.logo_url || "")}"
                  alt="Logo Preview"
                  style="width:64px;height:64px;object-fit:contain;border-radius:12px;border:1px solid var(--line);background:rgba(255,255,255,0.04);${siteSettings?.logo_url ? "" : "display:none;"}"
                />
                ${isEditor ? `<button id="saveBrandingBtn" class="btn btn--accent">Branding speichern</button>` : ""}
              </div>
            </div>
          </div>

          <!-- EVENTS -->
          <div id="admin-events" class="card card__pad">
            <div style="display:flex;justify-content:space-between;gap:10px;align-items:center;flex-wrap:wrap">
              <h2 style="margin:0">Events</h2>
              ${isEditor ? `<span class="badge badge--ok">Editor</span>` : `<span class="badge badge--warn">${t("admin.readOnly")}</span>`}
            </div>

            ${isEditor ? `
              <div class="grid" style="gap:8px;margin-top:12px">
                <input id="eventTitleDe" class="input" placeholder="Titel DE" />
                <input id="eventTitleTr" class="input" placeholder="Titel TR" />
                <input id="eventTitleEn" class="input" placeholder="Titel EN" />
                <input id="eventDate" class="input" type="date" />
                <input id="eventTime" class="input" type="time" />
                <input id="eventLocation" class="input" placeholder="Ort" />
                <input id="eventPreviewImageFile" class="input" type="file" accept="image/*" />
                <div id="eventPreviewImageInfo" class="mono">Kein Bild ausgewählt</div>
                <button id="addEventBtn" class="btn btn--accent">${t("admin.add")}</button>
              </div>
            ` : ""}

            <table class="table" style="margin-top:10px">
              <thead>
                <tr>
                  <th>${t("calendar.th1")}</th>
                  <th>${t("calendar.th2")}</th>
                  <th>${t("calendar.th3")}</th>
                  <th class="mono">ID</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                ${events.map((e) => {
                  const title = pickLocalized(e.title, lang) || "—";
                  return `
                    <tr>
                      <td class="mono">${escapeHtml(fmtDateTime(e.start_time))}</td>
                      <td>${escapeHtml(title)}</td>
                      <td>${escapeHtml(safeText(e.location))}</td>
                      <td class="mono">${escapeHtml(String(e.id))}</td>
                      <td style="white-space:nowrap">
                        ${isEditor ? `<button class="btn" data-edit-event="${e.id}">${t("admin.edit")}</button>` : ""}
                        ${isAdmin ? `<button class="btn btn--danger" data-del-event="${e.id}">${t("admin.delete")}</button>` : ""}
                      </td>
                    </tr>
                  `;
                }).join("")}
              </tbody>
            </table>
          </div>

          <!-- GALLERIES -->
          <div id="admin-galleries" class="card card__pad">
            <div style="display:flex;justify-content:space-between;gap:10px;align-items:center;flex-wrap:wrap">
              <h2 style="margin:0">Galerien</h2>
              ${isEditor ? `<span class="badge badge--ok">Editor</span>` : `<span class="badge badge--warn">${t("admin.readOnly")}</span>`}
            </div>

            ${isEditor ? `
              <div class="grid" style="gap:10px;margin-top:14px">
                <input id="galleryTitle" class="input" placeholder="Galerietitel" />

                <select id="galleryStatus" class="input">
                  <option value="active">Aktiv</option>
                  <option value="archived">Archiv</option>
                </select>

                <div id="galleryDropzone" class="gallery-dropzone">
                  <div class="gallery-dropzone__inner">
                    <strong>Bilder hier hineinziehen</strong>
                    <span>oder unten auswählen</span>
                  </div>
                </div>

                <input id="galleryFiles" class="input" type="file" accept="image/*" multiple />
                <div id="galleryFileCount" class="mono">0 Bilder ausgewählt</div>
                <div id="galleryFilePreview" class="upload-preview-grid"></div>

                <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
                  <button id="gallerySaveButton" class="btn btn--accent" type="button">Galerie speichern</button>
                  <span id="galleryUploadStatus" class="mono"></span>
                </div>
              </div>
            ` : ""}

            <table class="table" style="margin-top:16px">
              <thead>
                <tr>
                  <th>Cover</th>
                  <th>${t("admin.title")}</th>
                  <th>${t("admin.status")}</th>
                  <th>Bilder</th>
                  <th class="mono">ID</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                ${galleries.map((g) => {
                  const title = pickLocalized(g.title, lang) || "—";
                  const cover = g.cover_url || "";
                  return `
                    <tr>
                      <td>
                        ${
                          cover
                            ? `<img src="${escapeHtml(cover)}" alt="Cover" style="width:72px;height:52px;object-fit:cover;border-radius:10px;">`
                            : `—`
                        }
                      </td>
                      <td>
                        <button class="btn" type="button" data-open-gallery="${g.id}">
                          ${escapeHtml(title)}
                        </button>
                      </td>
                      <td>${escapeHtml(safeText(g.status))}</td>
                      <td class="mono" data-gallery-count="${g.id}">…</td>
                      <td class="mono">${escapeHtml(String(g.id))}</td>
                      <td style="white-space:nowrap">
                        ${isEditor ? `<button class="btn" data-edit-gallery="${g.id}">${t("admin.edit")}</button>` : ""}
                        ${isAdmin ? `<button class="btn btn--danger" data-del-gallery="${g.id}">${t("admin.delete")}</button>` : ""}
                      </td>
                    </tr>
                  `;
                }).join("")}
              </tbody>
            </table>

            <div id="adminGalleryDetail" class="gallery-detail hidden" style="margin-top:16px">
              <div class="gallery-detail-head">
                <h3 id="adminGalleryDetailTitle">Galerie</h3>
                <p id="adminGalleryDetailMeta">0 Bilder</p>
              </div>
              <div id="adminGalleryItems" class="gallery-items-grid"></div>
            </div>

            <p class="mono" style="margin-top:10px">${t("admin.galleryItemsNote")}</p>
          </div>

          <!-- PEOPLE -->
          <div id="admin-people" class="card card__pad">
            <div style="display:flex;justify-content:space-between;gap:10px;align-items:center;flex-wrap:wrap">
              <h2 style="margin:0">Team</h2>
              ${isEditor ? `<span class="badge badge--ok">Editor</span>` : `<span class="badge badge--warn">${t("admin.readOnly")}</span>`}
            </div>

            ${isEditor ? `
              <div style="display:grid;gap:8px;width:100%;margin-top:12px">
                <input id="personName" class="input" placeholder="Name" />
                <input id="personImageFile" class="input" type="file" accept="image/*" />
                <div id="personImageInfo" class="mono">Kein Bild ausgewählt</div>

                <input id="personRoleDe" class="input" placeholder="Aufgabe DE" />
                <input id="personRoleTr" class="input" placeholder="Aufgabe TR" />
                <input id="personRoleEn" class="input" placeholder="Aufgabe EN" />

                <textarea id="personBioDe" class="input" placeholder="Beschreibung DE" rows="4"></textarea>
                <textarea id="personBioTr" class="input" placeholder="Beschreibung TR" rows="4"></textarea>
                <textarea id="personBioEn" class="input" placeholder="Beschreibung EN" rows="4"></textarea>

                <input id="personSortOrder" class="input" type="number" placeholder="Reihenfolge (z.B. 1, 2, 3)" />
                <label style="display:flex;align-items:center;gap:8px">
                  <input id="personVisible" type="checkbox" checked />
                  Sichtbar
                </label>

                <button id="addPersonBtn" class="btn btn--accent">${t("admin.add")}</button>
              </div>
            ` : ""}

            <table class="table" style="margin-top:10px">
              <thead>
                <tr>
                  <th>${t("admin.name")}</th>
                  <th>${t("admin.visible")}</th>
                  <th class="mono">ID</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                ${people.map((p) => `
                  <tr>
                    <td>${escapeHtml(safeText(p.name))}</td>
                    <td>${p.is_visible ? `<span class="badge badge--ok">yes</span>` : `<span class="badge badge--warn">no</span>`}</td>
                    <td class="mono">${escapeHtml(String(p.id))}</td>
                    <td style="white-space:nowrap">
                      ${isEditor ? `<button class="btn" data-edit-person="${p.id}">${t("admin.edit")}</button>` : ""}
                      ${isAdmin ? `<button class="btn btn--danger" data-del-person="${p.id}">${t("admin.delete")}</button>` : ""}
                    </td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          </div>

          <!-- HOME TICKER -->
          ${isEditor ? `
            <div id="admin-home-ticker" class="card card__pad">
              <h2 style="margin:0">Startseite – Live-Ticker</h2>

              <div class="grid" style="gap:8px;margin-top:12px">
                <input id="tickerTextDe" class="input" placeholder="Ticker Text DE" />
                <input id="tickerTextTr" class="input" placeholder="Ticker Text TR" />
                <input id="tickerTextEn" class="input" placeholder="Ticker Text EN" />

                <select id="tickerColor" class="input">
                  <option value="green">🟢 Heute / aktuell</option>
                  <option value="yellow">🟡 Bald</option>
                  <option value="red">🔴 Wichtig</option>
                  <option value="neutral">⚪ Info</option>
                </select>

                <input id="tickerSortOrder" class="input" type="number" placeholder="Reihenfolge" />

                <label style="display:flex;align-items:center;gap:8px">
                  <input id="tickerActive" type="checkbox" checked />
                  Aktiv
                </label>

                <button id="addTickerBtn" class="btn btn--accent">Ticker hinzufügen</button>
              </div>

              <table class="table" style="margin-top:14px">
                <thead>
                  <tr>
                    <th>Text</th>
                    <th>Farbe</th>
                    <th>Aktiv</th>
                    <th>Reihenfolge</th>
                    <th class="mono">ID</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  ${tickerItems.map((item) => {
                    const text = pickLocalized(item.text, lang);
                    return `
                      <tr>
                        <td>${escapeHtml(text)}</td>
                        <td>${escapeHtml(safeText(item.color, "neutral"))}</td>
                        <td>${item.active ? "ja" : "nein"}</td>
                        <td>${Number(item.sort_order ?? 0)}</td>
                        <td class="mono">${escapeHtml(String(item.id))}</td>
                        <td style="white-space:nowrap">
                          <button class="btn" data-edit-ticker="${item.id}">Bearbeiten</button>
                          <button class="btn btn--danger" data-del-ticker="${item.id}">Löschen</button>
                        </td>
                      </tr>
                    `;
                  }).join("")}
                </tbody>
              </table>
            </div>
          ` : ""}

          <!-- HOME TILES -->
          ${isEditor ? `
            <div id="admin-home-tiles" class="card card__pad">
              <h2 style="margin:0">Startseite – Kacheln</h2>

              <div class="grid" style="gap:8px;margin-top:12px">
                <input id="tileTitleDe" class="input" placeholder="Titel DE" />
                <input id="tileTitleTr" class="input" placeholder="Titel TR" />
                <input id="tileTitleEn" class="input" placeholder="Titel EN" />

                <textarea id="tileTextDe" class="input" placeholder="Text DE" rows="3"></textarea>
                <textarea id="tileTextTr" class="input" placeholder="Text TR" rows="3"></textarea>
                <textarea id="tileTextEn" class="input" placeholder="Text EN" rows="3"></textarea>

                <input id="tileButtonTextDe" class="input" placeholder="Button Text DE" />
                <input id="tileButtonTextTr" class="input" placeholder="Button Text TR" />
                <input id="tileButtonTextEn" class="input" placeholder="Button Text EN" />

                <input id="tileLinkUrl" class="input" placeholder="Link URL (optional)" />
                /* <input id="tileImageUrl" class="input" placeholder="Bild-URL (optional)" /> */
                <input id="tileFile" class="input" type="file" accept="image/*" /> 
                <div id="tileImageInfo" class="mono">Kein Bild ausgewählt</div>
                <input id="tileSortOrder" class="input" type="number" placeholder="Reihenfolge" />

                <label style="display:flex;align-items:center;gap:8px">
                  <input id="tileActive" type="checkbox" checked />
                  Aktiv
                </label>

                <button id="addTileBtn" class="btn btn--accent">Kachel hinzufügen</button>
              </div>

              <table class="table" style="margin-top:14px">
                <thead>
                  <tr>
                    <th>Titel</th>
                    <th>Aktiv</th>
                    <th>Reihenfolge</th>
                    <th class="mono">ID</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  ${homeTiles.map((tile) => {
                    const title = pickLocalized(tile.title, lang);
                    return `
                      <tr>
                        <td>${escapeHtml(title)}</td>
                        <td>${tile.active ? "ja" : "nein"}</td>
                        <td>${Number(tile.sort_order ?? 0)}</td>
                        <td class="mono">${escapeHtml(String(tile.id))}</td>
                        <td style="white-space:nowrap">
                          <button class="btn" data-edit-tile="${tile.id}">Bearbeiten</button>
                          <button class="btn btn--danger" data-del-tile="${tile.id}">Löschen</button>
                        </td>
                      </tr>
                    `;
                  }).join("")}
                </tbody>
              </table>
            </div>
          ` : ""}

          <!-- FORMS -->
          ${isEditor ? `
            <div id="admin-forms" class="card card__pad">
              <h2 style="margin:0">Formulare</h2>
              <p class="mono">${t("admin.formsHint")}</p>

              <table class="table" style="margin-top:10px">
                <thead>
                  <tr>
                    <th>${t("admin.type")}</th>
                    <th>${t("admin.created")}</th>
                    <th>${t("admin.status")}</th>
                    <th>${t("admin.payload")}</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  ${forms.map((f) => `
                    <tr>
                      <td>${escapeHtml(safeText(f.form_type))}</td>
                      <td class="mono">${escapeHtml(fmtDateTime(f.created_at))}</td>
                      <td>${escapeHtml(safeText(f.status))}</td>
                      <td class="mono">${escapeHtml(JSON.stringify(f.payload ?? {}).slice(0, 160))}</td>
                      <td style="white-space:nowrap">
                        <button class="btn" data-form-status="${f.id}" data-next="in_review">in_review</button>
                        <button class="btn" data-form-status="${f.id}" data-next="done">done</button>
                        <button class="btn" data-form-status="${f.id}" data-next="archived">archived</button>
                      </td>
                    </tr>
                  `).join("")}
                </tbody>
              </table>

              <div style="margin-top:10px">
                <button class="btn" id="printFormsBtn">${t("admin.print")}</button>
              </div>
            </div>
          ` : ""}

          <!-- AUDIT -->
          ${isAdmin ? `
            <div id="admin-audit" class="card card__pad">
              <h2 style="margin:0">Audit Log</h2>
              <p class="mono">${t("admin.auditHint")}</p>

              <table class="table" style="margin-top:10px">
                <thead>
                  <tr>
                    <th>${t("admin.created")}</th>
                    <th>${t("admin.action")}</th>
                    <th>${t("admin.table")}</th>
                    <th>${t("admin.actor")}</th>
                    <th class="mono">row_id</th>
                  </tr>
                </thead>
                <tbody>
                  ${audits.map((a) => `
                    <tr>
                      <td class="mono">${escapeHtml(fmtDateTime(a.created_at))}</td>
                      <td>${escapeHtml(safeText(a.action))}</td>
                      <td>${escapeHtml(safeText(a.table_name))}</td>
                      <td>${escapeHtml(safeText(a.actor_email))}</td>
                      <td class="mono">${escapeHtml(safeText(a.row_id))}</td>
                    </tr>
                  `).join("")}
                </tbody>
              </table>
            </div>
          ` : ""}
        </div>
      </div>
    </div>
  `;

  /* -----------------------------------------------------------
     BRANDING
  ----------------------------------------------------------- */
  if (isEditor) {
    const siteTitleInput = root.querySelector("#siteTitleInput");
    const siteLogoInput = root.querySelector("#siteLogoInput");
    const siteLogoPreview = root.querySelector("#siteLogoPreview");
    const saveBrandingBtn = root.querySelector("#saveBrandingBtn");

    let uploadedLogoUrl = siteSettings?.logo_url || "";

    siteLogoInput?.addEventListener("change", async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      try {
        const logoUrl = await uploadBrandLogo(file);
        uploadedLogoUrl = logoUrl;

        if (siteLogoPreview) {
          siteLogoPreview.src = logoUrl;
          siteLogoPreview.style.display = "block";
        }

        toast("Logo hochgeladen", "ok");
      } catch (err) {
        console.error(err);
        toast("Logo konnte nicht hochgeladen werden", "bad");
      }
    });

    saveBrandingBtn?.addEventListener("click", async () => {
      try {
        await updateSiteSettings({
          site_title: siteTitleInput?.value.trim() || "Gustavsburg Cem Evi",
          logo_url: uploadedLogoUrl || ""
        });

        toast("Branding gespeichert", "ok");
        location.reload();
      } catch (err) {
        console.error(err);
        toast("Branding konnte nicht gespeichert werden", "bad");
      }
    });
  }

  /* -----------------------------------------------------------
     FIELD INFO
  ----------------------------------------------------------- */
  root.querySelector("#eventPreviewImageFile")?.addEventListener("change", (e) => {
    const info = root.querySelector("#eventPreviewImageInfo");
    const file = e.target.files?.[0];
    if (!info) return;
    info.textContent = file ? `Ausgewählt: ${file.name}` : "Kein Bild ausgewählt";
  });

  root.querySelector("#personImageFile")?.addEventListener("change", (e) => {
    const info = root.querySelector("#personImageInfo");
    const file = e.target.files?.[0];
    if (!info) return;
    info.textContent = file ? `Ausgewählt: ${file.name}` : "Kein Bild ausgewählt";
  });


root.querySelector("#tileImageFile")?.addEventListener("change", (e) => {
  const info = root.querySelector("#tileImageInfo");
  const file = e.target.files?.[0];
  if (!info) return;
  info.textContent = file ? `Ausgewählt: ${file.name}` : "Kein Bild ausgewählt";
});
  
  /* -----------------------------------------------------------
     LOGOUT
  ----------------------------------------------------------- */
  root.querySelector("#logoutBtn")?.addEventListener("click", async () => {
    try {
      await signOut();
      location.hash = "#/admin";
      location.reload();
    } catch (err) {
      console.error(err);
      toast("Logout fehlgeschlagen", "bad");
    }
  });

  /* -----------------------------------------------------------
     EVENTS
  ----------------------------------------------------------- */
  if (isEditor) {
    root.querySelector("#addEventBtn")?.addEventListener("click", async () => {
      try {
        const de = root.querySelector("#eventTitleDe")?.value.trim() || "";
        const tr = root.querySelector("#eventTitleTr")?.value.trim() || "";
        const en = root.querySelector("#eventTitleEn")?.value.trim() || "";
        const date = root.querySelector("#eventDate")?.value || "";
        const time = root.querySelector("#eventTime")?.value || "";
        const loc = root.querySelector("#eventLocation")?.value.trim() || "";
        const previewImageFile = root.querySelector("#eventPreviewImageFile")?.files?.[0] || null;

        if (!de) {
          toast("Titel DE fehlt", "bad");
          return;
        }

        if (!date) {
          toast("Datum fehlt", "bad");
          return;
        }

        if (!time) {
          toast("Uhrzeit fehlt", "bad");
          return;
        }

        const startISO = parseEventDateTime(date, time);

        if (!startISO) {
          toast("Ungültiges Datum oder Uhrzeit", "bad");
          return;
        }

        let previewImageUrl = "";
        if (previewImageFile) {
          previewImageUrl = await uploadEventPreviewImage(previewImageFile);
        }

        await createEvent({
          title: { de, tr, en },
          start_time: startISO,
          location: loc,
          preview_image_url: previewImageUrl,
          description: { de: "", tr: "", en: "" }
        });

        toast("Event erstellt", "ok");
        await renderAdmin(root);
      } catch (err) {
        console.error(err);
        toast(err.message || "Event konnte nicht erstellt werden", "bad");
      }
    });

    root.querySelectorAll("[data-edit-event]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        try {
          const id = btn.getAttribute("data-edit-event");
          const current = events.find((x) => String(x.id) === String(id));
          if (!current) return;

          const newDe = prompt("Neuer Titel DE?", current.title?.de ?? "");
          if (!newDe) return;

          const newTr = prompt("Neuer Titel TR?", current.title?.tr ?? "") ?? "";
          const newEn = prompt("Neuer Titel EN?", current.title?.en ?? "") ?? "";
          const newDate = prompt("Neues Datum (YYYY-MM-DD)?", String(current.start_time || "").slice(0, 10));
          if (!newDate) return;

          const currentTime = current.start_time ? new Date(current.start_time).toISOString().slice(11, 16) : "19:00";
          const newTime = prompt("Neue Uhrzeit (HH:MM)?", currentTime);
          if (!newTime) return;

          const newLoc = prompt("Neuer Ort?", current.location ?? "") ?? "";
          const newPreviewImage = prompt("Neue Bild-URL?", current.preview_image_url ?? "") ?? "";

          const newStartISO = parseEventDateTime(newDate, newTime);
          if (!newStartISO) {
            toast("Ungültiges Datum oder Uhrzeit", "bad");
            return;
          }

          await updateEvent(id, {
            title: { de: newDe, tr: newTr, en: newEn },
            start_time: newStartISO,
            location: newLoc,
            preview_image_url: newPreviewImage
          });

          toast("Event aktualisiert", "ok");
          await renderAdmin(root);
        } catch (err) {
          console.error(err);
          toast("Event konnte nicht aktualisiert werden", "bad");
        }
      });
    });
  }

  if (isAdmin) {
    root.querySelectorAll("[data-del-event]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-del-event");
        const ok = await confirmBox("Löschen?", `Event ${id} wirklich löschen?`);
        if (!ok) return;

        try {
          await deleteEvent(id);
          toast("Event gelöscht", "ok");
          await renderAdmin(root);
        } catch (err) {
          console.error(err);
          toast("Event konnte nicht gelöscht werden", "bad");
        }
      });
    });
  }

  /* -----------------------------------------------------------
     GALLERIES
  ----------------------------------------------------------- */
  await fillGalleryCounts(root, galleries);

  root.querySelectorAll("[data-open-gallery]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-open-gallery");
      const gallery = galleries.find((g) => String(g.id) === String(id));
      if (!gallery) return;

      try {
        await openAdminGallery(root, gallery);
      } catch (err) {
        console.error(err);
        toast("Galerie konnte nicht geöffnet werden", "bad");
      }
    });
  });

  if (isEditor) {
    bindGalleryDropzone(root);

    root.querySelector("#galleryFiles")?.addEventListener("change", (e) => {
      previewSelectedGalleryFiles(root, e.target.files);
    });

    root.querySelector("#gallerySaveButton")?.addEventListener("click", async () => {
      const saveBtn = root.querySelector("#gallerySaveButton");
      const statusEl = root.querySelector("#galleryUploadStatus");
      const titleInput = root.querySelector("#galleryTitle");
      const statusInput = root.querySelector("#galleryStatus");
      const filesInput = root.querySelector("#galleryFiles");
      const preview = root.querySelector("#galleryFilePreview");
      const count = root.querySelector("#galleryFileCount");

      try {
        const title = titleInput?.value.trim() || "";
        const status = statusInput?.value || "active";
        const files = Array.from(filesInput?.files || []);

        if (!title) {
          toast("Galerietitel fehlt", "bad");
          return;
        }

        if (!files.length) {
          toast("Bitte Bilder auswählen", "bad");
          return;
        }

        if (saveBtn) saveBtn.disabled = true;
        if (statusEl) statusEl.textContent = "Bilder werden hochgeladen ...";

        await createGalleryWithFiles({ title, status, files });

        toast("Galerie erstellt", "ok");

        if (titleInput) titleInput.value = "";
        if (statusInput) statusInput.value = "active";
        if (filesInput) filesInput.value = "";
        if (preview) preview.innerHTML = "";
        if (count) count.textContent = "0 Bilder ausgewählt";
        if (statusEl) statusEl.textContent = "";

        await renderAdmin(root);
      } catch (err) {
        console.error(err);
        toast(err.message || "Galerie konnte nicht erstellt werden", "bad");
      } finally {
        if (saveBtn) saveBtn.disabled = false;
      }
    });

    root.querySelectorAll("[data-edit-gallery]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        try {
          const id = btn.getAttribute("data-edit-gallery");
          const current = galleries.find((g) => String(g.id) === String(id));
          if (!current) return;

          const status = prompt("Status (active/archived)?", current.status ?? "active");
          if (!status) return;

          await updateGallery(id, { status });
          toast("Galerie aktualisiert", "ok");
          await renderAdmin(root);
        } catch (err) {
          console.error(err);
          toast("Galerie konnte nicht aktualisiert werden", "bad");
        }
      });
    });
  }

  if (isAdmin) {
    root.querySelectorAll("[data-del-gallery]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-del-gallery");
        const ok = await confirmBox("Löschen?", `Galerie ${id} wirklich löschen?`);
        if (!ok) return;

        try {
          await deleteGallery(id);
          toast("Galerie gelöscht", "ok");
          await renderAdmin(root);
        } catch (err) {
          console.error(err);
          toast("Galerie konnte nicht gelöscht werden", "bad");
        }
      });
    });
  }

  /* -----------------------------------------------------------
     PEOPLE
  ----------------------------------------------------------- */
  if (isEditor) {
    root.querySelector("#addPersonBtn")?.addEventListener("click", async () => {
      try {
        const name = root.querySelector("#personName")?.value.trim() || "";
        const imageFile = root.querySelector("#personImageFile")?.files?.[0] || null;

        const roleDe = root.querySelector("#personRoleDe")?.value.trim() || "";
        const roleTr = root.querySelector("#personRoleTr")?.value.trim() || "";
        const roleEn = root.querySelector("#personRoleEn")?.value.trim() || "";

        const bioDe = root.querySelector("#personBioDe")?.value.trim() || "";
        const bioTr = root.querySelector("#personBioTr")?.value.trim() || "";
        const bioEn = root.querySelector("#personBioEn")?.value.trim() || "";

        const sortOrderRaw = root.querySelector("#personSortOrder")?.value || "0";
        const sortOrder = Number(sortOrderRaw) || 0;
        const isVisible = !!root.querySelector("#personVisible")?.checked;

        if (!name) {
          toast("Name fehlt", "bad");
          return;
        }

        let avatarUrl = "";
        if (imageFile) {
          avatarUrl = await uploadPersonImage(imageFile);
        }

        await createPerson({
          name,
          role_title: { de: roleDe, tr: roleTr, en: roleEn },
          bio: { de: bioDe, tr: bioTr, en: bioEn },
          avatar_url: avatarUrl,
          sort_order: sortOrder,
          is_visible: isVisible
        });

        toast("Teammitglied erstellt", "ok");
        await renderAdmin(root);
      } catch (err) {
        console.error(err);
        toast("Teammitglied konnte nicht erstellt werden", "bad");
      }
    });

    root.querySelectorAll("[data-edit-person]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        try {
          const id = btn.getAttribute("data-edit-person");
          const current = people.find((p) => String(p.id) === String(id));
          if (!current) return;

          const name = prompt("Name?", current.name ?? "") ?? "";
          if (!name) return;

          const roleDe = prompt("Aufgabe DE?", current.role_title?.de ?? "") ?? "";
          const roleTr = prompt("Aufgabe TR?", current.role_title?.tr ?? "") ?? "";
          const roleEn = prompt("Aufgabe EN?", current.role_title?.en ?? "") ?? "";

          const bioDe = prompt("Beschreibung DE?", current.bio?.de ?? "") ?? "";
          const bioTr = prompt("Beschreibung TR?", current.bio?.tr ?? "") ?? "";
          const bioEn = prompt("Beschreibung EN?", current.bio?.en ?? "") ?? "";

          const avatarUrl = prompt("Bild-URL?", current.avatar_url ?? "") ?? "";
          const sortOrder = Number(prompt("Reihenfolge?", String(current.sort_order ?? 0)) ?? "0") || 0;
          const visibleText = prompt("Sichtbar? (yes/no)", current.is_visible ? "yes" : "no") ?? "yes";

          await updatePerson(id, {
            name,
            role_title: { de: roleDe, tr: roleTr, en: roleEn },
            bio: { de: bioDe, tr: bioTr, en: bioEn },
            avatar_url: avatarUrl,
            sort_order: sortOrder,
            is_visible: visibleText.toLowerCase() === "yes"
          });

          toast("Teammitglied aktualisiert", "ok");
          await renderAdmin(root);
        } catch (err) {
          console.error(err);
          toast("Teammitglied konnte nicht aktualisiert werden", "bad");
        }
      });
    });
  }

  if (isAdmin) {
    root.querySelectorAll("[data-del-person]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-del-person");
        const ok = await confirmBox("Löschen?", `Person ${id} wirklich löschen?`);
        if (!ok) return;

        try {
          await deletePerson(id);
          toast("Teammitglied gelöscht", "ok");
          await renderAdmin(root);
        } catch (err) {
          console.error(err);
          toast("Teammitglied konnte nicht gelöscht werden", "bad");
        }
      });
    });
  }

  /* -----------------------------------------------------------
     HOME TICKER
  ----------------------------------------------------------- */
  if (isEditor) {
    root.querySelector("#addTickerBtn")?.addEventListener("click", async () => {
      try {
        const de = root.querySelector("#tickerTextDe")?.value.trim() || "";
        const tr = root.querySelector("#tickerTextTr")?.value.trim() || "";
        const en = root.querySelector("#tickerTextEn")?.value.trim() || "";
        const color = root.querySelector("#tickerColor")?.value || "neutral";
        const sortOrder = Number(root.querySelector("#tickerSortOrder")?.value || "0") || 0;
        const active = !!root.querySelector("#tickerActive")?.checked;

        if (!de) {
          toast("Ticker Text DE fehlt", "bad");
          return;
        }

        await createHomeTicker({
          text: { de, tr, en },
          color,
          sort_order: sortOrder,
          active
        });

        toast("Ticker hinzugefügt", "ok");
        await renderAdmin(root);
      } catch (err) {
        console.error(err);
        toast("Ticker konnte nicht erstellt werden", "bad");
      }
    });

    root.querySelectorAll("[data-edit-ticker]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        try {
          const id = btn.getAttribute("data-edit-ticker");
          const current = tickerItems.find((item) => String(item.id) === String(id));
          if (!current) return;

          const de = prompt("Ticker Text DE?", current.text?.de ?? "");
          if (!de) return;

          const tr = prompt("Ticker Text TR?", current.text?.tr ?? "") ?? "";
          const en = prompt("Ticker Text EN?", current.text?.en ?? "") ?? "";
          const color = prompt("Farbe? (green/yellow/red/neutral)", current.color ?? "neutral") ?? "neutral";
          const sortOrder = Number(prompt("Reihenfolge?", String(current.sort_order ?? 0)) ?? "0") || 0;
          const activeText = prompt("Aktiv? (yes/no)", current.active ? "yes" : "no") ?? "yes";

          await updateHomeTicker(id, {
            text: { de, tr, en },
            color,
            sort_order: sortOrder,
            active: activeText.toLowerCase() === "yes"
          });

          toast("Ticker aktualisiert", "ok");
          await renderAdmin(root);
        } catch (err) {
          console.error(err);
          toast("Ticker konnte nicht aktualisiert werden", "bad");
        }
      });
    });

    root.querySelectorAll("[data-del-ticker]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-del-ticker");
        const ok = await confirmBox("Löschen?", `Ticker ${id} wirklich löschen?`);
        if (!ok) return;

        try {
          await deleteHomeTicker(id);
          toast("Ticker gelöscht", "ok");
          await renderAdmin(root);
        } catch (err) {
          console.error(err);
          toast("Ticker konnte nicht gelöscht werden", "bad");
        }
      });
    });
  }

  /* -----------------------------------------------------------
     HOME TILES
  ----------------------------------------------------------- */
  if (isEditor) {
    root.querySelector("#addTileBtn")?.addEventListener("click", async () => {
      try {
        const titleDe = root.querySelector("#tileTitleDe")?.value.trim() || "";
        const titleTr = root.querySelector("#tileTitleTr")?.value.trim() || "";
        const titleEn = root.querySelector("#tileTitleEn")?.value.trim() || "";

        const textDe = root.querySelector("#tileTextDe")?.value.trim() || "";
        const textTr = root.querySelector("#tileTextTr")?.value.trim() || "";
        const textEn = root.querySelector("#tileTextEn")?.value.trim() || "";

        const buttonDe = root.querySelector("#tileButtonTextDe")?.value.trim() || "";
        const buttonTr = root.querySelector("#tileButtonTextTr")?.value.trim() || "";
        const buttonEn = root.querySelector("#tileButtonTextEn")?.value.trim() || "";

        const linkUrl = root.querySelector("#tileLinkUrl")?.value.trim() || "";
        const imageUrl = root.querySelector("#tileImageUrl")?.value.trim() || "";
        const sortOrder = Number(root.querySelector("#tileSortOrder")?.value || "0") || 0;
        const active = !!root.querySelector("#tileActive")?.checked;

        if (!titleDe) {
          toast("Kachel Titel DE fehlt", "bad");
          return;
        }

        await createHomeTile({
          title: { de: titleDe, tr: titleTr, en: titleEn },
          text: { de: textDe, tr: textTr, en: textEn },
          button_text: { de: buttonDe, tr: buttonTr, en: buttonEn },
          link_url: linkUrl,
          image_url: imageUrl,
          sort_order: sortOrder,
          active
        });

        toast("Kachel hinzugefügt", "ok");
        await renderAdmin(root);
      } catch (err) {
        console.error(err);
        toast("Kachel konnte nicht erstellt werden", "bad");
      }
    });

    root.querySelectorAll("[data-edit-tile]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        try {
          const id = btn.getAttribute("data-edit-tile");
          const current = homeTiles.find((tile) => String(tile.id) === String(id));
          if (!current) return;

          const titleDe = prompt("Titel DE?", current.title?.de ?? "");
          if (!titleDe) return;

          const titleTr = prompt("Titel TR?", current.title?.tr ?? "") ?? "";
          const titleEn = prompt("Titel EN?", current.title?.en ?? "") ?? "";

          const textDe = prompt("Text DE?", current.text?.de ?? "") ?? "";
          const textTr = prompt("Text TR?", current.text?.tr ?? "") ?? "";
          const textEn = prompt("Text EN?", current.text?.en ?? "") ?? "";

          const buttonDe = prompt("Button Text DE?", current.button_text?.de ?? "") ?? "";
          const buttonTr = prompt("Button Text TR?", current.button_text?.tr ?? "") ?? "";
          const buttonEn = prompt("Button Text EN?", current.button_text?.en ?? "") ?? "";

          const linkUrl = prompt("Link URL?", current.link_url ?? "") ?? "";
          const imageUrl = prompt("Bild-URL?", current.image_url ?? "") ?? "";
          const sortOrder = Number(prompt("Reihenfolge?", String(current.sort_order ?? 0)) ?? "0") || 0;
          const activeText = prompt("Aktiv? (yes/no)", current.active ? "yes" : "no") ?? "yes";

          await updateHomeTile(id, {
            title: { de: titleDe, tr: titleTr, en: titleEn },
            text: { de: textDe, tr: textTr, en: textEn },
            button_text: { de: buttonDe, tr: buttonTr, en: buttonEn },
            link_url: linkUrl,
            image_url: imageUrl,
            sort_order: sortOrder,
            active: activeText.toLowerCase() === "yes"
          });

          toast("Kachel aktualisiert", "ok");
          await renderAdmin(root);
        } catch (err) {
          console.error(err);
          toast("Kachel konnte nicht aktualisiert werden", "bad");
        }
      });
    });

    root.querySelectorAll("[data-del-tile]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-del-tile");
        const ok = await confirmBox("Löschen?", `Kachel ${id} wirklich löschen?`);
        if (!ok) return;

        try {
          await deleteHomeTile(id);
          toast("Kachel gelöscht", "ok");
          await renderAdmin(root);
        } catch (err) {
          console.error(err);
          toast("Kachel konnte nicht gelöscht werden", "bad");
        }
      });
    });
  }

  /* -----------------------------------------------------------
     FORMS
  ----------------------------------------------------------- */
  if (isEditor) {
    root.querySelectorAll("[data-form-status]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-form-status");
        const next = btn.getAttribute("data-next");

        try {
          await updateFormStatus(id, next);
          toast("Status gesetzt", "ok");
          await renderAdmin(root);
        } catch (err) {
          console.error(err);
          toast("Status konnte nicht gesetzt werden", "bad");
        }
      });
    });

    root.querySelector("#printFormsBtn")?.addEventListener("click", () => {
      window.print();
    });
  }

  initLightbox();
}
