import { getLang, t } from "../i18n.js";
import { submitForm } from "../modules/forms.js";
import { toast } from "../ui.js";

const MEMBERSHIP_APPLICATION_URL = "./assets/Mitgliedsantrag.jpeg";
const FORMS_MAIL_TO = "info@alevi-gg.de";

const FUNERAL_SERVICE_TEXTS = {
  de: `
BESTATTUNGSDIENSTE
Wir begleiten Sie bei Bestattungsangelegenheiten und unterstützen Sie und Ihre Familie.

UNSERE BESTATTUNGSDIENSTE
✔ Dokumentenservice
✔ Überführungsservice
✔ Religiöse Betreuung
✔ Sargservice
✔ Zuschuss zum Begleitflugticket
✔ Ambulanzservice in der Türkei
✔ Bestattungsdienste in Deutschland

Auch für eine Bestattung in Deutschland sind die Formalitäten dieselben.
Die Kosten für Grabstelle und Bestattung werden von den Angehörigen getragen.

EINMALIGE GEBÜHREN FÜR BESTATTUNGSDIENSTE
55–59 Jahre → 300 €
60–64 Jahre → 600 €
65–69 Jahre → 900 €
ab 70 Jahre → 1.800 €

Vom Vorstand des Cemevi festgelegt.

Monatliche Zahlung (5 EUR pro Person)
Kinder unter 18 Jahren eingeschlossen.
Gilt auch für Alleinerziehende, wenn das Kind im selben Haushalt lebt.
Für Mitglieder seit 5 Jahren: 50 % Ermäßigung auf die einmalige Zahlung.
`.trim(),
  en: `
FUNERAL SERVICES
We stand by you during funeral matters and provide support for you and your family.

OUR FUNERAL SERVICES
✔ Document service
✔ Transfer service
✔ Faith and religious service
✔ Coffin service
✔ Contribution toward an accompanying flight ticket
✔ Ambulance service in Turkey
✔ Burial services in Germany

The same formal procedures apply if you wish to bury your loved one in Germany.
The cemetery plot fee and burial-related costs are paid by the family.

ONE-TIME FUNERAL SERVICE FEE LIST
Ages 55–59 → 300 €
Ages 60–64 → 600 €
Ages 65–69 → 900 €
Ages 70 and above → 1,800 €

Determined by the Cemevi board.

Monthly payment (5 EUR per person)
Children under 18 are included.
This also applies to single-parent families when the child lives in the same household.
Members of 5 years receive a 50% discount on the one-time payment.
`.trim(),
  tr: `
CENAZE HİZMETLERİ
Cenaze hizmetlerinde yanınızda olur, sizin ve aileniz için destek sunarız.

CENAZE HİZMETLERİMİZ
✔ Evrak hizmeti
✔ Nakil hizmeti
✔ İnanç hizmeti
✔ Tabut hizmeti
✔ Refakatçi bileti katkı payı
✔ Türkiye'de ambulans servisi
✔ Almanya'da defin hizmetleri

Cenazenizi Almanya'da toprağa vermek için de tüm formalite işlemleri aynıdır.
Mezaryeri ücreti ve defin ile ilgili masraflar cenaze sahibi tarafından karşılanır.

BİR SEFERLİK CENAZE HİZMET BEDELİ LİSTESİ
55–59 yaş arası → 300 €
60–64 yaş arası → 600 €
65–69 yaş arası → 900 €
70 yaş ve üzeri → 1.800 €

Cemevi Yönetim kurulunca belirlenmiştir.

Aylık Ödeme (Kişi başına 5 EUR)
18 yaş altındaki çocuklar dahil.
Aynı zamanda çocuğun aynı hanede yaşadığı tek ebeveyni aileler için geçerlidir.
5 yıldır üye olanlar için: Tek seferlik ödeme tutarında %50 indirim.
`.trim()
};

export async function renderForms(root) {
  const funeralServiceText = FUNERAL_SERVICE_TEXTS[getLang()] || FUNERAL_SERVICE_TEXTS.de;
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
      </div>

      <div class="grid grid-2" style="margin-top:12px">
        <div class="card card__pad">
          <h2 data-i18n="forms.funeral.h">${t("forms.funeral.h")}</h2>
          <p data-i18n="forms.funeral.p">${t("forms.funeral.p")}</p>
          <pre class="mono" style="white-space:pre-wrap;margin-top:10px;line-height:1.6">${funeralServiceText}</pre>
          <form id="funeralForm" class="grid" style="margin-top:10px">
            <input class="input" name="name" placeholder="${t("forms.fullName")}" required />
            <input class="input" name="birthdate" placeholder="${t("forms.birthdate")}" />
            <select class="select" name="age_group">
              <option value="">${t("forms.ageGroup")}</option>
              <option value="55-59">55–59 yaş arası → 300 €</option>
              <option value="60-64">60–64 yaş arası → 600 €</option>
              <option value="65-69">65–69 yaş arası → 900 €</option>
              <option value="70+">70 yaş ve üzeri → 1.800 €</option>
            </select>
            <textarea class="textarea" name="wishes" placeholder="${t("forms.funeralWishes")}"></textarea>
            <button class="btn btn--accent" type="submit">${t("forms.send")}</button>
          </form>
        </div>
      </div>
    </div>
  `;

  root.querySelector("#funeralForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const payload = Object.fromEntries(new FormData(e.target).entries());
    await submitForm("funeral", payload);
    e.target.reset();
    toast(t("forms.sent"), "ok");
  });
}
