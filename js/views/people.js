import { t, getLang } from "../i18n.js";
import { listPeoplePublic } from "../modules/people.js";
import { escapeHtml } from "../ui.js";

function getLocalizedField(obj, lang) {
  if (!obj || typeof obj !== "object") return "";
  return (
    (obj[lang] && String(obj[lang]).trim()) ||
    (obj.de && String(obj.de).trim()) ||
    (obj.tr && String(obj.tr).trim()) ||
    (obj.en && String(obj.en).trim()) ||
    ""
  );
}

export async function renderPeople(root) {
  const lang = getLang();
  const people = await listPeoplePublic();

  const visiblePeople = (people ?? [])
    .filter((p) => p.is_visible)
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

  root.innerHTML = `
    <section class="page team-section">
      <h1>${t("nav.team") || "Team"}</h1>
      <div id="teamList" class="team-list"></div>
    </section>
  `;

  const teamList = root.querySelector("#teamList");
  if (!teamList) return;

  if (!visiblePeople.length) {
    teamList.innerHTML = `
      <div class="team-empty">
        ${t("team.empty") || "Noch keine Teammitglieder vorhanden."}
      </div>
    `;
    return;
  }

  teamList.innerHTML = visiblePeople.map((p) => {
    const role = getLocalizedField(p.role_title, lang);
    const bio = getLocalizedField(p.bio, lang);
    const image = (p.avatar_url && String(p.avatar_url).trim())
      ? p.avatar_url
      : "assets/team-placeholder.png";

    return `
      <article class="team-card">
        <div class="team-card__media">
          <div class="team-card__image-wrap">
            <img
              src="${escapeHtml(image)}"
              alt="${escapeHtml(p.name || "")}"
              class="team-card__image"
              loading="lazy"
            />
          </div>
          <div class="team-card__name">${escapeHtml(p.name || "-")}</div>
        </div>

        <div class="team-card__content">
          <div class="team-card__role">${escapeHtml(role || "-")}</div>
          <div class="team-card__bio">${escapeHtml(bio || "")}</div>
        </div>
      </article>
    `;
  }).join("");
}
