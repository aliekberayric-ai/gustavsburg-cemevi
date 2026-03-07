import { t, getLang } from "../i18n.js";
import { listEventsPublic } from "../modules/events.js";
import { fmtDateTime, escapeHtml } from "../ui.js";

export async function renderCalendar(root){
  const events = await listEventsPublic();

  root.innerHTML = `
    <div class="page">
      <h1 data-i18n="calendar.h1">${t("calendar.h1")}</h1>
      <p data-i18n="calendar.p">${t("calendar.p")}</p>

      <div class="card card__pad" style="margin-top:12px">
        <table class="table">
          <thead>
            <tr>
              <th data-i18n="calendar.th1">${t("calendar.th1")}</th>
              <th data-i18n="calendar.th2">${t("calendar.th2")}</th>
              <th data-i18n="calendar.th3">${t("calendar.th3")}</th>
            </tr>
          </thead>
          <tbody>
            ${
              events.map(e=>{
                const lang = getLang();
                const title = e.title?.[lang] ?? e.title?.de ?? "—";
                return `<tr>
                  <td class="mono">${escapeHtml(fmtDateTime(e.start_time))}</td>
                  <td>${escapeHtml(title)}</td>
                  <td>${escapeHtml(e.location ?? "")}</td>
                </tr>`;
              }).join("")
            }
          </tbody>
        </table>
      </div>
    </div>
  `;
}
