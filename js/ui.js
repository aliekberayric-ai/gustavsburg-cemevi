/**
 * ui.js
 * Small UI helpers: toast, confirm, safe HTML
 */

export function escapeHtml(s){
  return String(s)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

export function toast(msg, kind="info"){
  const root = document.querySelector("#overlay-root");
  const el = document.createElement("div");
  el.className = "card card__pad";
  el.style.position = "fixed";
  el.style.right = "18px";
  el.style.bottom = "18px";
  el.style.maxWidth = "360px";
  el.style.borderColor =
    kind==="ok" ? "rgba(93,255,154,0.35)" :
    kind==="bad" ? "rgba(255,106,106,0.35)" :
    "rgba(255,255,255,0.12)";

  el.innerHTML = `<div style="font-weight:650;margin-bottom:6px">${escapeHtml(kind.toUpperCase())}</div>
                  <div style="color:var(--muted)">${escapeHtml(msg)}</div>`;
  root.appendChild(el);
  setTimeout(()=> el.remove(), 2600);
}

export async function confirmBox(title, text){
  // Simple confirm wrapper
  return confirm(`${title}\n\n${text}`);
}

export function fmtDateTime(iso){
  try{
    const d = new Date(iso);
    return d.toLocaleString();
  }catch{ return iso; }
}
