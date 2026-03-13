import { listHomeTicker } from "../modules/homeTicker.js";
import { listHomeTiles } from "../modules/homeTiles.js";
import { getLang } from "../i18n.js";
import { escapeHtml } from "../ui.js";

function pickLocalized(obj, lang) {
  return obj?.[lang] ?? obj?.de ?? "";
}

function getTickerLabel(color) {
  if (color === "green") return "HEUTE";
  if (color === "yellow") return "BALD";
  if (color === "red") return "WICHTIG";
  return "INFO";
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
                      const label = getTickerLabel(color);

                      return `
                        <span class="home-ticker-item">
                          <span class="ticker-dot ticker-dot-${escapeHtml(color)}"></span>
                          <span class="ticker-label ticker-label-${escapeHtml(color)}">
                            ${label}
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
                    <span class="ticker-label ticker-label-neutral">INFO</span>
                    <span class="ticker-text">Derzeit keine aktuellen Hinweise vorhanden.</span>
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
                    const button = pickLocalized(tile.button_text, lang) || "Mehr";

                    return `
                      <div class="home-tile-card">
                        ${
                          tile.image_url
                            ? `<img src="${tile.image_url}" alt="${escapeHtml(title)}" class="home-tile-image">`
                            : ""
                        }

                        <div class="home-tile-body">
                          <h3>${escapeHtml(title)}</h3>
                          <p>${escapeHtml(text)}</p>

                          ${
                            tile.link_url
                              ? `<a href="${tile.link_url}" class="btn btn--accent">${escapeHtml(button)}</a>`
                              : ""
                          }
                        </div>
                      </div>
                    `;
                  })
                  .join("")}
              </div>
            `
            : `<div class="empty-state">Keine Startseiten-Kacheln vorhanden.</div>`
        }
      </section>

    </div>
  `;
}
