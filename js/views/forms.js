import { t } from "../i18n.js";
import { submitForm } from "../modules/forms.js";
import { toast } from "../ui.js";

const MEMBERSHIP_APPLICATION_URL = "./assets/Mitgliedsantrag.jpeg";
const FORMS_MAIL_TO = "info@alevi-gg.de";

export async function renderForms(root){
  const mailSubject = encodeURIComponent(t("forms.memberFile.mailSubject"));
  const mailBody = encodeURIComponent(t("forms.memberFile.mailBody"));

  root.innerHTML = `
    <div class="page">
      <h1 data-i18n="forms.h1">${t("forms.h1")}</h1>
      <p data-i18n="forms.p">${t("forms.p")}</p>

      <div class="card card__pad" style="margin-top:12px">
        <h2>${t("forms.memberFile.h")}</h2>
        <p>${t("forms.memberFile.p")}</p>

        <a href="${MEMBERSHIP_APPLICATION_URL}" target="_blank" rel="noopener" style="display:block;margin-top:12px">
          <img
            src="${MEMBERSHIP_APPLICATION_URL}"
            alt="${t("forms.memberFile.h")}"
            style="width:100%;max-height:520px;object-fit:contain;border-radius:8px;border:1px solid var(--line);background:rgba(255,255,255,0.04)"
          />
        </a>

        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:12px">
          <a class="btn btn--accent" href="${MEMBERSHIP_APPLICATION_URL}" target="_blank" rel="noopener">
            ${t("forms.memberFile.open")}
          </a>
          <a class="btn" href="${MEMBERSHIP_APPLICATION_URL}" download="Mitgliedsantrag.jpeg">
            ${t("forms.memberFile.download")}
          </a>
          <a class="btn" href="mailto:${FORMS_MAIL_TO}?subject=${mailSubject}&body=${mailBody}">
            ${t("forms.memberFile.email")}
          </a>
        </div>

        <div class="mono" style="margin-top:10px">${t("forms.memberFile.note")}</div>
      </div>

      <div class="grid grid-2" style="margin-top:12px">
        <div class="card card__pad">
          <h2 data-i18n="forms.funeral.h">${t("forms.funeral.h")}</h2>
          <p data-i18n="forms.funeral.p">${t("forms.funeral.p")}</p>

          <form id="funeralForm" class="grid" style="margin-top:10px">
            <input class="input" name="name" placeholder="${t("forms.fullName")}" required />
            <input class="input" name="birthdate" placeholder="${t("forms.birthdate")}" />
            <select class="select" name="age_group">
              <option value="">${t("forms.ageGroup")}</option>
              <option value="0-17">0–17</option>
              <option value="18-39">18–39</option>
              <option value="40-64">40–64</option>
              <option value="65+">65+</option>
            </select>
            <textarea class="textarea" name="wishes" placeholder="${t("forms.funeralWishes")}"></textarea>

            <button class="btn btn--accent" type="submit">${t("forms.send")}</button>
            <div class="mono">${t("forms.hint")}</div>
          </form>
        </div>
      </div>
    </div>
  `;

  root.querySelector("#funeralForm").addEventListener("submit", async (e)=>{
    e.preventDefault();
    const payload = Object.fromEntries(new FormData(e.target).entries());
    await submitForm("funeral", payload);
    e.target.reset();
    toast(t("forms.sent"), "ok");
  });
}
