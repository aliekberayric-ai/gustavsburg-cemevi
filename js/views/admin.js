import { t, getLang } from "../i18n.js";
import { getAuth, signIn, signOut, requireRole } from "../auth.js";
import { toast, confirmBox, fmtDateTime, escapeHtml } from "../ui.js";

import { listEventsPublic, createEvent, updateEvent, deleteEvent } from "../modules/events.js";
import { listGalleriesPublic, createGallery, updateGallery, deleteGallery } from "../modules/gallery.js";
import { listPeoplePublic, createPerson, updatePerson, deletePerson } from "../modules/people.js";
import { listFormSubmissions, updateFormStatus } from "../modules/forms.js";
import { listAuditLogs } from "../modules/audit.js";

export async function renderAdmin(root){
  const auth = getAuth();
  const isEditor = requireRole(["admin","editor"]);
  const isAdmin = requireRole(["admin"]);

  // Not logged in: show login card
  if(!auth.user){
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

    root.querySelector("#loginForm").addEventListener("submit", async (e)=>{
      e.preventDefault();
      const fd = new FormData(e.target);
      await signIn(fd.get("email"), fd.get("password"));
      location.hash = "#/admin"; // re-render
    });

    return;
  }

  // Logged in: admin dashboard
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
            <div style="display:flex;justify-content:space-between;gap:10px;align-items:center">
              <h2 style="margin:0">Events</h2>
              ${isEditor ? `<button id="addEventBtn" class="btn btn--accent">${t("admin.add")}</button>` : `<span class="badge badge--warn">${t("admin.readOnly")}</span>`}
            </div>

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
                ${events.map(e=>{
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
            <div style="display:flex;justify-content:space-between;gap:10px;align-items:center">
              <h2 style="margin:0">Galerien</h2>
              ${isEditor ? `<button id="addGalleryBtn" class="btn btn--accent">${t("admin.add")}</button>` : `<span class="badge badge--warn">${t("admin.readOnly")}</span>`}
            </div>

            <table class="table" style="margin-top:10px">
              <thead>
                <tr>
                  <th>${t("admin.title")}</th>
                  <th>${t("admin.status")}</th>
                  <th class="mono">ID</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                ${galleries.map(g=>{
                  const title = g.title?.[lang] ?? g.title?.de ?? "—";
                  return `
                    <tr>
                      <td>${escapeHtml(title)}</td>
                      <td>${escapeHtml(g.status)}</td>
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

            <p class="mono" style="margin-top:10px">${t("admin.galleryItemsNote")}</p>
          </div>

          <!-- PEOPLE -->
          <div id="admin-people" class="card card__pad">
            <div style="display:flex;justify-content:space-between;gap:10px;align-items:center">
              <h2 style="margin:0">Team</h2>
              ${isEditor ? `<button id="addPersonBtn" class="btn btn--accent">${t("admin.add")}</button>` : `<span class="badge badge--warn">${t("admin.readOnly")}</span>`}
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
                ${people.map(p=>{
                  return `
                    <tr>
                      <td>${escapeHtml(p.name)}</td>
                      <td>${p.is_visible ? `<span class="badge badge--ok">yes</span>` : `<span class="badge badge--warn">no</span>`}</td>
                      <td class="mono">${escapeHtml(p.id)}</td>
                      <td style="white-space:nowrap">
                        ${isEditor ? `<button class="btn" data-edit-person="${p.id}">${t("admin.edit")}</button>` : ""}
                        ${isAdmin ? `<button class="btn btn--danger" data-del-person="${p.id}">${t("admin.delete")}</button>` : ""}
                      </td>
                    </tr>
                  `;
                }).join("")}
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
                  ${forms.map(f=>`
                    <tr>
                      <td>${escapeHtml(f.form_type)}</td>
                      <td class="mono">${escapeHtml(fmtDateTime(f.created_at))}</td>
                      <td>${escapeHtml(f.status)}</td>
                      <td class="mono">${escapeHtml(JSON.stringify(f.payload).slice(0,160))}…</td>
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
                  ${audits.map(a=>`
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

  // logout
  root.querySelector("#logoutBtn").addEventListener("click", async ()=>{
    await signOut();
    location.hash = "#/admin";
  });

  // Events CRUD UI (simple prompt-based for V1)
  if(isEditor){
    root.querySelector("#addEventBtn")?.addEventListener("click", async ()=>{
      const de = prompt("Titel DE?");
      if(!de) return;
      const tr = prompt("Titel TR?") ?? "";
      const en = prompt("Titel EN?") ?? "";
      const start = prompt("Start ISO (z.B. 2026-03-10T18:00:00+01:00)?");
      if(!start) return;
      const loc = prompt("Ort?") ?? "";
      await createEvent({ title:{de,tr,en}, start_time:start, location:loc, description:{de:"",tr:"",en:""} });
      toast("Event erstellt", "ok");
      location.hash="#/admin";
    });

    root.querySelectorAll("[data-edit-event]").forEach(btn=>{
      btn.addEventListener("click", async ()=>{
        const id = btn.getAttribute("data-edit-event");
        const newDe = prompt("Neuer Titel DE?");
        if(!newDe) return;
        await updateEvent(id, { title: { de:newDe, tr:"", en:"" } });
        toast("Event updated", "ok");
        location.hash="#/admin";
      });
    });
  }

  if(isAdmin){
    root.querySelectorAll("[data-del-event]").forEach(btn=>{
      btn.addEventListener("click", async ()=>{
        const id = btn.getAttribute("data-del-event");
        const ok = await confirmBox("Löschen?", `Event ${id} wirklich löschen?`);
        if(!ok) return;
        await deleteEvent(id);
        toast("Event gelöscht", "ok");
        location.hash="#/admin";
      });
    });
  }

  // Galleries CRUD
  if(isEditor){
    root.querySelector("#addGalleryBtn")?.addEventListener("click", async ()=>{
      const de = prompt("Galerie Titel DE?");
      if(!de) return;
      const tr = prompt("Titel TR?") ?? "";
      const en = prompt("Titel EN?") ?? "";
      await createGallery({ title:{de,tr,en}, description:{de:"",tr:"",en:""}, status:"active", sort_order:0 });
      toast("Galerie erstellt", "ok");
      location.hash="#/admin";
    });

    root.querySelectorAll("[data-edit-gallery]").forEach(btn=>{
      btn.addEventListener("click", async ()=>{
        const id = btn.getAttribute("data-edit-gallery");
        const status = prompt("Status (active/archived)?", "active");
        if(!status) return;
        await updateGallery(id, { status });
        toast("Galerie updated", "ok");
        location.hash="#/admin";
      });
    });
  }

  if(isAdmin){
    root.querySelectorAll("[data-del-gallery]").forEach(btn=>{
      btn.addEventListener("click", async ()=>{
        const id = btn.getAttribute("data-del-gallery");
        const ok = await confirmBox("Löschen?", `Galerie ${id} wirklich löschen?`);
        if(!ok) return;
        await deleteGallery(id);
        toast("Galerie gelöscht", "ok");
        location.hash="#/admin";
      });
    });
  }

  // People CRUD
  if(isEditor){
    root.querySelector("#addPersonBtn")?.addEventListener("click", async ()=>{
      const name = prompt("Name?");
      if(!name) return;
      await createPerson({
        name,
        role_title:{de:"",tr:"",en:""},
        bio:{de:"",tr:"",en:""},
        avatar_url:"",
        tasks:[],
        sort_order:0,
        is_visible:true
      });
      toast("Person erstellt", "ok");
      location.hash="#/admin";
    });

    root.querySelectorAll("[data-edit-person]").forEach(btn=>{
      btn.addEventListener("click", async ()=>{
        const id = btn.getAttribute("data-edit-person");
        const vis = prompt("Sichtbar? (yes/no)", "yes");
        if(!vis) return;
        await updatePerson(id, { is_visible: vis === "yes" });
        toast("Person updated", "ok");
        location.hash="#/admin";
      });
    });
  }

  if(isAdmin){
    root.querySelectorAll("[data-del-person]").forEach(btn=>{
      btn.addEventListener("click", async ()=>{
        const id = btn.getAttribute("data-del-person");
        const ok = await confirmBox("Löschen?", `Person ${id} wirklich löschen?`);
        if(!ok) return;
        await deletePerson(id);
        toast("Person gelöscht", "ok");
        location.hash="#/admin";
      });
    });
  }

  // Forms status + print
  if(isEditor){
    root.querySelectorAll("[data-form-status]").forEach(btn=>{
      btn.addEventListener("click", async ()=>{
        const id = btn.getAttribute("data-form-status");
        const next = btn.getAttribute("data-next");
        await updateFormStatus(id, next);
        toast("Status gesetzt", "ok");
        location.hash="#/admin";
      });
    });

    root.querySelector("#printFormsBtn")?.addEventListener("click", ()=>{
      window.print();
    });
  }
}
