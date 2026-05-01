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

import {
  listInfoPopupsAdmin,
  createInfoPopup,
  updateInfoPopup,
  deleteInfoPopup,
  uploadInfoPopupImage
} from "../modules/infoPopups.js"; 

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

function bindSectionNavigation(root) {
  const navButtons = root.querySelectorAll("[data-scroll-target]");
  const sections = root.querySelectorAll(".admin-section");

  navButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetId = btn.getAttribute("data-scroll-target");
      const section = root.querySelector(`#${targetId}`);
      if (!section) return;

      navButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      const body = section.querySelector(".admin-section__body");
      const toggle = section.querySelector(".admin-section__toggle");

      if (body?.classList.contains("hidden")) {
        body.classList.remove("hidden");
        toggle?.classList.add("active");
      }

      section.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    });
  });

  root.querySelectorAll(".admin-section__toggle").forEach((toggle) => {
    toggle.addEventListener("click", () => {
      const section = toggle.closest(".admin-section");
      if (!section) return;

      const body = section.querySelector(".admin-section__body");
      if (!body) return;

      body.classList.toggle("hidden");
      toggle.classList.toggle("active");
    });
  });

  const firstBtn = root.querySelector('[data-scroll-target="admin-branding"]');
  if (firstBtn) firstBtn.classList.add("active");
}

function sectionCard(id, title, badgeHtml, innerHtml, startOpen = true) {
  return `
    <div id="${id}" class="card card__pad admin-section">
      <div class="admin-section__head" style="display:flex;justify-content:space-between;gap:10px;align-items:center;flex-wrap:wrap">
        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
          <h2 style="margin:0">${title}</h2>
          ${badgeHtml || ""}
        </div>
        <button type="button" class="btn admin-section__toggle ${startOpen ? "active" : ""}">
          ${startOpen ? "Einklappen" : "Ausklappen"}
        </button>
      </div>

      <div class="admin-section__body ${startOpen ? "" : "hidden"}" style="margin-top:12px">
        ${innerHtml}
      </div>
    </div>
  `;
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
  let infoPopups = [];

  try {
    [
      siteSettings,
      events,
      galleries,
      people,
      forms,
      audits,
      tickerItems,
      homeTiles,
      infoPopups
    ] = await Promise.all([
      getSiteSettings(),
      listEventsPublic(),
      listGalleriesPublic(),
      listPeoplePublic(),
      isEditor ? listFormSubmissions() : Promise.resolve([]),
      isAdmin ? listAuditLogs() : Promise.resolve([]),
      isEditor ? listHomeTickerAdmin() : Promise.resolve([]),
      isEditor ? listHomeTilesAdmin() : Promise.resolve([]),
      isEditor ? listInfoPopupsAdmin() : Promise.resolve([])
    ]);
  } catch (err) {
    console.error("Admin load error:", err);
    toast("Einige Admin-Daten konnten nicht geladen werden", "bad");
  }

  const brandingSection = sectionCard(
    "admin-branding",
    "Branding",
    isEditor ? `<span class="badge badge--ok">Editor</span>` : `<span class="badge badge--warn">${t("admin.readOnly")}</span>`,
    `
      <div class="grid" style="gap:12px">
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
    `
  );

  const eventsSection = sectionCard(
    "admin-events",
    "Events",
    isEditor ? `<span class="badge badge--ok">Editor</span>` : `<span class="badge badge--warn">${t("admin.readOnly")}</span>`,
    `
      ${isEditor ? `
        <div class="grid" style="gap:8px">
          <input id="eventTitleDe" class="input" placeholder="Titel DE" />
          <input id="eventTitleTr" class="input" placeholder="Titel TR" />
          <input id="eventTitleEn" class="input" placeholder="Titel EN" />
          <input id="eventDate" class="input" type="date" />
          <input id="eventTime" class="input" type="time" />
          <input id="eventLocation" class="input" placeholder="Ort" />
          <select id="eventDisplayType" class="input">
            <option value="auto">Auto</option>
            <option value="today">🟢 Heute</option>
            <option value="urgent">🔥 Dringend</option>
            <option value="future">📅 Zukunft</option>
            <option value="info">ℹ️ Hinweis</option>
          </select>
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
    `
  );

  const galleriesSection = sectionCard(
    "admin-galleries",
    "Galerien",
    isEditor ? `<span class="badge badge--ok">Editor</span>` : `<span class="badge badge--warn">${t("admin.readOnly")}</span>`,
    `
      ${isEditor ? `
        <div class="grid" style="gap:10px">
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
    `
  );

  const peopleSection = sectionCard(
    "admin-people",
    "Team",
    isEditor ? `<span class="badge badge--ok">Editor</span>` : `<span class="badge badge--warn">${t("admin.readOnly")}</span>`,
    `
      ${isEditor ? `
        <div class="grid" style="gap:8px;width:100%">
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
    `
  );

  const tickerSection = isEditor ? sectionCard(
    "admin-home-ticker",
    "Startseite – Live-Ticker",
    `<span class="badge badge--ok">Editor</span>`,
    `
      <div class="grid" style="gap:8px">
        <input id="tickerTextDe" class="input" placeholder="Ticker Text DE" />
        <input id="tickerTextTr" class="input" placeholder="Ticker Text TR" />
        <input id="tickerTextEn" class="input" placeholder="Ticker Text EN" />

        <select id="tickerColor" class="input">
          <option value="neutral">Neutral</option>
          <option value="green">Grün</option>
          <option value="yellow">Gelb</option>
          <option value="red">Rot</option>
        </select>

        <select id="tickerDisplayType" class="input">
          <option value="info">ℹ️ Hinweis</option>
          <option value="urgent">🔥 Dringend</option>
          <option value="future">📅 Zukunft</option>
          <option value="today">🟢 Heute</option>
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
    `,
    false
  ) : "";

  const tilesSection = isEditor ? sectionCard(
    "admin-home-tiles",
    "Startseite – Kacheln",
    `<span class="badge badge--ok">Editor</span>`,
    `
      <div class="grid" style="gap:8px">
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
        <input id="tilePopupSlug" class="input" placeholder="Popup Slug (z.B. lokma)" />
        <input id="tileImageFile" class="input" type="file" accept="image/*" />
        <div id="tileImageInfo" class="mono">Kein Bild ausgewählt</div>
        <input id="tileSortOrder" class="input" type="number" placeholder="Reihenfolge" />

        <select id="tileLayoutWidth" class="input">
          <option value="full">Ganze Breite</option>
          <option value="half">1/2 Breite</option>
          <option value="third" selected>1/3 Breite</option>
          <option value="quarter">1/4 Breite</option>
          <option value="fifth">1/5 Breite</option>
        </select>

        <select id="tileLayoutHeight" class="input">
          <option value="small">Flach</option>
          <option value="medium" selected>Mittel</option>
          <option value="large">Groß</option>
        </select>

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
    `,
    false
  ) : "";

  const popupsSection = isEditor ? sectionCard(
    "admin-info-popups",
    "Info-Popups",
    `<span class="badge badge--ok">Editor</span>`,
    `
      <div class="grid" style="gap:8px">
        <input id="popupSlug" class="input" placeholder="Slug (z.B. mitgliedschaft)" />

        <input id="popupTitleDe" class="input" placeholder="Titel DE" />
        <input id="popupTitleTr" class="input" placeholder="Titel TR" />
        <input id="popupTitleEn" class="input" placeholder="Titel EN" />

        <textarea id="popupContentDe" class="input" placeholder="Text DE" rows="4"></textarea>
        <textarea id="popupContentTr" class="input" placeholder="Text TR" rows="4"></textarea>
        <textarea id="popupContentEn" class="input" placeholder="Text EN" rows="4"></textarea>

        <input id="popupImageUrl" class="input" placeholder="Bild-URL (optional)" />
        <input id="popupSortOrder" class="input" type="number" placeholder="Reihenfolge" />

        <label style="display:flex;align-items:center;gap:8px">
          <input id="popupActive" type="checkbox" checked />
          Aktiv
        </label>

        <button id="addPopupBtn" class="btn btn--accent">Popup hinzufügen</button>
      </div>

      <table class="table" style="margin-top:14px">
        <thead>
          <tr>
            <th>Slug</th>
            <th>Titel</th>
            <th>Aktiv</th>
            <th>Reihenfolge</th>
            <th class="mono">ID</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${infoPopups.map((popup) => `
            <tr>
              <td>${escapeHtml(safeText(popup.slug))}</td>
              <td>${escapeHtml(pickLocalized(popup.title, lang))}</td>
              <td>${popup.is_active ? "ja" : "nein"}</td>
              <td>${Number(popup.sort_order ?? 0)}</td>
              <td class="mono">${escapeHtml(String(popup.id))}</td>
              <td style="white-space:nowrap">
                <button class="btn" data-edit-popup="${popup.id}">Bearbeiten</button>
                <button class="btn btn--danger" data-del-popup="${popup.id}">Löschen</button>
              </td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    `,
    false
  ) : "";

  const formsSection = isEditor ? sectionCard(
    "admin-forms",
    "Formulare",
    `<span class="badge badge--ok">Editor</span>`,
    `
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
    `,
    false
  ) : "";

  const auditSection = isAdmin ? sectionCard(
    "admin-audit",
    "Audit Log",
    `<span class="badge badge--ok">Admin</span>`,
    `
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
    `,
    false
  ) : "";

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
            <button type="button" class="btn" data-scroll-target="admin-branding">Branding</button>
            <button type="button" class="btn" data-scroll-target="admin-events">Events</button>
            <button type="button" class="btn" data-scroll-target="admin-galleries">Galerien</button>
            <button type="button" class="btn" data-scroll-target="admin-people">Team</button>
            ${isEditor ? `<button type="button" class="btn" data-scroll-target="admin-home-ticker">Live-Ticker</button>` : ""}
            ${isEditor ? `<button type="button" class="btn" data-scroll-target="admin-home-tiles">Startseiten-Kacheln</button>` : ""}
            ${isEditor ? `<button type="button" class="btn" data-scroll-target="admin-info-popups">Info-Popups</button>` : ""}
            ${isEditor ? `<button type="button" class="btn" data-scroll-target="admin-forms">Formulare</button>` : ""}
            ${isAdmin ? `<button type="button" class="btn" data-scroll-target="admin-audit">Audit Log</button>` : ""}
          </div>
        </div>

        <div class="grid" style="gap:14px">
          ${brandingSection}
          ${eventsSection}
          ${galleriesSection}
          ${peopleSection}
          ${tickerSection}
          ${tilesSection}
          ${popupsSection}
          ${formsSection}
          ${auditSection}
        </div>
      </div>
    </div>
  `;

  bindSectionNavigation(root);

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
        await renderAdmin(root);
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
    const file = e.target.files?.[0];
    const info = root.querySelector("#tileImageInfo");

    if (!info) return;

    if (!file) {
      info.textContent = "Kein Bild ausgewählt";
      return;
    }

    info.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;">
        <img src="${URL.createObjectURL(file)}"
             style="width:60px;height:60px;object-fit:cover;border-radius:10px;">
        <span>${escapeHtml(file.name)}</span>
      </div>
    `;
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
        const displayType = root.querySelector("#eventDisplayType")?.value || "auto";
        const previewImageFile = root.querySelector("#eventPreviewImageFile")?.files?.[0] || null;

        if (!de) {
          toast("Titel DE fehlt", "bad");
          return;
        }

        if (!date || !time) {
          toast("Datum oder Uhrzeit fehlt", "bad");
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
          display_type: displayType,
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
          const newDisplayType = prompt("Anzeige-Typ? (auto/today/urgent/future/info)", current.display_type ?? "auto") ?? "auto";
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
            preview_image_url: newPreviewImage,
            display_type: newDisplayType
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

        const sortOrder = Number(root.querySelector("#personSortOrder")?.value || "0") || 0;
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
        const displayType = root.querySelector("#tickerDisplayType")?.value || "info";
        const sortOrder = Number(root.querySelector("#tickerSortOrder")?.value || "0") || 0;
        const active = !!root.querySelector("#tickerActive")?.checked;

        if (!de) {
          toast("Ticker Text DE fehlt", "bad");
          return;
        }

        await createHomeTicker({
          text: { de, tr, en },
          color,
          display_type: displayType,
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
          const displayType = prompt("Anzeige-Typ? (info/urgent/future/today)", current.display_type ?? "info") ?? "info";
          const sortOrder = Number(prompt("Reihenfolge?", String(current.sort_order ?? 0)) ?? "0") || 0;
          const activeText = prompt("Aktiv? (yes/no)", current.active ? "yes" : "no") ?? "yes";

          await updateHomeTicker(id, {
            text: { de, tr, en },
            color,
            display_type: displayType,
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
        const popupSlug = root.querySelector("#tilePopupSlug")?.value.trim() || "";
        const tileImageFile = root.querySelector("#tileImageFile")?.files?.[0] || null;
        const sortOrder = Number(root.querySelector("#tileSortOrder")?.value || "0") || 0;
        const layoutWidth = root.querySelector("#tileLayoutWidth")?.value || "third";
        const layoutHeight = root.querySelector("#tileLayoutHeight")?.value || "medium";
        const active = !!root.querySelector("#tileActive")?.checked;

        if (!titleDe) {
          toast("Kachel Titel DE fehlt", "bad");
          return;
        }

        let imageUrl = "";
        if (tileImageFile) {
          try {
            imageUrl = await uploadTileImage(tileImageFile);
          } catch (err) {
            console.error(err);
            toast("Bild Upload fehlgeschlagen", "bad");
            return;
          }
        }

        await createHomeTile({
          title: { de: titleDe, tr: titleTr, en: titleEn },
          text: { de: textDe, tr: textTr, en: textEn },
          button_text: { de: buttonDe, tr: buttonTr, en: buttonEn },
          link_url: linkUrl,
          popup_slug: popupSlug,
          image_url: imageUrl,
          sort_order: sortOrder,
          layout_width: layoutWidth,
          layout_height: layoutHeight,
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
          const layoutWidth = prompt("Breite? (full/half/third/quarter/fifth)", current.layout_width ?? "third") ?? "third";
          const layoutHeight = prompt("Höhe? (small/medium/large)", current.layout_height ?? "medium") ?? "medium";
          const activeText = prompt("Aktiv? (yes/no)", current.active ? "yes" : "no") ?? "yes";

          await updateHomeTile(id, {
            title: { de: titleDe, tr: titleTr, en: titleEn },
            text: { de: textDe, tr: textTr, en: textEn },
            button_text: { de: buttonDe, tr: buttonTr, en: buttonEn },
            link_url: linkUrl,
            image_url: imageUrl,
            sort_order: sortOrder,
            layout_width: layoutWidth,
            layout_height: layoutHeight,
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
     INFO POPUPS
  ----------------------------------------------------------- */
  if (isEditor) {
    root.querySelector("#addPopupBtn")?.addEventListener("click", async () => {
      try {
        const slug = root.querySelector("#popupSlug")?.value.trim() || "";
        const titleDe = root.querySelector("#popupTitleDe")?.value.trim() || "";
        const titleTr = root.querySelector("#popupTitleTr")?.value.trim() || "";
        const titleEn = root.querySelector("#popupTitleEn")?.value.trim() || "";

        const contentDe = root.querySelector("#popupContentDe")?.value.trim() || "";
        const contentTr = root.querySelector("#popupContentTr")?.value.trim() || "";
        const contentEn = root.querySelector("#popupContentEn")?.value.trim() || "";

        const imageUrl = root.querySelector("#popupImageUrl")?.value.trim() || "";
        const sortOrder = Number(root.querySelector("#popupSortOrder")?.value || "0") || 0;
        const isActive = !!root.querySelector("#popupActive")?.checked;

        if (!slug) {
          toast("Slug fehlt", "bad");
          return;
        }

        if (!titleDe) {
          toast("Titel DE fehlt", "bad");
          return;
        }

        await createInfoPopup({
          slug,
          title: { de: titleDe, tr: titleTr, en: titleEn },
          content: { de: contentDe, tr: contentTr, en: contentEn },
          button_text: { de: "Mehr erfahren", tr: "Daha fazla", en: "Learn more" },
          image_url: imageUrl,
          is_active: isActive,
          sort_order: sortOrder
        });

        toast("Popup hinzugefügt", "ok");
        await renderAdmin(root);
      } catch (err) {
        console.error(err);
        toast("Popup konnte nicht erstellt werden", "bad");
      }
    });

    root.querySelectorAll("[data-edit-popup]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        try {
          const id = btn.getAttribute("data-edit-popup");
          const current = infoPopups.find((x) => String(x.id) === String(id));
          if (!current) return;

          const slug = prompt("Slug?", current.slug ?? "") ?? "";
          if (!slug) return;

          const titleDe = prompt("Titel DE?", current.title?.de ?? "") ?? "";
          const titleTr = prompt("Titel TR?", current.title?.tr ?? "") ?? "";
          const titleEn = prompt("Titel EN?", current.title?.en ?? "") ?? "";

          const contentDe = prompt("Text DE?", current.content?.de ?? "") ?? "";
          const contentTr = prompt("Text TR?", current.content?.tr ?? "") ?? "";
          const contentEn = prompt("Text EN?", current.content?.en ?? "") ?? "";

          const imageUrl = prompt("Bild-URL?", current.image_url ?? "") ?? "";
          const sortOrder = Number(prompt("Reihenfolge?", String(current.sort_order ?? 0)) ?? "0") || 0;
          const activeText = prompt("Aktiv? (yes/no)", current.is_active ? "yes" : "no") ?? "yes";

          await updateInfoPopup(id, {
            slug,
            title: { de: titleDe, tr: titleTr, en: titleEn },
            content: { de: contentDe, tr: contentTr, en: contentEn },
            image_url: imageUrl,
            sort_order: sortOrder,
            is_active: activeText.toLowerCase() === "yes"
          });

          toast("Popup aktualisiert", "ok");
          await renderAdmin(root);
        } catch (err) {
          console.error(err);
          toast("Popup konnte nicht aktualisiert werden", "bad");
        }
      });
    });

    root.querySelectorAll("[data-del-popup]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-del-popup");
        const ok = await confirmBox("Löschen?", `Popup ${id} wirklich löschen?`);
        if (!ok) return;

        try {
          await deleteInfoPopup(id);
          toast("Popup gelöscht", "ok");
          await renderAdmin(root);
        } catch (err) {
          console.error(err);
          toast("Popup konnte nicht gelöscht werden", "bad");
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
