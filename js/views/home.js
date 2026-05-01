import { listHomeTicker } from "../modules/homeTicker.js";
import { listHomeTiles } from "../modules/homeTiles.js";
import { listEventsPublic } from "../modules/events.js";
import { getLang } from "../i18n.js";
import { escapeHtml } from "../ui.js";

function pickLocalized(obj, lang) {
  if (!obj) return "";
  if (typeof obj === "string") return obj;
  return obj?.[lang] || obj?.de || obj?.tr || obj?.en || "";
}

function getDefaultButtonText(lang) {
  if (lang === "tr") return "Daha fazla";
  if (lang === "en") return "More";
  return "Mehr";
}

function getEmptyTickerText(lang) {
  if (lang === "tr") return "Şu anda güncel duyuru bulunmamaktadır.";
  if (lang === "en") return "There are currently no announcements available.";
  return "Derzeit keine aktuellen Hinweise vorhanden.";
}

function getEmptyEventTickerText(lang) {
  if (lang === "tr") return "Şu anda yaklaşan etkinlik bulunmuyor.";
  if (lang === "en") return "There are currently no upcoming events.";
  return "Zurzeit sind keine kommenden Termine vorhanden.";
}

function getEmptyTilesText(lang) {
  if (lang === "tr") return "Ana sayfa kutuları mevcut değil.";
  if (lang === "en") return "No homepage tiles available.";
  return "Keine Startseiten-Kacheln vorhanden.";
}

function getTodayStart() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
}

function getDiffDays(date) {
  const todayStart = getTodayStart();
  return Math.floor((date - todayStart) / (1000 * 60 * 60 * 24));
}

function resolveDisplayType(item) {
  const explicit = item?.display_type || "auto";

  if (explicit !== "auto") return explicit;

  if (!item?.start_time) return "info";

  const date = new Date(item.start_time);
  const diffDays = getDiffDays(date);

  if (diffDays === 0) return "today";
  if (diffDays <= 2) return "urgent";
  return "future";
}

function getTypeMeta(displayType, lang) {
  const map = {
    today: {
      icon: "🟢",
      color: "green",
      label: lang === "tr" ? "BUGÜN" : lang === "en" ? "TODAY" : "HEUTE"
    },
    urgent: {
      icon: "🔥",
      color: "red",
      label: lang === "tr" ? "ÖNEMLİ" : lang === "en" ? "URGENT" : "DRINGEND"
    },
    future: {
      icon: "📅",
      color: "yellow",
      label: lang === "tr" ? "GELECEK" : lang === "en" ? "UPCOMING" : "ZUKUNFT"
    },
    info: {
      icon: "ℹ️",
      color: "neutral",
      label: lang === "tr" ? "BİLGİ" : lang === "en" ? "INFO" : "INFO"
    }
  };

  return map[displayType] || map.info;
}

function formatEventText(event, lang) {
  const title = pickLocalized(event.title, lang);
  const location = event.location ? ` • ${event.location}` : "";
  const date = new Date(event.start_time);

  const locale =
    lang === "tr" ? "tr-TR" :
    lang === "en" ? "en-US" :
    "de-DE";

  const dateStr = date.toLocaleDateString(locale, {
    day: "2-digit",
    month: "2-digit"
  });

  const timeStr = date.toLocaleTimeString(locale, {
    hour: "2-digit",
    minute: "2-digit"
  });

  return `${dateStr} • ${timeStr} • ${title}${location}`;
}

function buildTickerRow(items, reverse = false) {
  if (!items.length) return "";

  const totalChars = items.reduce((sum, item) => {
    return sum + String(item.text || "").length + String(item.label || "").length + 10;
  }, 0);

  const duration = Math.max(18, Math.ceil(totalChars / 6));

  return `
    <div class="home-ticker ${reverse ? "home-ticker--reverse" : ""}" style="--ticker-duration:${duration}s">
      <div class="home-ticker-track">
        ${items.map((item) => `
          <span class="home-ticker-item">
            <span class="ticker-icon">${item.icon}</span>
            <span class="ticker-label ticker-label-${escapeHtml(item.color)}">
              ${escapeHtml(item.label)}
            </span>
            <span class="ticker-text">
              ${escapeHtml(item.text)}
            </span>
          </span>
        `).join("")}
      </div>
    </div>
  `;
}

export async function renderHome(root) {
  const lang = getLang();

  let ticker = [];
  let tiles = [];
  let events = [];

  try {
    ticker = await listHomeTicker();
  } catch (err) {
    console.error("Fehler beim Laden des Tickers:", err);
  }

  try {
    tiles = await listHomeTiles();
  } catch (err) {
    console.error("Fehler beim Laden der Startseiten-Kacheln:", err);
  }

  try {
    events = await listEventsPublic();
  } catch (err) {
    console.error("Fehler beim Laden der Events:", err);
  }

  const manualItems = ticker
    .filter((item) => item.active)
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map((item) => {
      const displayType = item.display_type || "info";
      const meta = getTypeMeta(displayType, lang);

      return {
        text: pickLocalized(item.text, lang),
        icon: meta.icon,
        color: meta.color,
        label: meta.label
      };
    })
    .filter((item) => item.text);

  const upcomingEvents = events
    .filter((event) => {
      if (!event.start_time) return false;
      const eventDate = new Date(event.start_time);
      return eventDate >= getTodayStart();
    })
    .sort((a, b) => new Date(a.start_time) - new Date(b.start_time));

  const eventItems = upcomingEvents
    .map((event) => {
      const displayType = resolveDisplayType(event);
      const meta = getTypeMeta(displayType, lang);

      return {
        text: formatEventText(event, lang),
        icon: meta.icon,
        color: meta.color,
        label: meta.label
      };
    })
    .filter((item) => item.text);

  const activeTiles = tiles
    .filter((tile) => tile.active)
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

  root.innerHTML = `
    <div class="page">

      <section class="home-ticker-section">
        ${
          manualItems.length
            ? buildTickerRow(manualItems, false)
            : buildTickerRow([
                {
                  icon: "ℹ️",
                  color: "neutral",
                  label: lang === "tr" ? "BİLGİ" : lang === "en" ? "INFO" : "INFO",
                  text: getEmptyTickerText(lang)
                }
              ], false)
        }

        ${
          eventItems.length
            ? buildTickerRow(eventItems, true)
            : buildTickerRow([
                {
                  icon: "📅",
                  color: "neutral",
                  label: lang === "tr" ? "BİLGİ" : lang === "en" ? "INFO" : "INFO",
                  text: getEmptyEventTickerText(lang)
                }
              ], true)
        }
      </section>

      <section class="home-tiles-section">
        ${
          activeTiles.length
            ? `
              <div class="home-tiles-grid">
                ${activeTiles.map((tile) => {
                  const title = pickLocalized(tile.title, lang);
                  const text = pickLocalized(tile.text, lang);
                  const button = pickLocalized(tile.button_text, lang) || getDefaultButtonText(lang);

                  const widthClass = tile.layout_width ? `tile-width-${tile.layout_width}` : "tile-width-third";
                  const heightClass = tile.layout_height ? `tile-height-${tile.layout_height}` : "tile-height-medium";

                  return `
                    <div class="home-tile-card ${escapeHtml(widthClass)} ${escapeHtml(heightClass)}">
                      ${
                        tile.image_url
                          ? `<img src="${escapeHtml(tile.image_url)}" alt="${escapeHtml(title)}" class="home-tile-image">`
                          : ""
                      }

<div class="home-tile-body">
  <h3>${escapeHtml(title)}</h3>
  <p>${escapeHtml(text)}</p>

const button = pickLocalized(tile.button_text, lang) || getDefaultButtonText(lang);

<button class="btn btn- -accent home-popup-btn" data-popup-slug="${escapeHtml(tile.popup_slug)}">
    $(escapeHtml(button)}
  </button>

  ${
    tile.link_url
      ? `<a href="${escapeHtml(tile.link_url)}" class="btn btn--accent">${escapeHtml(button)}</a>`
      : ""
  }
</div
                    </div>
                  `;
                }).join("")}
              </div>
            `
            : `<div class="empty-state">${escapeHtml(getEmptyTilesText(lang))}</div>`
        }
      </section>

    </div>
  `;
}
