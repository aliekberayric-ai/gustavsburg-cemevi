import { t, getLang } from "../i18n.js";
import { listEventsPublic } from "../modules/events.js";
import { fmtDateTime, escapeHtml } from "../ui.js";

const EVENT_PLACEHOLDER = "assets/img/team-placeholder.png";

let calendarView = "table";
let visibleMonth = getMonthStart(new Date());

function pickLocalized(obj, lang) {
  return obj?.[lang] ?? obj?.de ?? obj?.tr ?? obj?.en ?? "—";
}

function getEventTitle(event, lang) {
  return pickLocalized(event?.title, lang);
}

function getEventDescription(event, lang) {
  return pickLocalized(event?.description, lang);
}

function getEventImage(event) {
  return event?.preview_image_url && String(event.preview_image_url).trim() !== ""
    ? event.preview_image_url
    : EVENT_PLACEHOLDER;
}

function getMonthStart(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date, amount) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function getDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatMonthLabel(date, lang) {
  const locale = lang === "tr" ? "tr-TR" : lang === "en" ? "en-US" : "de-DE";
  return date.toLocaleDateString(locale, {
    month: "long",
    year: "numeric"
  });
}

function formatEventTime(date, lang) {
  const locale = lang === "tr" ? "tr-TR" : lang === "en" ? "en-US" : "de-DE";
  return date.toLocaleTimeString(locale, {
    hour: "2-digit",
    minute: "2-digit"
  });
}

function getWeekdayLabels(lang) {
  if (lang === "tr") return ["Pzt", "Sal", "Car", "Per", "Cum", "Cmt", "Paz"];
  if (lang === "en") return ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  return ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
}

function buildTable(events, lang) {
  return `
    <div class="card card__pad calendar-table-card">
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
            Array.isArray(events) && events.length
              ? events.map((event) => {
                  const title = getEventTitle(event, lang);
                  const location = event?.location ?? "—";
                  const previewImage = getEventImage(event);
                  const startTime = event?.start_time ? fmtDateTime(event.start_time) : "—";

                  return `
                    <tr>
                      <td class="mono">${escapeHtml(startTime)}</td>
                      <td>${escapeHtml(title)}</td>
                      <td>${escapeHtml(location)}</td>
                      <td>
                        <div class="calendar-preview-wrap">
                          <img
                            class="calendar-preview-thumb"
                            src="${escapeHtml(previewImage)}"
                            alt="${escapeHtml(title)}"
                            loading="lazy"
                            onerror="this.onerror=null;this.src='${EVENT_PLACEHOLDER}'"
                          />
                          <div class="calendar-preview-popup">
                            <img
                              src="${escapeHtml(previewImage)}"
                              alt="${escapeHtml(title)}"
                              loading="lazy"
                              onerror="this.onerror=null;this.src='${EVENT_PLACEHOLDER}'"
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
  `;
}

function buildMonthCalendar(events, lang) {
  const monthStart = getMonthStart(visibleMonth);
  const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);
  const firstWeekday = (monthStart.getDay() + 6) % 7;
  const totalCells = 42;
  const todayKey = getDateKey(new Date());
  const locale = lang === "tr" ? "tr-TR" : lang === "en" ? "en-US" : "de-DE";

  const eventsByDay = new Map();
  events.forEach((event) => {
    if (!event?.start_time) return;
    const date = new Date(event.start_time);
    if (Number.isNaN(date.getTime())) return;
    const key = getDateKey(date);
    const dayEvents = eventsByDay.get(key) || [];
    dayEvents.push(event);
    eventsByDay.set(key, dayEvents);
  });

  const cells = Array.from({ length: totalCells }, (_, index) => {
    const dayOffset = index - firstWeekday + 1;
    const date = new Date(monthStart.getFullYear(), monthStart.getMonth(), dayOffset);
    const inMonth = date.getMonth() === monthStart.getMonth();
    const dateKey = getDateKey(date);
    const dayEvents = eventsByDay.get(dateKey) || [];
    const dayLabel = date.toLocaleDateString(locale, { day: "2-digit" });
    const fullDate = date.toLocaleDateString(locale, {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric"
    });

    const visibleEvents = dayEvents.slice(0, 3);
    const extraCount = Math.max(0, dayEvents.length - visibleEvents.length);

    return `
      <div class="calendar-month-cell ${inMonth ? "" : "is-outside"} ${dateKey === todayKey ? "is-today" : ""}">
        <div class="calendar-month-day">
          <span>${escapeHtml(dayLabel)}</span>
        </div>
        <div class="calendar-month-events">
          ${visibleEvents.map((event) => {
            const title = getEventTitle(event, lang);
            const description = getEventDescription(event, lang);
            const image = getEventImage(event);
            const startDate = new Date(event.start_time);
            const time = formatEventTime(startDate, lang);
            const location = event?.location || "—";

            return `
              <div class="calendar-month-event" tabindex="0">
                <img
                  class="calendar-month-event__icon"
                  src="${escapeHtml(image)}"
                  alt="${escapeHtml(title)}"
                  loading="lazy"
                  onerror="this.onerror=null;this.src='${EVENT_PLACEHOLDER}'"
                />
                <span class="calendar-month-event__title">${escapeHtml(title)}</span>
                <div class="calendar-event-popover">
                  <img
                    src="${escapeHtml(image)}"
                    alt="${escapeHtml(title)}"
                    loading="lazy"
                    onerror="this.onerror=null;this.src='${EVENT_PLACEHOLDER}'"
                  />
                  <div class="calendar-event-popover__body">
                    <div class="calendar-event-popover__date">${escapeHtml(fullDate)} · ${escapeHtml(time)}</div>
                    <h3>${escapeHtml(title)}</h3>
                    <p>${escapeHtml(location)}</p>
                    ${description && description !== "—" ? `<p>${escapeHtml(description)}</p>` : ""}
                  </div>
                </div>
              </div>
            `;
          }).join("")}
          ${extraCount ? `<div class="calendar-month-more">+ ${extraCount} weitere</div>` : ""}
        </div>
      </div>
    `;
  }).join("");

  return `
    <div class="card card__pad calendar-month-card">
      <div class="calendar-month-head">
        <button class="btn" type="button" data-calendar-month="prev">Zurück</button>
        <h2>${escapeHtml(formatMonthLabel(monthStart, lang))}</h2>
        <button class="btn" type="button" data-calendar-month="next">Weiter</button>
      </div>

      <div class="calendar-month-weekdays">
        ${getWeekdayLabels(lang).map((label) => `<div>${escapeHtml(label)}</div>`).join("")}
      </div>

      <div class="calendar-month-grid">
        ${cells}
      </div>
    </div>
  `;
}

function bindCalendarControls(root, events, lang) {
  root.querySelectorAll("[data-calendar-view]").forEach((button) => {
    button.addEventListener("click", () => {
      calendarView = button.getAttribute("data-calendar-view") || "table";
      renderCalendarContent(root, events, lang);
    });
  });

  root.querySelectorAll("[data-calendar-month]").forEach((button) => {
    button.addEventListener("click", () => {
      const direction = button.getAttribute("data-calendar-month") === "next" ? 1 : -1;
      visibleMonth = addMonths(visibleMonth, direction);
      renderCalendarContent(root, events, lang);
    });
  });
}

function renderCalendarContent(root, events, lang) {
  const content = root.querySelector("#calendarViewContent");
  if (!content) return;

  content.innerHTML = calendarView === "month"
    ? buildMonthCalendar(events, lang)
    : buildTable(events, lang);

  root.querySelectorAll("[data-calendar-view]").forEach((button) => {
    const isActive = button.getAttribute("data-calendar-view") === calendarView;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-pressed", isActive ? "true" : "false");
  });

  bindCalendarControls(root, events, lang);
}

export async function renderCalendar(root) {
  const events = await listEventsPublic();
  const lang = getLang();

  root.innerHTML = `
    <div class="page">
      <div class="calendar-page-head">
        <div>
          <h1 data-i18n="calendar.h1">${t("calendar.h1")}</h1>
        </div>

        <div class="calendar-view-switch" role="group" aria-label="Kalenderansicht">
          <button class="btn" type="button" data-calendar-view="table" aria-pressed="false">Liste</button>
          <button class="btn" type="button" data-calendar-view="month" aria-pressed="false">Monat</button>
        </div>
      </div>

      <div id="calendarViewContent" class="calendar-view-content"></div>
    </div>
  `;

  renderCalendarContent(root, events, lang);
}
