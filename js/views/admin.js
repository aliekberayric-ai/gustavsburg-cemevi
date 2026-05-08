import { t, getLang } from "../i18n.js";
import { getAuth, signIn, signOut, requireRole } from "../auth.js";
import { toast, confirmBox, fmtDateTime, escapeHtml } from "../ui.js";
import { getSiteSettings, updateSiteSettings, uploadBrandLogo, uploadBrandFavicon } from "../modules/siteSettings.js";
import { uploadTileImage } from "../modules/homeTiles.js";

import {
  listEventsPublic,
  createEvent,
  updateEvent,
  deleteEvent,
  uploadEventPreviewImage
} from "../modules/events.js?v=104";

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
} from "../galleryService.js?v=105";

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
} from "../modules/infoPopups.js?v=123"; 

/* -----------------------------------------------------------
   HELPERS
----------------------------------------------------------- */

function safeText(value, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function pickLocalized(obj, lang) {
  return obj?.[lang] ?? obj?.de ?? obj?.tr ?? obj?.en ?? "";
}

function getTileWidthLabel(value) {
  const labels = {
    full: "Ganze Breite",
    half: "1/2",
    third: "1/3",
    quarter: "1/4",
    fifth: "1/5",
    "1/1": "Ganze Breite",
    "1/2": "1/2",
    "1/3": "1/3",
    "1/4": "1/4",
    "1/5": "1/5"
  };

  return labels[value] || "1/3";
}

function getTileHeightLabel(value) {
  const labels = {
    small: "Flach",
    medium: "Mittel",
    large: "Groß"
  };

  return labels[value] || "Mittel";
}

function normalizeTileWidth(value) {
  const aliases = {
    "1/1": "full",
    "1/2": "half",
    "1/3": "third",
    "1/4": "quarter",
    "1/5": "fifth"
  };
  const normalized = aliases[value] || value;
  return ["full", "half", "third", "quarter", "fifth"].includes(normalized)
    ? normalized
    : "third";
}

function normalizeTileHeight(value) {
  return ["small", "medium", "large"].includes(value) ? value : "medium";
}

function getPersonHierarchyLevel(person) {
  const value = person?.hierarchy_level ?? person?.tasks?.hierarchy_level ?? 4;
  const level = Number(value);
  return Number.isFinite(level) && level >= 1 && level <= 4 ? level : 4;
}

function getPersonHierarchyLabel(level) {
  const normalized = Number(level);
  if (normalized === 1) return "Yönetim";
  if (normalized === 2) return "Inanckurumu";
  if (normalized === 3) return "Administration/Finanz";
  return "Team";
}

function buildPersonTasks(currentTasks, level) {
  const base = currentTasks && !Array.isArray(currentTasks) && typeof currentTasks === "object"
    ? currentTasks
    : {};

  return {
    ...base,
    hierarchy_level: Number(level) || 4
  };
}

function renderTeamHierarchyPreview(people, lang, draft = null) {
  const visiblePeople = people
    .filter((person) => person.is_visible)
    .filter((person) => !draft?.id || String(person.id) !== String(draft.id))
    .map((person) => ({
      id: person.id,
      name: safeText(person.name),
      role: pickLocalized(person.role_title, lang),
      sort_order: Number(person.sort_order ?? 0),
      hierarchy_level: getPersonHierarchyLevel(person),
      isDraft: false
    }));

  const previewPeople = draft?.name && draft?.is_visible !== false
    ? [
        ...visiblePeople,
        {
          ...draft,
          sort_order: Number(draft.sort_order ?? 0),
          hierarchy_level: Number(draft.hierarchy_level ?? 4),
          isDraft: true
        }
      ]
    : visiblePeople;

  const levels = [1, 2, 3, 4].map((level) => {
    const members = previewPeople
      .filter((person) => person.hierarchy_level === level)
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

    return `
      <div class="admin-team-preview__level">
        <div class="admin-team-preview__level-title">${escapeHtml(getPersonHierarchyLabel(level))}</div>
        <div class="admin-team-preview__members">
          ${
            members.length
              ? members.map((person) => `
                  <div class="admin-team-preview__person ${person.isDraft ? "is-draft" : ""}">
                    <strong>${escapeHtml(person.name || "Neues Teammitglied")}</strong>
                    <span>${escapeHtml(person.role || "Aufgabe")}</span>
                  </div>
                `).join("")
              : `<div class="admin-team-preview__empty">Noch leer</div>`
          }
        </div>
      </div>
    `;
  }).join("");

  return `<div class="admin-team-preview">${levels}</div>`;
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

function sectionCard(id, title, badgeHtml, innerHtml, startOpen = false) {
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

  let siteSettings = { site_title: "Gustavsburg Cem Evi", logo_url: "", favicon_url: "" };
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

        <div>
          <label for="siteFaviconInput">Favicon hochladen</label>
          <input
            id="siteFaviconInput"
            class="input"
            type="file"
            accept="image/png,image/jpeg,image/svg+xml,image/x-icon,.ico"
            ${isEditor ? "" : "disabled"}
          />
          <div class="mono" style="margin-top:6px">Empfohlen: quadratisch, z.B. 32x32 oder 64x64.</div>
        </div>

        <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap">
          <img
            id="siteLogoPreview"
            src="${escapeHtml(siteSettings?.logo_url || "")}"
            alt="Logo Preview"
            style="width:64px;height:64px;object-fit:contain;border-radius:12px;border:1px solid var(--line);background:rgba(255,255,255,0.04);${siteSettings?.logo_url ? "" : "display:none;"}"
          />
          <img
            id="siteFaviconPreview"
            src="${escapeHtml(siteSettings?.favicon_url || "")}"
            alt="Favicon Preview"
            style="width:42px;height:42px;object-fit:contain;border-radius:10px;border:1px solid var(--line);background:rgba(255,255,255,0.04);padding:5px;${siteSettings?.favicon_url ? "" : "display:none;"}"
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
          <input id="eventEditId" type="hidden" value="" />
          <div id="eventEditModeInfo" class="badge badge--warn hidden">Bearbeitungsmodus</div>
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
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <button id="addEventBtn" class="btn btn--accent">${t("admin.add")}</button>
            <button id="cancelEventEditBtn" class="btn hidden" type="button">Abbrechen</button>
          </div>
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
          <input id="galleryEditId" type="hidden" value="" />
          <div id="galleryEditModeInfo" class="badge badge--warn hidden">Bearbeitungsmodus</div>
          <input id="galleryTitleDe" class="input" placeholder="Galerietitel DE" />
          <input id="galleryTitleTr" class="input" placeholder="Galerietitel TR" />
          <input id="galleryTitleEn" class="input" placeholder="Galerietitel EN" />

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
            <button id="galleryCancelEditButton" class="btn hidden" type="button">Abbrechen</button>
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
          <input id="personEditId" type="hidden" value="" />
          <div id="personEditModeInfo" class="badge badge--warn hidden">Bearbeitungsmodus</div>
          <input id="personName" class="input" placeholder="Name" />
          <input id="personImageFile" class="input" type="file" accept="image/*" />
          <div id="personImageInfo" class="mono">Kein Bild ausgewählt</div>

          <input id="personRoleDe" class="input" placeholder="Aufgabe DE" />
          <input id="personRoleTr" class="input" placeholder="Aufgabe TR" />
          <input id="personRoleEn" class="input" placeholder="Aufgabe EN" />

          <textarea id="personBioDe" class="input" placeholder="Beschreibung DE" rows="4"></textarea>
          <textarea id="personBioTr" class="input" placeholder="Beschreibung TR" rows="4"></textarea>
          <textarea id="personBioEn" class="input" placeholder="Beschreibung EN" rows="4"></textarea>

          <select id="personHierarchyLevel" class="input">
            <option value="1">Ebene 1 – Yönetim</option>
            <option value="2">Ebene 2 – Inanckurumu</option>
            <option value="3">Ebene 3 – Administration/Finanz</option>
            <option value="4" selected>Ebene 4 – Team</option>
          </select>

          <input id="personSortOrder" class="input" type="number" placeholder="Reihenfolge (z.B. 1, 2, 3)" />
          <label style="display:flex;align-items:center;gap:8px">
            <input id="personVisible" type="checkbox" checked />
            Sichtbar
          </label>

          <div>
            <div class="mono" style="margin-bottom:8px">Vorschau vor dem Speichern</div>
            <div id="personHierarchyPreview">
              ${renderTeamHierarchyPreview(people, lang)}
            </div>
          </div>

          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <button id="addPersonBtn" class="btn btn--accent">${t("admin.add")}</button>
            <button id="cancelPersonEditBtn" class="btn hidden" type="button">Abbrechen</button>
          </div>
        </div>
      ` : ""}

      <table class="table" style="margin-top:10px">
        <thead>
          <tr>
            <th>${t("admin.name")}</th>
            <th>Ebene</th>
            <th>${t("admin.visible")}</th>
            <th class="mono">ID</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${people.map((p) => `
            <tr>
              <td>${escapeHtml(safeText(p.name))}</td>
              <td>${escapeHtml(getPersonHierarchyLabel(getPersonHierarchyLevel(p)))}</td>
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
        <input id="tickerEditId" type="hidden" value="" />
        <div id="tickerEditModeInfo" class="badge badge--warn hidden">Bearbeitungsmodus</div>
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

        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button id="addTickerBtn" class="btn btn--accent">Ticker hinzufügen</button>
          <button id="cancelTickerEditBtn" class="btn hidden" type="button">Abbrechen</button>
        </div>
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
        <input id="tileEditId" type="hidden" value="" />
        <div id="tileEditModeInfo" class="badge badge--warn hidden">Bearbeitungsmodus</div>
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

        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button id="addTileBtn" class="btn btn--accent">Kachel hinzufügen</button>
          <button id="cancelTileEditBtn" class="btn hidden" type="button">Abbrechen</button>
        </div>
      </div>

      <table class="table" style="margin-top:14px">
        <thead>
          <tr>
            <th>Titel</th>
            <th>Aktiv</th>
            <th>Reihenfolge</th>
            <th>Breite</th>
            <th>Höhe</th>
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
                <td>${escapeHtml(getTileWidthLabel(tile.layout_width))}</td>
                <td>${escapeHtml(getTileHeightLabel(tile.layout_height))}</td>
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
        <input id="popupEditId" type="hidden" value="" />
        <div id="popupEditModeInfo" class="badge badge--warn hidden">Bearbeitungsmodus</div>
        <input id="popupSlug" class="input" placeholder="Slug (z.B. mitgliedschaft)" />

        <input id="popupTitleDe" class="input" placeholder="Titel DE" />
        <input id="popupTitleTr" class="input" placeholder="Titel TR" />
        <input id="popupTitleEn" class="input" placeholder="Titel EN" />

        <textarea id="popupContentDe" class="input" placeholder="Text DE" rows="4"></textarea>
        <textarea id="popupContentTr" class="input" placeholder="Text TR" rows="4"></textarea>
        <textarea id="popupContentEn" class="input" placeholder="Text EN" rows="4"></textarea>

        <input id="popupImageFile" class="input" type="file" accept="image/*" />
        <div id="popupImageInfo" class="mono">Kein Bild ausgewählt</div>
        <input id="popupSortOrder" class="input" type="number" placeholder="Reihenfolge" />

        <label style="display:flex;align-items:center;gap:8px">
          <input id="popupActive" type="checkbox" checked />
          Aktiv
        </label>

        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button id="addPopupBtn" class="btn btn--accent" type="button">Popup hinzufügen</button>
          <button id="cancelPopupEditBtn" class="btn hidden" type="button">Abbrechen</button>
        </div>
        <div id="popupSaveStatus" class="mono" aria-live="polite"></div>
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
    const siteFaviconInput = root.querySelector("#siteFaviconInput");
    const siteLogoPreview = root.querySelector("#siteLogoPreview");
    const siteFaviconPreview = root.querySelector("#siteFaviconPreview");
    const saveBrandingBtn = root.querySelector("#saveBrandingBtn");

    let uploadedLogoUrl = siteSettings?.logo_url || "";
    let uploadedFaviconUrl = siteSettings?.favicon_url || "";

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

    siteFaviconInput?.addEventListener("change", async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      try {
        const faviconUrl = await uploadBrandFavicon(file);
        uploadedFaviconUrl = faviconUrl;

        if (siteFaviconPreview) {
          siteFaviconPreview.src = faviconUrl;
          siteFaviconPreview.style.display = "block";
        }

        const faviconEl = document.querySelector('link[rel="icon"]');
        if (faviconEl) faviconEl.href = faviconUrl;

        toast("Favicon hochgeladen", "ok");
      } catch (err) {
        console.error(err);
        toast("Favicon konnte nicht hochgeladen werden", "bad");
      }
    });

    saveBrandingBtn?.addEventListener("click", async () => {
      try {
        await updateSiteSettings({
          site_title: siteTitleInput?.value.trim() || "Gustavsburg Cem Evi",
          logo_url: uploadedLogoUrl || "",
          favicon_url: uploadedFaviconUrl || ""
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

  root.querySelector("#popupImageFile")?.addEventListener("change", (e) => {
    const file = e.target.files?.[0];
    const info = root.querySelector("#popupImageInfo");

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
    const resetEventForm = () => {
      [
        "#eventEditId",
        "#eventTitleDe",
        "#eventTitleTr",
        "#eventTitleEn",
        "#eventDate",
        "#eventTime",
        "#eventLocation"
      ].forEach((selector) => {
        const field = root.querySelector(selector);
        if (field) field.value = "";
      });

      const displayType = root.querySelector("#eventDisplayType");
      if (displayType) displayType.value = "auto";

      const imageInput = root.querySelector("#eventPreviewImageFile");
      if (imageInput) imageInput.value = "";

      const imageInfo = root.querySelector("#eventPreviewImageInfo");
      if (imageInfo) imageInfo.textContent = "Kein Bild ausgewählt";

      root.querySelector("#eventEditModeInfo")?.classList.add("hidden");
      root.querySelector("#cancelEventEditBtn")?.classList.add("hidden");

      const saveBtn = root.querySelector("#addEventBtn");
      if (saveBtn) saveBtn.textContent = t("admin.add");
    };

    const fillEventForm = (event) => {
      const setValue = (selector, value) => {
        const field = root.querySelector(selector);
        if (field) field.value = value ?? "";
      };

      const date = event.start_time ? new Date(event.start_time) : null;
      const dateValue = date && !Number.isNaN(date.getTime())
        ? date.toISOString().slice(0, 10)
        : "";
      const timeValue = date && !Number.isNaN(date.getTime())
        ? date.toISOString().slice(11, 16)
        : "";

      setValue("#eventEditId", event.id);
      setValue("#eventTitleDe", event.title?.de ?? "");
      setValue("#eventTitleTr", event.title?.tr ?? "");
      setValue("#eventTitleEn", event.title?.en ?? "");
      setValue("#eventDate", dateValue);
      setValue("#eventTime", timeValue);
      setValue("#eventLocation", event.location ?? "");

      const displayType = root.querySelector("#eventDisplayType");
      if (displayType) displayType.value = event.display_type ?? "auto";

      const imageInput = root.querySelector("#eventPreviewImageFile");
      if (imageInput) imageInput.value = "";

      const imageInfo = root.querySelector("#eventPreviewImageInfo");
      if (imageInfo) {
        imageInfo.textContent = event.preview_image_url
          ? "Aktuelles Bild bleibt erhalten, falls kein neues ausgewählt wird."
          : "Kein Bild ausgewählt";
      }

      root.querySelector("#eventEditModeInfo")?.classList.remove("hidden");
      root.querySelector("#cancelEventEditBtn")?.classList.remove("hidden");

      const saveBtn = root.querySelector("#addEventBtn");
      if (saveBtn) saveBtn.textContent = "Änderungen speichern";
    };

    root.querySelector("#cancelEventEditBtn")?.addEventListener("click", resetEventForm);

    root.querySelector("#addEventBtn")?.addEventListener("click", async () => {
      try {
        const editId = root.querySelector("#eventEditId")?.value || "";
        const current = editId
          ? events.find((event) => String(event.id) === String(editId))
          : null;
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

        let previewImageUrl = current?.preview_image_url || "";
        if (previewImageFile) {
          previewImageUrl = await uploadEventPreviewImage(previewImageFile);
        }

        const payload = {
          title: { de, tr, en },
          start_time: startISO,
          location: loc,
          preview_image_url: previewImageUrl,
          display_type: displayType,
          description: current?.description || { de: "", tr: "", en: "" }
        };

        if (editId) {
          await updateEvent(editId, payload);
          toast("Event aktualisiert", "ok");
        } else {
          await createEvent(payload);
          toast("Event erstellt", "ok");
        }

        await renderAdmin(root);
      } catch (err) {
        console.error(err);
        toast(err.message || "Event konnte nicht gespeichert werden", "bad");
      }
    });

    root.querySelectorAll("[data-edit-event]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        try {
          const id = btn.getAttribute("data-edit-event");
          const current = events.find((x) => String(x.id) === String(id));
          if (!current) return;

          const section = root.querySelector("#admin-events");
          const body = section?.querySelector(".admin-section__body");
          const toggle = section?.querySelector(".admin-section__toggle");

          body?.classList.remove("hidden");
          toggle?.classList.add("active");
          if (toggle) toggle.textContent = "Einklappen";

          fillEventForm(current);
          section?.scrollIntoView({ behavior: "smooth", block: "start" });
        } catch (err) {
          console.error(err);
          toast("Event konnte nicht geladen werden", "bad");
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

    const resetGalleryForm = () => {
      const setValue = (selector, value) => {
        const field = root.querySelector(selector);
        if (field) field.value = value;
      };

      setValue("#galleryEditId", "");
      setValue("#galleryTitleDe", "");
      setValue("#galleryTitleTr", "");
      setValue("#galleryTitleEn", "");
      setValue("#galleryStatus", "active");

      const filesInput = root.querySelector("#galleryFiles");
      if (filesInput) filesInput.value = "";

      const preview = root.querySelector("#galleryFilePreview");
      if (preview) preview.innerHTML = "";

      const count = root.querySelector("#galleryFileCount");
      if (count) count.textContent = "0 Bilder ausgewählt";

      const statusEl = root.querySelector("#galleryUploadStatus");
      if (statusEl) statusEl.textContent = "";

      root.querySelector("#galleryEditModeInfo")?.classList.add("hidden");
      root.querySelector("#galleryCancelEditButton")?.classList.add("hidden");

      const saveBtn = root.querySelector("#gallerySaveButton");
      if (saveBtn) saveBtn.textContent = "Galerie speichern";
    };

    const fillGalleryForm = (gallery) => {
      const setValue = (selector, value) => {
        const field = root.querySelector(selector);
        if (field) field.value = value;
      };

      setValue("#galleryEditId", gallery.id || "");
      setValue("#galleryTitleDe", gallery.title?.de || "");
      setValue("#galleryTitleTr", gallery.title?.tr || "");
      setValue("#galleryTitleEn", gallery.title?.en || "");
      setValue("#galleryStatus", gallery.status || "active");

      const filesInput = root.querySelector("#galleryFiles");
      if (filesInput) filesInput.value = "";

      const preview = root.querySelector("#galleryFilePreview");
      if (preview) preview.innerHTML = "";

      const count = root.querySelector("#galleryFileCount");
      if (count) count.textContent = "Bilder bleiben unverändert";

      const statusEl = root.querySelector("#galleryUploadStatus");
      if (statusEl) statusEl.textContent = "Bearbeiten aktiv";

      root.querySelector("#galleryEditModeInfo")?.classList.remove("hidden");
      root.querySelector("#galleryCancelEditButton")?.classList.remove("hidden");

      const saveBtn = root.querySelector("#gallerySaveButton");
      if (saveBtn) saveBtn.textContent = "Aktualisieren";
    };

    root.querySelector("#galleryFiles")?.addEventListener("change", (e) => {
      previewSelectedGalleryFiles(root, e.target.files);
    });

    root.querySelector("#galleryCancelEditButton")?.addEventListener("click", resetGalleryForm);

    root.querySelector("#gallerySaveButton")?.addEventListener("click", async () => {
      const saveBtn = root.querySelector("#gallerySaveButton");
      const statusEl = root.querySelector("#galleryUploadStatus");
      const editId = root.querySelector("#galleryEditId")?.value || "";
      const titleDeInput = root.querySelector("#galleryTitleDe");
      const titleTrInput = root.querySelector("#galleryTitleTr");
      const titleEnInput = root.querySelector("#galleryTitleEn");
      const statusInput = root.querySelector("#galleryStatus");
      const filesInput = root.querySelector("#galleryFiles");
      const preview = root.querySelector("#galleryFilePreview");
      const count = root.querySelector("#galleryFileCount");

      try {
        const title = {
          de: titleDeInput?.value.trim() || "",
          tr: titleTrInput?.value.trim() || "",
          en: titleEnInput?.value.trim() || ""
        };
        const status = statusInput?.value || "active";
        const files = Array.from(filesInput?.files || []);

        if (!title.de) {
          toast("Galerietitel fehlt", "bad");
          return;
        }

        if (!editId && !files.length) {
          toast("Bitte Bilder auswählen", "bad");
          return;
        }

        if (saveBtn) saveBtn.disabled = true;

        if (editId) {
          if (statusEl) statusEl.textContent = "Galerie wird aktualisiert ...";
          await updateGallery(editId, { title, status });
          toast("Galerie aktualisiert", "ok");
        } else {
          if (statusEl) statusEl.textContent = "Bilder werden hochgeladen ...";
          await createGalleryWithFiles({ title, status, files });
          toast("Galerie erstellt", "ok");
        }

        resetGalleryForm();

        await renderAdmin(root);
      } catch (err) {
        console.error(err);
        toast(err.message || "Galerie konnte nicht gespeichert werden", "bad");
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

          const section = root.querySelector("#admin-galleries");
          const body = section?.querySelector(".admin-section__body");
          const toggle = section?.querySelector(".admin-section__toggle");

          body?.classList.remove("hidden");
          toggle?.classList.add("active");
          if (toggle) toggle.textContent = "Einklappen";

          fillGalleryForm(current);
          section?.scrollIntoView({ behavior: "smooth", block: "start" });
        } catch (err) {
          console.error(err);
          toast("Galerie konnte nicht geladen werden", "bad");
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
    const refreshPersonPreview = () => {
      const preview = root.querySelector("#personHierarchyPreview");
      if (!preview) return;

      const draft = {
        id: root.querySelector("#personEditId")?.value || "",
        name: root.querySelector("#personName")?.value.trim() || "",
        role: root.querySelector("#personRoleDe")?.value.trim() || "",
        hierarchy_level: Number(root.querySelector("#personHierarchyLevel")?.value || "4") || 4,
        sort_order: Number(root.querySelector("#personSortOrder")?.value || "0") || 0,
        is_visible: !!root.querySelector("#personVisible")?.checked
      };

      preview.innerHTML = renderTeamHierarchyPreview(people, lang, draft);
    };

    const resetPersonForm = () => {
      const fields = [
        "#personEditId",
        "#personName",
        "#personRoleDe",
        "#personRoleTr",
        "#personRoleEn",
        "#personBioDe",
        "#personBioTr",
        "#personBioEn",
        "#personSortOrder"
      ];

      fields.forEach((selector) => {
        const field = root.querySelector(selector);
        if (field) field.value = "";
      });

      const imageInput = root.querySelector("#personImageFile");
      if (imageInput) imageInput.value = "";

      const hierarchy = root.querySelector("#personHierarchyLevel");
      if (hierarchy) hierarchy.value = "4";

      const visible = root.querySelector("#personVisible");
      if (visible) visible.checked = true;

      const info = root.querySelector("#personImageInfo");
      if (info) info.textContent = "Kein Bild ausgewählt";

      root.querySelector("#personEditModeInfo")?.classList.add("hidden");
      root.querySelector("#cancelPersonEditBtn")?.classList.add("hidden");

      const saveBtn = root.querySelector("#addPersonBtn");
      if (saveBtn) saveBtn.textContent = t("admin.add");

      refreshPersonPreview();
    };

    const fillPersonForm = (person) => {
      const setValue = (selector, value) => {
        const field = root.querySelector(selector);
        if (field) field.value = value ?? "";
      };

      setValue("#personEditId", person.id);
      setValue("#personName", person.name ?? "");
      setValue("#personRoleDe", person.role_title?.de ?? "");
      setValue("#personRoleTr", person.role_title?.tr ?? "");
      setValue("#personRoleEn", person.role_title?.en ?? "");
      setValue("#personBioDe", person.bio?.de ?? "");
      setValue("#personBioTr", person.bio?.tr ?? "");
      setValue("#personBioEn", person.bio?.en ?? "");
      setValue("#personSortOrder", String(person.sort_order ?? 0));

      const hierarchy = root.querySelector("#personHierarchyLevel");
      if (hierarchy) hierarchy.value = String(getPersonHierarchyLevel(person));

      const visible = root.querySelector("#personVisible");
      if (visible) visible.checked = !!person.is_visible;

      const imageInput = root.querySelector("#personImageFile");
      if (imageInput) imageInput.value = "";

      const info = root.querySelector("#personImageInfo");
      if (info) {
        info.textContent = person.avatar_url
          ? "Aktuelles Bild bleibt erhalten, falls kein neues ausgewählt wird."
          : "Kein Bild ausgewählt";
      }

      root.querySelector("#personEditModeInfo")?.classList.remove("hidden");
      root.querySelector("#cancelPersonEditBtn")?.classList.remove("hidden");

      const saveBtn = root.querySelector("#addPersonBtn");
      if (saveBtn) saveBtn.textContent = "Änderungen speichern";

      refreshPersonPreview();
    };

    [
      "#personName",
      "#personRoleDe",
      "#personHierarchyLevel",
      "#personSortOrder",
      "#personVisible"
    ].forEach((selector) => {
      root.querySelector(selector)?.addEventListener("input", refreshPersonPreview);
      root.querySelector(selector)?.addEventListener("change", refreshPersonPreview);
    });

    root.querySelector("#personImageFile")?.addEventListener("change", () => {
      const file = root.querySelector("#personImageFile")?.files?.[0] || null;
      const info = root.querySelector("#personImageInfo");
      if (info) info.textContent = file ? file.name : "Kein Bild ausgewählt";
    });

    root.querySelector("#cancelPersonEditBtn")?.addEventListener("click", resetPersonForm);

    root.querySelector("#addPersonBtn")?.addEventListener("click", async () => {
      try {
        const editId = root.querySelector("#personEditId")?.value || "";
        const current = editId
          ? people.find((p) => String(p.id) === String(editId))
          : null;
        const name = root.querySelector("#personName")?.value.trim() || "";
        const imageFile = root.querySelector("#personImageFile")?.files?.[0] || null;

        const roleDe = root.querySelector("#personRoleDe")?.value.trim() || "";
        const roleTr = root.querySelector("#personRoleTr")?.value.trim() || "";
        const roleEn = root.querySelector("#personRoleEn")?.value.trim() || "";

        const bioDe = root.querySelector("#personBioDe")?.value.trim() || "";
        const bioTr = root.querySelector("#personBioTr")?.value.trim() || "";
        const bioEn = root.querySelector("#personBioEn")?.value.trim() || "";

        const sortOrder = Number(root.querySelector("#personSortOrder")?.value || "0") || 0;
        const hierarchyLevel = Number(root.querySelector("#personHierarchyLevel")?.value || "4") || 4;
        const isVisible = !!root.querySelector("#personVisible")?.checked;

        if (!name) {
          toast("Name fehlt", "bad");
          return;
        }

        let avatarUrl = current?.avatar_url || "";
        if (imageFile) {
          avatarUrl = await uploadPersonImage(imageFile);
        }

        const payload = {
          name,
          role_title: { de: roleDe, tr: roleTr, en: roleEn },
          bio: { de: bioDe, tr: bioTr, en: bioEn },
          tasks: buildPersonTasks(current?.tasks, hierarchyLevel),
          avatar_url: avatarUrl,
          sort_order: sortOrder,
          is_visible: isVisible
        };

        if (editId) {
          await updatePerson(editId, payload);
          toast("Teammitglied aktualisiert", "ok");
        } else {
          await createPerson(payload);
          toast("Teammitglied erstellt", "ok");
        }

        await renderAdmin(root);
      } catch (err) {
        console.error(err);
        toast("Teammitglied konnte nicht gespeichert werden", "bad");
      }
    });

    root.querySelectorAll("[data-edit-person]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        try {
          const id = btn.getAttribute("data-edit-person");
          const current = people.find((p) => String(p.id) === String(id));
          if (!current) return;

          const section = root.querySelector("#admin-people");
          const body = section?.querySelector(".admin-section__body");
          const toggle = section?.querySelector(".admin-section__toggle");

          body?.classList.remove("hidden");
          toggle?.classList.add("active");
          if (toggle) toggle.textContent = "Einklappen";

          fillPersonForm(current);
          section?.scrollIntoView({ behavior: "smooth", block: "start" });
        } catch (err) {
          console.error(err);
          toast("Teammitglied konnte nicht geladen werden", "bad");
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
    const resetTickerForm = () => {
      const setValue = (selector, value) => {
        const field = root.querySelector(selector);
        if (field) field.value = value;
      };

      setValue("#tickerEditId", "");
      setValue("#tickerTextDe", "");
      setValue("#tickerTextTr", "");
      setValue("#tickerTextEn", "");
      setValue("#tickerColor", "neutral");
      setValue("#tickerDisplayType", "info");
      setValue("#tickerSortOrder", "");

      const activeInput = root.querySelector("#tickerActive");
      if (activeInput) activeInput.checked = true;

      root.querySelector("#tickerEditModeInfo")?.classList.add("hidden");
      root.querySelector("#cancelTickerEditBtn")?.classList.add("hidden");

      const saveBtn = root.querySelector("#addTickerBtn");
      if (saveBtn) saveBtn.textContent = "Ticker hinzufügen";
    };

    const fillTickerForm = (item) => {
      const setValue = (selector, value) => {
        const field = root.querySelector(selector);
        if (field) field.value = value;
      };

      setValue("#tickerEditId", item.id || "");
      setValue("#tickerTextDe", item.text?.de || "");
      setValue("#tickerTextTr", item.text?.tr || "");
      setValue("#tickerTextEn", item.text?.en || "");
      setValue("#tickerColor", item.color || "neutral");
      setValue("#tickerDisplayType", item.display_type || "info");
      setValue("#tickerSortOrder", String(item.sort_order ?? ""));

      const activeInput = root.querySelector("#tickerActive");
      if (activeInput) activeInput.checked = item.active !== false;

      root.querySelector("#tickerEditModeInfo")?.classList.remove("hidden");
      root.querySelector("#cancelTickerEditBtn")?.classList.remove("hidden");

      const saveBtn = root.querySelector("#addTickerBtn");
      if (saveBtn) saveBtn.textContent = "Aktualisieren";
    };

    root.querySelector("#cancelTickerEditBtn")?.addEventListener("click", resetTickerForm);

    root.querySelector("#addTickerBtn")?.addEventListener("click", async () => {
      try {
        const editId = root.querySelector("#tickerEditId")?.value || "";
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

        const payload = {
          text: { de, tr, en },
          color,
          display_type: displayType,
          sort_order: sortOrder,
          active
        };

        if (editId) {
          await updateHomeTicker(editId, payload);
          toast("Ticker aktualisiert", "ok");
        } else {
          await createHomeTicker(payload);
          toast("Ticker hinzugefügt", "ok");
        }

        await renderAdmin(root);
      } catch (err) {
        console.error(err);
        toast("Ticker konnte nicht gespeichert werden", "bad");
      }
    });

    root.querySelectorAll("[data-edit-ticker]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        try {
          const id = btn.getAttribute("data-edit-ticker");
          const current = tickerItems.find((item) => String(item.id) === String(id));
          if (!current) return;

          const section = root.querySelector("#admin-home-ticker");
          const body = section?.querySelector(".admin-section__body");
          const toggle = section?.querySelector(".admin-section__toggle");

          body?.classList.remove("hidden");
          toggle?.classList.add("active");
          if (toggle) toggle.textContent = "Einklappen";

          fillTickerForm(current);
          section?.scrollIntoView({ behavior: "smooth", block: "start" });
        } catch (err) {
          console.error(err);
          toast("Ticker konnte nicht geladen werden", "bad");
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
    const resetTileForm = () => {
      const setValue = (selector, value) => {
        const field = root.querySelector(selector);
        if (field) field.value = value;
      };

      setValue("#tileEditId", "");
      setValue("#tileTitleDe", "");
      setValue("#tileTitleTr", "");
      setValue("#tileTitleEn", "");
      setValue("#tileTextDe", "");
      setValue("#tileTextTr", "");
      setValue("#tileTextEn", "");
      setValue("#tileButtonTextDe", "");
      setValue("#tileButtonTextTr", "");
      setValue("#tileButtonTextEn", "");
      setValue("#tileLinkUrl", "");
      setValue("#tilePopupSlug", "");
      setValue("#tileSortOrder", "");
      setValue("#tileLayoutWidth", "third");
      setValue("#tileLayoutHeight", "medium");

      const imageInput = root.querySelector("#tileImageFile");
      if (imageInput) imageInput.value = "";

      const imageInfo = root.querySelector("#tileImageInfo");
      if (imageInfo) imageInfo.textContent = "Kein Bild ausgewählt";

      const activeInput = root.querySelector("#tileActive");
      if (activeInput) activeInput.checked = true;

      root.querySelector("#tileEditModeInfo")?.classList.add("hidden");
      root.querySelector("#cancelTileEditBtn")?.classList.add("hidden");

      const saveBtn = root.querySelector("#addTileBtn");
      if (saveBtn) saveBtn.textContent = "Kachel hinzufügen";
    };

    const fillTileForm = (tile) => {
      const setValue = (selector, value) => {
        const field = root.querySelector(selector);
        if (field) field.value = value;
      };

      setValue("#tileEditId", tile.id || "");
      setValue("#tileTitleDe", tile.title?.de || "");
      setValue("#tileTitleTr", tile.title?.tr || "");
      setValue("#tileTitleEn", tile.title?.en || "");
      setValue("#tileTextDe", tile.text?.de || "");
      setValue("#tileTextTr", tile.text?.tr || "");
      setValue("#tileTextEn", tile.text?.en || "");
      setValue("#tileButtonTextDe", tile.button_text?.de || "");
      setValue("#tileButtonTextTr", tile.button_text?.tr || "");
      setValue("#tileButtonTextEn", tile.button_text?.en || "");
      setValue("#tileLinkUrl", tile.link_url || "");
      setValue("#tilePopupSlug", tile.popup_slug || "");
      setValue("#tileSortOrder", String(tile.sort_order ?? ""));
      setValue("#tileLayoutWidth", normalizeTileWidth(tile.layout_width || "third"));
      setValue("#tileLayoutHeight", normalizeTileHeight(tile.layout_height || "medium"));

      const imageInput = root.querySelector("#tileImageFile");
      if (imageInput) imageInput.value = "";

      const imageInfo = root.querySelector("#tileImageInfo");
      if (imageInfo) {
        imageInfo.textContent = tile.image_url
          ? "Aktuelles Bild bleibt erhalten, falls kein neues ausgewählt wird."
          : "Kein Bild ausgewählt";
      }

      const activeInput = root.querySelector("#tileActive");
      if (activeInput) activeInput.checked = tile.active !== false;

      root.querySelector("#tileEditModeInfo")?.classList.remove("hidden");
      root.querySelector("#cancelTileEditBtn")?.classList.remove("hidden");

      const saveBtn = root.querySelector("#addTileBtn");
      if (saveBtn) saveBtn.textContent = "Aktualisieren";
    };

    root.querySelector("#cancelTileEditBtn")?.addEventListener("click", resetTileForm);

    root.querySelector("#addTileBtn")?.addEventListener("click", async () => {
      try {
        const editId = root.querySelector("#tileEditId")?.value || "";
        const current = editId
          ? homeTiles.find((tile) => String(tile.id) === String(editId))
          : null;
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
        const layoutWidth = normalizeTileWidth(root.querySelector("#tileLayoutWidth")?.value || "third");
        const layoutHeight = normalizeTileHeight(root.querySelector("#tileLayoutHeight")?.value || "medium");
        const active = !!root.querySelector("#tileActive")?.checked;

        if (!titleDe) {
          toast("Kachel Titel DE fehlt", "bad");
          return;
        }

        let imageUrl = current?.image_url || "";
        if (tileImageFile) {
          try {
            imageUrl = await uploadTileImage(tileImageFile);
          } catch (err) {
            console.error(err);
            toast("Bild Upload fehlgeschlagen", "bad");
            return;
          }
        }

        const payload = {
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
        };

        if (editId) {
          await updateHomeTile(editId, payload);
          toast("Kachel aktualisiert", "ok");
        } else {
          await createHomeTile(payload);
          toast("Kachel hinzugefügt", "ok");
        }

        await renderAdmin(root);
      } catch (err) {
        console.error(err);
        toast("Kachel konnte nicht gespeichert werden", "bad");
      }
    });

    root.querySelectorAll("[data-edit-tile]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        try {
          const id = btn.getAttribute("data-edit-tile");
          const current = homeTiles.find((tile) => String(tile.id) === String(id));
          if (!current) return;

          const section = root.querySelector("#admin-home-tiles");
          const body = section?.querySelector(".admin-section__body");
          const toggle = section?.querySelector(".admin-section__toggle");

          body?.classList.remove("hidden");
          toggle?.classList.add("active");
          if (toggle) toggle.textContent = "Einklappen";

          fillTileForm(current);
          section?.scrollIntoView({ behavior: "smooth", block: "start" });
        } catch (err) {
          console.error(err);
          toast("Kachel konnte nicht geladen werden", "bad");
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
    const setPopupStatus = (message = "", kind = "info") => {
      const status = root.querySelector("#popupSaveStatus");
      if (!status) return;
      status.textContent = message;
      status.style.color =
        kind === "ok" ? "var(--ok)" :
        kind === "bad" ? "var(--bad)" :
        "var(--muted)";
    };

    const resetPopupForm = () => {
      const setValue = (selector, value) => {
        const field = root.querySelector(selector);
        if (field) field.value = value;
      };

      setValue("#popupEditId", "");
      setValue("#popupSlug", "");
      setValue("#popupTitleDe", "");
      setValue("#popupTitleTr", "");
      setValue("#popupTitleEn", "");
      setValue("#popupContentDe", "");
      setValue("#popupContentTr", "");
      setValue("#popupContentEn", "");
      setValue("#popupSortOrder", "");

      const imageInput = root.querySelector("#popupImageFile");
      if (imageInput) imageInput.value = "";

      const imageInfo = root.querySelector("#popupImageInfo");
      if (imageInfo) imageInfo.textContent = "Kein Bild ausgewählt";

      setPopupStatus("");

      const activeInput = root.querySelector("#popupActive");
      if (activeInput) activeInput.checked = true;

      root.querySelector("#popupEditModeInfo")?.classList.add("hidden");
      root.querySelector("#cancelPopupEditBtn")?.classList.add("hidden");

      const saveBtn = root.querySelector("#addPopupBtn");
      if (saveBtn) saveBtn.textContent = "Popup hinzufügen";
    };

    const fillPopupForm = (popup) => {
      const setValue = (selector, value) => {
        const field = root.querySelector(selector);
        if (field) field.value = value;
      };

      setValue("#popupEditId", popup.id || "");
      setValue("#popupSlug", popup.slug || "");
      setValue("#popupTitleDe", popup.title?.de || "");
      setValue("#popupTitleTr", popup.title?.tr || "");
      setValue("#popupTitleEn", popup.title?.en || "");
      setValue("#popupContentDe", popup.content?.de || "");
      setValue("#popupContentTr", popup.content?.tr || "");
      setValue("#popupContentEn", popup.content?.en || "");
      setValue("#popupSortOrder", String(popup.sort_order ?? ""));

      const imageInput = root.querySelector("#popupImageFile");
      if (imageInput) imageInput.value = "";

      const imageInfo = root.querySelector("#popupImageInfo");
      if (imageInfo) {
        imageInfo.textContent = popup.image_url
          ? "Aktuelles Bild bleibt erhalten, falls kein neues ausgewählt wird."
          : "Kein Bild ausgewählt";
      }

      const activeInput = root.querySelector("#popupActive");
      if (activeInput) activeInput.checked = popup.is_active !== false;

      root.querySelector("#popupEditModeInfo")?.classList.remove("hidden");
      root.querySelector("#cancelPopupEditBtn")?.classList.remove("hidden");
      setPopupStatus(`Bearbeiten aktiv: ${popup.slug || popup.id}`);

      const saveBtn = root.querySelector("#addPopupBtn");
      if (saveBtn) saveBtn.textContent = "Aktualisieren";
    };

    root.querySelector("#cancelPopupEditBtn")?.addEventListener("click", resetPopupForm);

    root.querySelector("#addPopupBtn")?.addEventListener("click", async () => {
      const saveBtn = root.querySelector("#addPopupBtn");
      try {
        setPopupStatus("Speichern läuft ...");
        if (saveBtn) saveBtn.disabled = true;

        let editId = root.querySelector("#popupEditId")?.value || "";
        let current = editId
          ? infoPopups.find((popup) => String(popup.id) === String(editId))
          : null;
        const slug = root.querySelector("#popupSlug")?.value.trim() || "";
        const titleDe = root.querySelector("#popupTitleDe")?.value.trim() || "";
        const titleTr = root.querySelector("#popupTitleTr")?.value.trim() || "";
        const titleEn = root.querySelector("#popupTitleEn")?.value.trim() || "";

        const contentDe = root.querySelector("#popupContentDe")?.value.trim() || "";
        const contentTr = root.querySelector("#popupContentTr")?.value.trim() || "";
        const contentEn = root.querySelector("#popupContentEn")?.value.trim() || "";

        const popupImageFile = root.querySelector("#popupImageFile")?.files?.[0] || null;
        let imageUrl = current?.image_url || "";
        try {
          if (popupImageFile) {
            imageUrl = await uploadInfoPopupImage(popupImageFile);
          }
        } catch (err) {
          console.warn("Bild Upload fehlgeschlagen: ", err);
        }

        const sortOrder = Number(root.querySelector("#popupSortOrder")?.value || "0") || 0;
        const isActive = !!root.querySelector("#popupActive")?.checked;

        if (!slug) {
          setPopupStatus("Slug fehlt.", "bad");
          toast("Slug fehlt", "bad");
          return;
        }

        if (!titleDe) {
          setPopupStatus("Titel DE fehlt.", "bad");
          toast("Titel DE fehlt", "bad");
          return;
        }

        if (!editId && slug) {
          current = infoPopups.find((popup) => String(popup.slug).toLowerCase() === slug.toLowerCase()) || null;
          editId = current?.id || "";
        }

        const payload = {
          slug,
          title: { de: titleDe, tr: titleTr, en: titleEn },
          content: { de: contentDe, tr: contentTr, en: contentEn },
          image_url: imageUrl,
          is_active: isActive,
          sort_order: sortOrder
        };

        console.info("Info-Popup speichern", { mode: editId ? "update" : "create", editId, payload });

        if (editId) {
          await updateInfoPopup(editId, payload);
          setPopupStatus("Popup wurde aktualisiert.", "ok");
          toast("Popup aktualisiert", "ok");
        } else {
          await createInfoPopup(payload);
          setPopupStatus("Popup wurde gespeichert.", "ok");
          toast("Popup hinzugefügt", "ok");
        }

        setTimeout(() => renderAdmin(root), 650);
      } catch (err) {
        console.error(err);
        setPopupStatus(err?.message || "Popup konnte nicht gespeichert werden.", "bad");
        toast(err?.message || "Popup konnte nicht gespeichert werden", "bad");
      } finally {
        if (saveBtn) saveBtn.disabled = false;
      }
    });

    root.querySelectorAll("[data-edit-popup]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        try {
          const id = btn.getAttribute("data-edit-popup");
          const current = infoPopups.find((x) => String(x.id) === String(id));
          if (!current) return;

          const section = root.querySelector("#admin-info-popups");
          const body = section?.querySelector(".admin-section__body");
          const toggle = section?.querySelector(".admin-section__toggle");

          body?.classList.remove("hidden");
          toggle?.classList.add("active");
          if (toggle) toggle.textContent = "Einklappen";

          fillPopupForm(current);
          section?.scrollIntoView({ behavior: "smooth", block: "start" });
        } catch (err) {
          console.error(err);
          toast("Popup konnte nicht geladen werden", "bad");
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
