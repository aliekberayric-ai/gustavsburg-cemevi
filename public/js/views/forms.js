import { t } from "../i18n.js";
import { submitForm } from "../modules/forms.js";
import { toast } from "../ui.js";

export async function renderForms(root){
  root.innerHTML = `
    <div class="page">
      <h1 data-i18n="forms.h1">${t("forms.h1")}</h1>
      <p data-i18n="forms.p">${t("forms.p")}</p>

      <div class="grid grid-2" style="margin-top:12px">
        <div class="card card__pad">
          <h2 data-i18n="forms.member.h">${t("forms.member.h")}</h2>
          <p data-i18n="forms.member.p">${t("forms.member.p")}</p>

          <form id="membershipForm" class="grid" style="margin-top:10px">
            <input class="input" name="first_name" placeholder="${t("forms.firstName")}" required />
            <input class="input" name="last_name" placeholder="${t("forms.lastName")}" required />
            <input class="input" name="email" placeholder="${t("forms.email")}" type="email" />
            <input class="input" name="phone" placeholder="${t("forms.phone")}" />
            <select class="select" name="member_type" required>
              <option value="">${t("forms.memberType")}</option>
              <option value="family">${t("forms.types.family")}</option>
              <option value="spouse">${t("forms.types.spouse")}</option>
              <option value="single">${t("forms.types.single")}</option>
              <option value="pensioner">${t("forms.types.pensioner")}</option>
            </select>
            <textarea class="textarea" name="notes" placeholder="${t("forms.notes")}"></textarea>

            <button class="btn btn--accent" type="submit">${t("forms.send")}</button>
            <div class="mono">${t("forms.hint")}</div>
          </form>
        </div>

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

  root.querySelector("#membershipForm").addEventListener("submit", async (e)=>{
    e.preventDefault();
    const payload = Object.fromEntries(new FormData(e.target).entries());
    await submitForm("membership", payload);
    e.target.reset();
    toast(t("forms.sent"), "ok");
  });

  root.querySelector("#funeralForm").addEventListener("submit", async (e)=>{
    e.preventDefault();
    const payload = Object.fromEntries(new FormData(e.target).entries());
    await submitForm("funeral", payload);
    e.target.reset();
    toast(t("forms.sent"), "ok");
  });
}
