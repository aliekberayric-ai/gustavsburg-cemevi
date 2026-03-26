/**
 * i18n.js
 * Premium multilingual system:
 * - loads de/tr/en JSON dictionaries
 * - applies translations to [data-i18n]
 * - updates active language buttons
 * - re-renders current route after language switch
 * - provides smart fallback for DB content
 */

let dicts = {};
let currentLang = "de";

export async function initI18n() {
  const [de, tr, en] = await Promise.all([
    fetch("i18n/de.json").then(r => r.json()),
    fetch("i18n/tr.json").then(r => r.json()),
    fetch("i18n/en.json").then(r => r.json())
  ]);

  dicts = { de, tr, en };
}

export function setLangFromStorage() {
  const saved = localStorage.getItem("lang");
  if (saved && dicts[saved]) {
    currentLang = saved;
  }
  applyTranslations();
  updateLangButtons();
}

export function bindLangButtons() {
  document.querySelectorAll("[data-lang]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const lang = btn.dataset.lang;
      setLang(lang);
    });
  });
}

export function setLang(lang) {
  currentLang = dicts[lang] ? lang : "de";
  localStorage.setItem("lang", currentLang);

  animateLanguageChange();
  applyTranslations();
  updateLangButtons();
  rerenderCurrentRoute();
}

export function getLang() {
  return currentLang;
}

export function t(key) {
  const parts = key.split(".");
  let obj = dicts[currentLang];

  for (const p of parts) {
    obj = obj?.[p];
  }

  return obj ?? key;
}

/**
 * For DB/localized content:
 * prefers current language, then DE, then EN, then TR
 */
export function pickLocalized(obj) {
  if (!obj) return "";
  if (typeof obj === "string") return obj;

  const order =
    currentLang === "de"
      ? ["de", "en", "tr"]
      : currentLang === "en"
      ? ["en", "de", "tr"]
      : ["tr", "de", "en"];

  for (const lang of order) {
    const value = obj?.[lang];
    if (typeof value === "string" && value.trim() !== "") {
      return value;
    }
  }

  return "";
}

export function applyTranslations() {
  document.documentElement.lang = currentLang;

  document.querySelectorAll("[data-i18n]").forEach((el) => {
    el.textContent = t(el.getAttribute("data-i18n"));
  });
}

export function updateLangButtons() {
  document.querySelectorAll("[data-lang]").forEach((btn) => {
    const isActive = btn.dataset.lang === currentLang;
    btn.classList.toggle("active", isActive);
    btn.setAttribute("aria-pressed", isActive ? "true" : "false");
  });
}

function rerenderCurrentRoute() {
  window.dispatchEvent(new HashChangeEvent("hashchange"));
}

function animateLanguageChange() {
  document.body.classList.remove("lang-fade");
  void document.body.offsetWidth;
  document.body.classList.add("lang-fade");
}
