export function initInfoPopup() {
  const popupHtml = `
    <div id="infoPopup" class="info-popup-overlay">
      <div class="info-popup-box">
        <button id="infoPopupClose" class="info-popup-close">×</button>
        <div id="infoPopupTitle" class="info-popup-title"></div>
        <div id="infoPopupText" class="info-popup-text"></div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML("beforeend", popupHtml);

  const popup = document.getElementById("infoPopup");
  const closeBtn = document.getElementById("infoPopupClose");
  const titleEl = document.getElementById("infoPopupTitle");
  const textEl = document.getElementById("infoPopupText");

  function openPopup(title, text) {
    titleEl.textContent = title || "";
    textEl.textContent = text || "";
    popup.classList.add("show");
  }

  function closePopup() {
    popup.classList.remove("show");
  }

  closeBtn.addEventListener("click", closePopup);

  popup.addEventListener("click", function (e) {
    if (e.target === popup) {
      closePopup();
    }
  });

  document.addEventListener("click", function (e) {
    const btn = e.target.closest("[data-popup='true']");
    if (!btn) return;

    e.preventDefault();

    const title = btn.dataset.title || "Popup";
    const text = btn.dataset.text || "";
    openPopup(title, text);
  });
}
