
export async function getInfoPopupBySlug(slug) {
  console.log("Popup geladen für slug:", slug);

  return {
    title: {
      de: "Test Popup DE",
      tr: "Test Popup TR",
      en: "Test Popup EN"
    },
    content: {
      de: "Das ist ein Testinhalt auf Deutsch.",
      tr: "Bu Türkçe test içeriğidir.",
      en: "This is a test content in English."
    },
    image_url: ""
  };
}
