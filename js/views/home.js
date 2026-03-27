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

function getEmptyTilesText(lang) {
  if (lang === "tr") return "Ana sayfa kutuları mevcut değil.";
  if (lang === "en") return "No homepage tiles available.";
  return "Keine Startseiten-Kacheln vorhanden.";
}

function getTodayStart() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
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

  const doubled = [...items, ...items];

  return `
    <div class="home-ticker ${reverse ? "home-ticker--reverse" : ""}">
      <div class="home-ticker-track">
        ${doubled.map((item) => `
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
