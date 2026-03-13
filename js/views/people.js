import { listPeoplePublic } from "../modules/people.js";
import { getLang } from "../i18n.js";
import { escapeHtml } from "../ui.js";

function pickLocalized(obj, lang) {
  return obj?.[lang] ?? obj?.de ?? "";
}

export async function renderPeople(root) {

  const lang = getLang();
  let people = [];

  try {
    people = await listPeoplePublic();
  } catch (err) {
    console.error("Fehler beim Laden des Teams:", err);
  }

  root.innerHTML = `
  <div class="page">

    <h1>Team</h1>

    <div class="people-grid">

      ${people.map(person => {

        const name = person.name ?? "";
        const role = pickLocalized(person.role_title, lang);
        const bio = pickLocalized(person.bio, lang);
        const img = person.avatar_url ?? "";

        return `

        <div class="person-card">

          <div class="person-card__media">

            ${
              img
              ? `<img src="${escapeHtml(img)}" alt="${escapeHtml(name)}">`
              : `<div class="person-card__placeholder">Kein Bild</div>`
            }

            <div class="person-card__name">
              ${escapeHtml(name)}
            </div>

          </div>

          <div class="person-card__body">

            <h3>${escapeHtml(role)}</h3>

            <p>
              ${escapeHtml(bio)}
            </p>

          </div>

        </div>

        `;

      }).join("")}

    </div>

  </div>
  `;
}
