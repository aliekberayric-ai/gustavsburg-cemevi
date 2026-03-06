import { t, getLang } from "../i18n.js";
import { listPeoplePublic } from "../modules/people.js";
import { escapeHtml } from "../ui.js";

/* export async function renderPeople(root){
  const people = await listPeoplePublic();
  const lang = getLang(); */

export async function renderPeople(root = document.getElementById("app")) {
  const people = await listPeoplePublic();
  const lang = getLang();

  root.innerHTML = `
    <div class="page">
      <h1 data-i18n="people.h1">${t("people.h1")}</h1>
      <p data-i18n="people.p">${t("people.p")}</p>
   </div>';}
   
      <div class="grid grid-3" style="margin-top:12px">
        ${
          people.filter(p=>p.is_visible).map(p=>{
            const roleTitle = p.role_title?.[lang] ?? p.role_title?.de ?? "";
            const bio = p.bio?.[lang] ?? p.bio?.de ?? "";
            const tasks = Array.isArray(p.tasks) ? p.tasks : [];

            return `
              <div class="card card__pad">
                <div style="display:flex;gap:12px;align-items:center">
                  <div style="width:54px;height:54px;border-radius:18px;border:1px solid var(--line);background:rgba(255,255,255,0.04);overflow:hidden">
                    ${p.avatar_url ? `<img src="${escapeHtml(p.avatar_url)}" style="width:100%;height:100%;object-fit:cover" />` : ""}
                  </div>
                  <div>
                    <div style="font-weight:820">${escapeHtml(p.name)}</div>
                    <div style="color:var(--muted)">${escapeHtml(roleTitle)}</div>
                  </div>
                </div>

                <div style="margin-top:10px;color:var(--muted)">${escapeHtml(bio)}</div>

                ${tasks.length ? `
                  <hr />
                  <div style="font-weight:700;margin-bottom:6px">${t("people.tasks")}</div>
                  <ul style="margin:0;padding-left:18px;color:var(--muted)">
                    ${tasks.map(x=>`<li>${escapeHtml(String(x))}</li>`).join("")}
                  </ul>
                ` : ""}
              </div>
            `;
          }).join("")
        }
      </div>
    </div>
  `;
}
