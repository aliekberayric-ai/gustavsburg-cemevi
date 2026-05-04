import { listPeoplePublic } from "../modules/people.js";
import { getLang } from "../i18n.js";
import { escapeHtml } from "../ui.js";

function pickLocalized(obj, lang) {
  return obj?.[lang] ?? obj?.de ?? "";
}

function getHierarchyLevel(person) {
  const value = person?.hierarchy_level ?? person?.tasks?.hierarchy_level ?? 4;
  const level = Number(value);
  return Number.isFinite(level) && level >= 1 && level <= 4 ? level : 4;
}

function getHierarchyTitle(level) {
  if (level === 1) return "Yönetim";
  if (level === 2) return "Inanckurumu";
  if (level === 3) return "Administration/Finanz";
  return "Team";
}

function renderPersonCard(person, lang) {
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
        <p>${escapeHtml(bio)}</p>
      </div>
    </div>
  `;
}

export async function renderPeople(root) {

  const lang = getLang();
  let people = [];

  try {
    people = await listPeoplePublic();
  } catch (err) {
    console.error("Fehler beim Laden des Teams:", err);
  }

  const levels = [1, 2, 3, 4]
    .map((level) => {
      const members = people
        .filter((person) => getHierarchyLevel(person) === level)
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

      if (!members.length) return "";

      return `
        <section class="people-hierarchy-level people-hierarchy-level--${level}">
          <div class="people-hierarchy-title">${escapeHtml(getHierarchyTitle(level))}</div>
          <div class="people-grid">
            ${members.map((person) => renderPersonCard(person, lang)).join("")}
          </div>
        </section>
      `;
    })
    .join("");

  root.innerHTML = `
    <div class="page">
      <div class="people-hierarchy">
        ${levels || `<div class="empty-state">Keine Teammitglieder vorhanden.</div>`}
      </div>
    </div>
  `;
}
