/**
 * i18n.js
 * Minimal multilingual system:
 * - loads de/tr/en JSON dictionaries
 * - applies translations to [data-i18n]
 * - re-renders current route after language switch
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
  if (saved && dicts[saved]) currentLang = saved;
  applyTranslations();
}

export function bindLangButtons() {
  document.querySelectorAll("[data-lang]").forEach(btn => {
    btn.addEventListener("click", () => setLang(btn.dataset.lang));
  });
}

export function setLang(lang) {
  currentLang = dicts[lang] ? lang : "de";
  localStorage.setItem("lang", currentLang);

  applyTranslations();

  // WICHTIG:
  // aktuelle Seite neu rendern, damit Inhalte aus DB auch Sprache wechseln
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

export function applyTranslations() {
  document.documentElement.lang = currentLang;

  document.querySelectorAll("[data-i18n]").forEach(el => {
    el.textContent = t(el.getAttribute("data-i18n"));
  });
}

function rerenderCurrentRoute() {
  // Einfachste robuste Lösung:
  // Hash-Route neu auslösen
  window.dispatchEvent(new HashChangeEvent("hashchange"));
}
