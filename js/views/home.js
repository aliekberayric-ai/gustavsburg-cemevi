import { t } from "../i18n.js";
import { t, getLang } from "../i18n.js";
import { escapeHtml } from "../ui.js";
import { listHomeTicker } from "../modules/homeTicker.js";
import { listHomeTiles } from "../modules/homeTiles.js";

export async function renderHome(root){
  root.innerHTML = `
    <div class="page">
      <div class="card card__pad glow floaty">
        <h1 data-i18n="home.h1">${t("home.h1")}</h1>
        <p data-i18n="home.p">${t("home.p")}</p>
        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:10px">
          <a class="btn btn--accent" href="#/calendar" data-i18n="home.cta1">${t("home.cta1")}</a>
          <a class="btn" href="#/forms" data-i18n="home.cta2">${t("home.cta2")}</a>
          <a class="btn" href="#/gallery" data-i18n="home.cta3">${t("home.cta3")}</a>
        </div>
      </div>

      <div class="grid grid-3" style="margin-top:14px">
        <div class="card card__pad">
          <h2 data-i18n="home.card1.t">${t("home.card1.t")}</h2>
          <p data-i18n="home.card1.p">${t("home.card1.p")}</p>
        </div>
        <div class="card card__pad">
          <h2 data-i18n="home.card2.t">${t("home.card2.t")}</h2>
          <p data-i18n="home.card2.p">${t("home.card2.p")}</p>
        </div>
        <div class="card card__pad">
          <h2 data-i18n="home.card3.t">${t("home.card3.t")}</h2>
          <p data-i18n="home.card3.p">${t("home.card3.p")}</p>
        </div>
      </div>
    </div>
  `;
}
