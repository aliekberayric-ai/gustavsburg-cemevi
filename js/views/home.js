import { listHomeTicker } from "../modules/homeTicker.js";
import { listHomeTiles } from "../modules/homeTiles.js";
import { getLang } from "../i18n.js";
import { escapeHtml } from "../ui.js";

function pickLocalized(obj, lang) {
  if (!obj) return "";

  // Falls Datenbank mal nur String statt Sprachobjekt enthält
  if (typeof obj === "string") return obj;

  return obj?.[lang] || obj?.de || obj?.tr || obj?.en || "";
}

function getTickerLabel(color, lang) {
  const labels = {
    de: {
      green: "HEUTE",
      yellow: "BALD",
      red: "WICHTIG",
      neutral: "INFO"
    },
    tr: {
      green: "BUGÜN",
      yellow: "YAKINDA",
      red: "ÖNEMLİ",
      neutral: "BİLGİ"
    },
    en: {
      green: "TODAY",
      yellow: "SOON",
      red: "IMPORTANT",
      neutral: "INFO"
    }
  };

  const safeLang = labels[lang] ? lang : "de";
  return labels[safeLang][color] || labels[safeLang].neutral;
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

export async function renderHome(root) {
  const lang = getLang();

  let ticker = [];
  let tiles = [];

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

  root.innerHTML = `
    <div class="page">

      <section class="home-ticker-section">
        <div class="home-ticker">
          <div class="home-ticker-track">
            ${
              ticker.length
                ? [...ticker, ...ticker]
                    .map((item) => {
                      const text = pickLocalized(item.text, lang);
                      const color = item.color || "neutral";
                      const label = getTickerLabel(color, lang);

                      return `
                        <span class="home-ticker-item">
                          <span class="ticker-dot ticker-dot-${escapeHtml(color)}"></span>
                          <span class="ticker-label ticker-label-${escapeHtml(color)}">
                            ${escapeHtml(label)}
                          </span>
                          <span class="ticker-text">
                            ${escapeHtml(text)}
                          </span>
                        </span>
                      `;
                    })
                    .join("")
                : `
                  <span class="home-ticker-item">
                    <span class="ticker-dot ticker-dot-neutral"></span>
                    <span class="ticker-label ticker-label-neutral">
                      ${escapeHtml(getTickerLabel("neutral", lang))}
                    </span>
                    <span class="ticker-text">
                      ${escapeHtml(getEmptyTickerText(lang))}
                    </span>
                  </span>
                `
            }
          </div>
        </div>
      </section>

      <section class="home-tiles-section">
        ${
          tiles.length
            ? `
              <div class="home-tiles-grid">
                ${tiles
                  .map((tile) => {
                    const title = pickLocalized(tile.title, lang);
                    const text = pickLocalized(tile.text, lang);
                    const button = pickLocalized(tile.button_text, lang) || getDefaultButtonText(lang);

                    return `
                      <div class="home-tile-card">
                        ${
                          tile.image_url
                            ? `<img src="${escapeHtml(tile.image_url)}" alt="${escapeHtml(title)}" class="home-tile-image">`
                            : ""
                        }

                        <div class="home-tile-body">
                          <h3>${escapeHtml(title)}</h3>
                          <p>${escapeHtml(text)}</p>

                          ${
                            tile.link_url
                              ? `<a href="${escapeHtml(tile.link_url)}" class="btn btn--accent">${escapeHtml(button)}</a>`
                              : ""
                          }
                        </div>
                      </div>
                    `;
                  })
                  .join("")}
              </div>
            `
            : `<div class="empty-state">${escapeHtml(getEmptyTilesText(lang))}</div>`
        }
      </section>

    </div>
  `;
}
