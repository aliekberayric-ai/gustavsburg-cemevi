/**
 * i18n.js
 * Minimal multilingual system:
 * - Load JSON dictionaries (de/tr/en)
 * - Replace elements with [data-i18n="key.path"]
 */

let dicts = {};
let currentLang = "de";

export async function initI18n() {
  const [de, tr, en] = await Promise.all([
    fetch("i18n/de.json").then(r => r.json()),
    fetch("i18n/tr.json").then(r => r.json()),
    fetch("i18n/en.json").then(r => r.json()),
  ]);
  dicts = { de, tr, en };
}

export function setLang(lang) {
  currentLang = dicts[lang] ? lang : "de";
  localStorage.setItem("lang", currentLang);
  applyTranslations();
}

export function setLangFromStorage() {
  const saved = localStorage.getItem("lang");
  if (saved && dicts[saved]) currentLang = saved;
  applyTranslations();
}

export function t(key) {
  // key like "nav.home"
  const parts = key.split(".");
  let obj = dicts[currentLang];
  for (const p of parts) obj = obj?.[p];
  return obj ?? key;
}

export function applyTranslations() {
  document.documentElement.lang = currentLang;

  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    el.textContent = t(key);
  });
}

export function bindLangButtons() {
  document.querySelectorAll("[data-lang]").forEach((btn) => {
    btn.addEventListener("click", () => setLang(btn.dataset.lang));
  });
}
