export async function getInfoPopupBySlug(slug) {
  console.log("Popup geladen für slug:", slug);

  return {
    title: {
      de: "Test Titel",
      tr: "Test Başlık",
      en: "Test Title"
    },
    content: {
      de: "Das ist ein Test-Popup auf Deutsch.",
      tr: "Bu Türkçe test popup içeriğidir.",
      en: "This is a test popup in English."
    },
    image_url: ""
  };
}
