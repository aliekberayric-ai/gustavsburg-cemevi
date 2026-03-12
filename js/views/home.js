import { t, getLang } from "../i18n.js";
import { escapeHtml } from "../ui.js";
import { listHomeTicker } from "../modules/homeTicker.js";
import { listHomeTiles } from "../modules/homeTiles.js";

function pickLocalized(value, lang) {
  if (!value) return "";
  if (typeof value === "string") return value;
  return value?.[lang] ?? value?.de ?? value?.tr ?? value?.en ?? "";
}

export async function renderHome(root) {
  const lang = getLang();

  let tickerItems = [];
  let tiles = [];

  try {
    tickerItems = await listHomeTicker();
  } catch (err) {
    console.error("Ticker load error:", err);
    tickerItems = [];
  }

  try {
    tiles = await listHomeTiles();
  } catch (err) {
    console.error("Tiles load error:", err);
    tiles = [];
  }

  root.innerHTML = `
    <div class="page">

      <section class="hero-section card card__pad">
        <div class="hero-section__inner">
          <div class="hero-section__content">
            <h1>Gustavsburg Cem Evi</h1>
            <p>
              ${
                lang === "tr"
                  ? "Birlik, kültür ve dayanışma için buluşma noktası."
                  : lang === "en"
                  ? "A place of community, culture and solidarity."
                  : "Ein Ort der Gemeinschaft, Kultur und Solidarität."
              }
            </p>

            <div class="hero-section__actions">
              <a class="btn btn--accent" href="#/calendar">
                ${
                  lang === "tr"
                    ? "Etkinlikler"
                    : lang === "en"
                    ? "Events"
                    : "Zu den Terminen"
                }
              </a>
              <a class="btn" href="#/gallery">
                ${
                  lang === "tr"
                    ? "Galeri"
                    : lang === "en"
                    ? "Gallery"
                    : "Galerie"
                }
              </a>
            </div>
          </div>
        </div>
      </section>

      <section class="home-ticker-section">
        <div class="home-ticker">
          <div class="home-ticker-track">
            ${
              tickerItems.length
                ? [...tickerItems, ...tickerItems].map((item) => {
                    const text = pickLocalized(item.text, lang);
                    return `<span class="home-ticker-item">● ${escapeHtml(text)}</span>`;
                  }).join("")
                : `<span class="home-ticker-item">● ${
                    lang === "tr"
                      ? "Güncel duyuru yok"
                      : lang === "en"
                      ? "No current announcements"
                      : "Keine aktuellen Meldungen"
                  }</span>`
            }
          </div>
        </div>
      </section>

      <section class="home-tiles-section">
        <div class="section-head">
          <h2>
            ${
              lang === "tr"
                ? "Güncel Bilgiler"
                : lang === "en"
                ? "Current Information"
                : "Aktuelle Informationen"
            }
          </h2>
          <p>
            ${
              lang === "tr"
                ? "Duyurular, etkinlikler ve önemli bilgiler."
                : lang === "en"
                ? "Announcements, events and important information."
                : "Ankündigungen, Veranstaltungen und wichtige Hinweise."
            }
          </p>
        </div>

        <div class="home-tiles-grid">
          ${
            tiles.length
              ? tiles.map((tile) => {
                  const title = pickLocalized(tile.title, lang);
                  const text = pickLocalized(tile.text, lang);
                  const buttonText = pickLocalized(tile.button_text, lang);
                  const imageUrl = tile.image_url?.trim() || "";
                  const linkUrl = tile.link_url?.trim() || "";

                  return `
                    <article class="home-tile-card">
                      ${
                        imageUrl
                          ? `<img class="home-tile-image" src="${escapeHtml(imageUrl)}" alt="${escapeHtml(title)}">`
                          : ""
                      }

                      <div class="home-tile-body">
                        <h3>${escapeHtml(title)}</h3>
                        <p>${escapeHtml(text)}</p>

                        ${
                          linkUrl && buttonText
                            ? `<a class="btn btn--accent" href="${escapeHtml(linkUrl)}">${escapeHtml(buttonText)}</a>`
                            : ""
                        }
                      </div>
                    </article>
                  `;
                }).join("")
              : `
                <div class="empty-state">
                  ${
                    lang === "tr"
                      ? "Henüz başlangıç sayfası kutuları eklenmedi."
                      : lang === "en"
                      ? "No home page tiles have been added yet."
                      : "Es wurden noch keine Startseiten-Kacheln angelegt."
                  }
                </div>
              `
          }
        </div>
      </section>

    </div>
  `;
}
