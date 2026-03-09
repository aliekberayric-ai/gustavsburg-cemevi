import { createGalleryWithFiles } from "./galleryService.js";
import { renderGalleryOverview } from "./galleryPage.js";

function previewSelectedFiles(fileList) {
  const preview = document.getElementById("galleryFilePreview");
  const counter = document.getElementById("galleryFileCount");

  if (!preview || !counter) return;

  preview.innerHTML = "";
  const files = Array.from(fileList || []);

  counter.textContent = `${files.length} Bild${files.length === 1 ? "" : "er"} ausgewählt`;

  files.forEach((file) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const div = document.createElement("div");
      div.className = "upload-preview-card";
      div.innerHTML = `
        <img src="${e.target.result}" alt="${file.name}">
        <span title="${file.name}">${file.name}</span>
      `;
      preview.appendChild(div);
    };

    reader.readAsDataURL(file);
  });
}

export function initAdminGalleryPage() {
  const fileInput = document.getElementById("galleryFiles");
  const form = document.getElementById("galleryCreateForm");
  const submitBtn = document.getElementById("gallerySaveButton");
  const statusEl = document.getElementById("galleryUploadStatus");

  fileInput?.addEventListener("change", (e) => {
    previewSelectedFiles(e.target.files);
  });

  form?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const title = document.getElementById("galleryTitle")?.value?.trim();
    const status = document.getElementById("galleryStatus")?.value || "active";
    const files = Array.from(document.getElementById("galleryFiles")?.files || []);

    if (!title) {
      alert("Bitte einen Galerietitel eingeben.");
      return;
    }

    if (!files.length) {
      alert("Bitte mindestens ein Bild auswählen.");
      return;
    }

    try {
      submitBtn.disabled = true;
      statusEl.textContent = "Bilder werden hochgeladen ...";

      await createGalleryWithFiles({ title, status, files });

      statusEl.textContent = "Galerie erfolgreich gespeichert.";
      form.reset();
      previewSelectedFiles([]);
      await renderGalleryOverview();
    } catch (err) {
      console.error(err);
      statusEl.textContent = err.message || "Fehler beim Speichern.";
      alert(err.message || "Fehler beim Speichern.");
    } finally {
      submitBtn.disabled = false;
    }
  });
}
