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

export function getAdminGalleryPageHtml() {
  return `
    <section class="admin-gallery-panel">
      <div class="section-head">
        <h2>Neue Galerie anlegen</h2>
        <p>Titel eingeben, Bilder auswählen und direkt als Galerie speichern.</p>
      </div>

      <form id="galleryCreateForm" class="glass-form">
        <div class="form-row">
          <label for="galleryTitle">Galerietitel</label>
          <input id="galleryTitle" type="text" placeholder="z. B. Weltfrauentag 2026" required>
        </div>

        <div class="form-row">
          <label for="galleryStatus">Status</label>
          <select id="galleryStatus">
            <option value="active">Aktiv</option>
            <option value="archived">Archiv</option>
          </select>
        </div>

        <div class="form-row">
          <label for="galleryFiles">Bilder auswählen</label>
          <input id="galleryFiles" type="file" accept="image/*" multiple required>
          <div id="galleryFileCount" class="muted-text">0 Bilder ausgewählt</div>
        </div>

        <div id="galleryFilePreview" class="upload-preview-grid"></div>

        <div class="form-actions">
          <button id="gallerySaveButton" type="submit" class="primary-btn">
            Galerie speichern
          </button>
          <span id="galleryUploadStatus" class="muted-text"></span>
        </div>
      </form>

      <div class="gallery-admin-divider"></div>

      <section class="gallery-section">
        <div class="section-head">
          <h2>Vorhandene Galerien</h2>
          <p>Hier siehst du die aktuellen Galerien mit Bildanzahl.</p>
        </div>

        <div id="galleryList" class="gallery-grid"></div>

        <div id="galleryDetail" class="gallery-detail hidden">
          <div class="gallery-detail-head">
            <h3 id="galleryDetailTitle">Galerie</h3>
            <p id="galleryDetailMeta">0 Bilder</p>
          </div>

          <div id="galleryItems" class="gallery-items-grid"></div>
        </div>
      </section>
    </section>
  `;
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
