import { t, getLang } from "../i18n.js";
import { listEventsPublic } from "../modules/events.js";
import { fmtDateTime, escapeHtml } from "../ui.js";

const EVENT_PLACEHOLDER = "assets/img/team-placeholder.png";

export async function renderCalendar(root) {
  const events = await listEventsPublic();
  const lang = getLang();

  root.innerHTML = `
    <div class="page">
      <h1 data-i18n="calendar.h1">${t("calendar.h1")}</h1>
      <p data-i18n="calendar.p">${t("calendar.p")}</p>

      <div class="card card__pad" style="margin-top:12px; overflow: visible;">
        <table class="table">
          <thead>
            <tr>
              <th data-i18n="calendar.th1">${t("calendar.th1")}</th>
              <th data-i18n="calendar.th2">${t("calendar.th2")}</th>
              <th data-i18n="calendar.th3">${t("calendar.th3")}</th>
              <th>Bild</th>
            </tr>
          </thead>
          <tbody>
            ${
              events.length
                ? events.map((e) => {
                    const title =
                      e?.title?.[lang] ??
                      e?.title?.de ??
                      e?.title?.tr ??
                      e?.title?.en ??
                      "—";

                    const location = e?.location ?? "—";
                    const previewImage = e?.preview_image_url || EVENT_PLACEHOLDER;

                    return `
                      <tr>
                        <td class="mono">${escapeHtml(fmtDateTime(e.start_time))}</td>
                        <td>${escapeHtml(title)}</td>
                        <td>${escapeHtml(location)}</td>
                        <td>
                          <div class="calendar-preview-wrap">
                            <img
                              class="calendar-preview-thumb"
                              src="${escapeHtml(previewImage)}"
                              alt="${escapeHtml(title)}"
                              loading="lazy"
                            />
                            <div class="calendar-preview-popup">
                              <img
                                src="${escapeHtml(previewImage)}"
                                alt="${escapeHtml(title)}"
                                loading="lazy"
                              />
                            </div>
                          </div>
                        </td>
                      </tr>
                    `;
                  }).join("")
                : `
                  <tr>
                    <td colspan="4" class="mono">Keine Events vorhanden.</td>
                  </tr>
                `
            }
          </tbody>
        </table>
      </div>
    </div>
  `;
}
