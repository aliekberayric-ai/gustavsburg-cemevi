import { uploadEventPreviewImage } from "../modules/eventImages.js";
import {
  listEventsPublic,
  createEvent,
  updateEvent,
  deleteEvent,
  uploadEventPreviewImage
} from "../modules/events.js";
import { t, getLang } from "../i18n.js";
import { getAuth, signIn, signOut, requireRole } from "../auth.js";
import { toast, confirmBox, fmtDateTime, escapeHtml } from "../ui.js";

import { openLightbox, initLightbox } from "../lightbox.js";

import { listEventsPublic, createEvent, updateEvent, deleteEvent } from "../modules/events.js";
import { listGalleriesPublic, updateGallery, deleteGallery } from "../modules/gallery.js";
import { listPeoplePublic, createPerson, updatePerson, deletePerson } from "../modules/people.js";
import { createGalleryWithFiles, fetchGalleryItems, updateGalleryItemOrder } from "../galleryService.js";
import { listFormSubmissions, updateFormStatus } from "../modules/forms.js";
import { listAuditLogs } from "../modules/audit.js";

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
        <img src="${e.target.result}" alt="${escapeHtml(file.name)}">
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

      const items = await fetchGalleryItems(g.id);
      countCell.textContent = String(items.length);
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

      const draggedIndex = items.findIndex((x) => x.id === draggedId);
      const targetIndex = items.findIndex((x) => x.id === targetId);

      if (draggedIndex < 0 || targetIndex < 0) return;

      const moved = items.splice(draggedIndex, 1)[0];
      items.splice(targetIndex, 0, moved);

      await updateGalleryItemOrder(items);
      await openAdminGallery(root, gallery);
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
  titleEl.textContent = gallery.title?.[lang] ?? gallery.title?.de ?? "Galerie";
  metaEl.textContent = `${items.length} Bilder`;
  wrap.innerHTML = "";

  if (!items.length) {
    wrap.innerHTML = `<div class="empty-state">In dieser Galerie sind noch keine Bilder.</div>`;
    return;
  }

  items.forEach((item, index) => {
    const card = document.createElement("div");
    card.className = "admin-gallery-sort-card";
    card.draggable = true;
    card.dataset.index = String(index);
    card.dataset.id = item.id;

    card.innerHTML = `
      <div class="admin-gallery-sort-card__image-wrap">
        <img src="${item.thumb_public_url}" alt="${escapeHtml(item.localized_caption || "")}">
        <button class="admin-gallery-sort-card__view btn" type="button">Ansehen</button>
      </div>
      <div class="admin-gallery-sort-card__caption">${escapeHtml(item.localized_caption || "")}</div>
    `;

    card.querySelector(".admin-gallery-sort-card__view")?.addEventListener("click", () => {
      openLightbox(items, index);
    });

    wrap.appendChild(card);
  });

 bindGallerySorting(root, gallery, items);
}

export async function renderAdmin(root) {
  const auth = getAuth();
  const isEditor = requireRole(["admin", "editor"]);
  const isAdmin = requireRole(["admin"]);

  // Not logged in
  if (!auth.user) {
    root.innerHTML = `
      <div class="page">
        <h1>Admin</h1>
        <div class="card card__pad" style="max-width:520px">
          <h2 data-i18n="admin.login">${t("admin.login")}</h2>
          <form id="loginForm" class="grid" style="margin-top:10px">
            <input class="input" name="email" placeholder="Email" type="email" required />
            <input class="input" name="password" placeholder="Password" type="password" required />
            <button class="btn btn--accent" type="submit">${t("admin.signIn")}</button>
            <div class="mono">${t("admin.loginHint")}</div>
          </form>
        </div>
      </div>
    `;

    root.querySelector("#loginForm")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      await signIn(fd.get("email"), fd.get("password"));
      location.hash = "#/admin";
    });

    return;
  }

  const lang = getLang();
  const [events, galleries, people, forms, audits] = await Promise.all([
    listEventsPublic(),
    listGalleriesPublic(),
    listPeoplePublic(),
    isEditor ? listFormSubmissions() : Promise.resolve([]),
    isAdmin ? listAuditLogs() : Promise.resolve([])
  ]);

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
            <a href="#admin-events" class="btn">Events</a>
            <a href="#admin-galleries" class="btn">Galerien</a>
            <a href="#admin-people" class="btn">Team</a>
            ${isEditor ? `<a href="#admin-forms" class="btn">Formulare</a>` : ""}
            ${isAdmin ? `<a href="#admin-audit" class="btn">Audit Log</a>` : ""}
          </div>
        </div>

        <div class="grid" style="gap:14px">

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
                  const title = e.title?.[lang] ?? e.title?.de ?? "—";
                  return `
                    <tr>
                      <td class="mono">${escapeHtml(fmtDateTime(e.start_time))}</td>
                      <td>${escapeHtml(title)}</td>
                      <td>${escapeHtml(e.location ?? "")}</td>
                      <td class="mono">${escapeHtml(e.id)}</td>
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
                  <button id="gallerySaveButton" class="btn btn--accent" type="button">
                    Galerie speichern
                  </button>
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
                  const title = g.title?.[lang] ?? g.title?.de ?? "—";
                  return `
                    <tr>
                      <td>
                        ${
                          g.cover_url
                            ? `<img src="${escapeHtml(g.cover_url)}" alt="Cover" style="width:72px;height:52px;object-fit:cover;border-radius:10px;">`
                            : `—`
                        }
                      </td>
                      <td>
                        <button class="btn" type="button" data-open-gallery="${g.id}">
                          ${escapeHtml(title)}
                        </button>
                      </td>
                      <td>${escapeHtml(g.status)}</td>
                      <td class="mono" data-gallery-count="${g.id}">…</td>
                      <td class="mono">${escapeHtml(g.id)}</td>
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
            <div style="display:flex;justify-content:space-between;gap:10px;align-items:center">
              <h2 style="margin:0">Team</h2>
             ${isEditor ? `
      <div style="display:grid;gap:8px;width:100%;margin-top:12px">
        <input id="personName" class="input" placeholder="Name" />
        <input id="personImage" class="input" placeholder="Bild-URL" />

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
            </div>

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
                    <td>${escapeHtml(p.name)}</td>
                    <td>${p.is_visible ? `<span class="badge badge--ok">yes</span>` : `<span class="badge badge--warn">no</span>`}</td>
                    <td class="mono">${escapeHtml(p.id)}</td>
                    <td style="white-space:nowrap">
                      ${isEditor ? `<button class="btn" data-edit-person="${p.id}">${t("admin.edit")}</button>` : ""}
                      ${isAdmin ? `<button class="btn btn--danger" data-del-person="${p.id}">${t("admin.delete")}</button>` : ""}
                    </td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          </div>

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
                      <td>${escapeHtml(f.form_type)}</td>
                      <td class="mono">${escapeHtml(fmtDateTime(f.created_at))}</td>
                      <td>${escapeHtml(f.status)}</td>
                      <td class="mono">${escapeHtml(JSON.stringify(f.payload).slice(0, 160))}…</td>
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
                      <td>${escapeHtml(a.action)}</td>
                      <td>${escapeHtml(a.table_name)}</td>
                      <td>${escapeHtml(a.actor_email ?? "")}</td>
                      <td class="mono">${escapeHtml(a.row_id ?? "")}</td>
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

root.querySelector("#eventPreviewImageFile")?.addEventListener("change", (e) => {
  const info = root.querySelector("#eventPreviewImageInfo");
  const file = e.target.files?.[0];

  if (!info) return;
  info.textContent = file ? `Ausgewählt: ${file.name}` : "Kein Bild ausgewählt";
});
  
  // Logout
  root.querySelector("#logoutBtn")?.addEventListener("click", async () => {
    await signOut();
    location.hash = "#/admin";
  });

  // Events CRUD
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

    // Robust für verschiedene Browserformate
    let parsedDate = null;

    if (date.includes("-") && time.includes(":")) {
      // z.B. 2026-03-13 + 19:00
      parsedDate = new Date(`${date}T${time}`);
    } else {
      // z.B. 03/13/2026 + 07:00 PM
      parsedDate = new Date(`${date} ${time}`);
    }

    if (!(parsedDate instanceof Date) || isNaN(parsedDate.getTime())) {
      console.log("DATE RAW:", date);
      console.log("TIME RAW:", time);
      toast("Ungültiges Datum oder Uhrzeit", "bad");
      return;
    }

    const startISO = parsedDate.toISOString();

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
    console.error("EVENT ERROR:", err);
    toast(err.message || "Event konnte nicht erstellt werden", "bad");
  }
});

    root.querySelectorAll("[data-edit-event]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        try {
          const id = btn.getAttribute("data-edit-event");
          if (!id) return;

          const newDe = prompt("Neuer Titel DE?");
          if (!newDe) return;

          const newTr = prompt("Neuer Titel TR?", "") ?? "";
          const newEn = prompt("Neuer Titel EN?", "") ?? "";
          const newDate = prompt("Neues Datum (DD-MM-YYYY)?", "01-03-2026");
          if (!newDate) return;

          const newTime = prompt("Neue Uhrzeit (HH:MM)?", "18:00");
          if (!newTime) return;

          const newLoc = prompt("Neuer Ort?", "") ?? "";
          const newPreviewImage = prompt("Neue Bild-URL?", "") ?? "";
          const newStart = new Date(`${newDate}T${newTime}:00`).toISOString();

           await updateEvent(id, {
           title: { de: newDe, tr: newTr, en: newEn },
           start_time: newStart,
           location: newLoc,
           preview_image_url: newPreviewImage
           });

          toast("Event aktualisiert", "ok");

const previewFileInput = root.querySelector("#eventPreviewImageFile");
const previewInfo = root.querySelector("#eventPreviewImageInfo");

if (previewFileInput) previewFileInput.value = "";
if (previewInfo) previewInfo.textContent = "Kein Bild ausgewählt";
          
          location.hash = "#/admin";
        } catch (err) {
          console.error(err);
          toast("Ungültiges Datum oder Uhrzeit", "bad");
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

        await deleteEvent(id);
        toast("Event gelöscht", "ok");
        location.hash = "#/admin";
      });
    });
  }

    // Galleries CRUD
  await fillGalleryCounts(root, galleries);

  root.querySelectorAll("[data-open-gallery]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-open-gallery");
      const gallery = galleries.find((g) => g.id === id);
      if (!gallery) return;

      await openAdminGallery(root, gallery);
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
    return;
  } catch (err) {
    console.error(err);
    alert(err.message || "Fehler beim Galerie-Upload");
    toast("Galerie konnte nicht erstellt werden", "bad");
  } finally {
    if (saveBtn) saveBtn.disabled = false;
  }
});
    
    root.querySelectorAll("[data-edit-gallery]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-edit-gallery");
        const status = prompt("Status (active/archived)?", "active");
        if (!status) return;

        await updateGallery(id, { status });
        toast("Galerie aktualisiert", "ok");
        location.hash = "#/admin";
      });
    });
  }

  if (isAdmin) {
    root.querySelectorAll("[data-del-gallery]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-del-gallery");
        const ok = await confirmBox("Löschen?", `Galerie ${id} wirklich löschen?`);
        if (!ok) return;

        await deleteGallery(id);
        toast("Galerie gelöscht", "ok");
        location.hash = "#/admin";
      });
    });
  }

  initLightbox();

  // People CRUD
// People CRUD
if (isEditor) {
  root.querySelector("#addPersonBtn")?.addEventListener("click", async () => {
    try {
      const name = root.querySelector("#personName")?.value.trim() || "";
      const avatarUrl = root.querySelector("#personImage")?.value.trim() || "";

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

      await createPerson({
        name,
        role_title: {
          de: roleDe,
          tr: roleTr,
          en: roleEn
        },
        bio: {
          de: bioDe,
          tr: bioTr,
          en: bioEn
        },
        avatar_url: avatarUrl,
        sort_order: sortOrder,
        is_visible: isVisible
      });

      toast("Teammitglied erstellt", "ok");
      location.hash = "#/admin";
    } catch (err) {
      console.error(err);
      toast("Teammitglied konnte nicht erstellt werden", "bad");
    }
  });

  root.querySelectorAll("[data-edit-person]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      try {
        const id = btn.getAttribute("data-edit-person");
        if (!id) return;

        const name = prompt("Name?") ?? "";
        if (!name) return;

        const roleDe = prompt("Aufgabe DE?", "") ?? "";
        const roleTr = prompt("Aufgabe TR?", "") ?? "";
        const roleEn = prompt("Aufgabe EN?", "") ?? "";

        const bioDe = prompt("Beschreibung DE?", "") ?? "";
        const bioTr = prompt("Beschreibung TR?", "") ?? "";
        const bioEn = prompt("Beschreibung EN?", "") ?? "";

        const avatarUrl = prompt("Bild-URL?", "") ?? "";
        const sortOrder = Number(prompt("Reihenfolge?", "0") ?? "0") || 0;
        const visibleText = prompt("Sichtbar? (yes/no)", "yes") ?? "yes";

        await updatePerson(id, {
          name,
          role_title: {
            de: roleDe,
            tr: roleTr,
            en: roleEn
          },
          bio: {
            de: bioDe,
            tr: bioTr,
            en: bioEn
          },
          avatar_url: avatarUrl,
          sort_order: sortOrder,
          is_visible: visibleText.toLowerCase() === "yes"
        });

        toast("Teammitglied aktualisiert", "ok");
        location.hash = "#/admin";
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

      await deletePerson(id);
      toast("Teammitglied gelöscht", "ok");
      location.hash = "#/admin";
    });
  });
}

  // Forms status + print
  if (isEditor) {
    root.querySelectorAll("[data-form-status]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-form-status");
        const next = btn.getAttribute("data-next");

        await updateFormStatus(id, next);
        toast("Status gesetzt", "ok");
        location.hash = "#/admin";
      });
    });

    root.querySelector("#printFormsBtn")?.addEventListener("click", () => {
      window.print();
    });
  }
}
