import { supabase } from "../api.js";

export async function listHomeTiles(){

const { data } = await supabase
.from("home_tiles")
.select("*")
.eq("active",true)
.order("sort_order",{ascending:true});

return data ?? [];

}

export async function listHomeTilesAdmin(){

const { data } = await supabase
.from("home_tiles")
.select("*")
.order("sort_order",{ascending:true});

return data ?? [];

}

export async function createHomeTile(payload){

await supabase
.from("home_tiles")
.insert([payload]);

}

export async function updateHomeTile(id,patch){

await supabase
.from("home_tiles")
.update(patch)
.eq("id",id);

}

export async function deleteHomeTile(id){

await supabase
.from("home_tiles")
.delete()
.eq("id",id);

}


/* =========================================================
   BRANDING / LOGO
   - Header Logo
   - Admin Logo Preview
   - Premium Hover
========================================================= */

/* Wichtig: Hover darf nicht abgeschnitten werden */
admin-branding,
admin-branding .card,
admin-branding .card__pad,
.admin-grid,
.page {
  overflow: visible;
}

/* ---------------------------------------------------------
   HEADER LOGO
--------------------------------------------------------- */
.site-brand {
  display: flex;
  align-items: center;
  gap: 12px;
}

.site-brand img,
#brandLogo {
  width: 56px;          /* HIER Header-Logo Größe ändern */
  height: 56px;         /* HIER Header-Logo Größe ändern */
  object-fit: contain;
  border-radius: 12px;
  display: block;
  transition: transform 0.25s ease, box-shadow 0.25s ease;
}

.site-brand img:hover,
#brandLogo:hover {
  transform: scale(1.25);   /* HIER Hover-Faktor Header ändern */
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.28);
  position: relative;
  z-index: 50;
}

/* Wenn kein Logo da ist */
#brandLogo.hidden {
  display: none !important;
}

/* ---------------------------------------------------------
   ADMIN BRANDING BLOCK
--------------------------------------------------------- */
admin-branding {
  position: relative;
  overflow: visible;
}

admin-branding label {
  display: block;
  margin-bottom: 6px;
  font-weight: 600;
}

#siteTitleInput,
#siteLogoInput {
  width: 100%;
}

/* ---------------------------------------------------------
   ADMIN LOGO PREVIEW
--------------------------------------------------------- */
#siteLogoPreview {
  width: 96px;          /* HIER normale Größe ändern */
  height: 96px;         /* HIER normale Größe ändern */
  object-fit: contain;
  border-radius: 14px;
  border: 1px solid rgba(255,255,255,0.16);
  background: rgba(255,255,255,0.05);
  padding: 6px;
  display: block;
  transition:
    transform 0.28s ease,
    box-shadow 0.28s ease,
    border-color 0.28s ease,
    background 0.28s ease;
  cursor: zoom-in;
  transform-origin: center center;
}

/* Premium Hover */
#siteLogoPreview:hover {
  transform: scale(2);   /* HIER doppelt so groß einstellen */
  position: relative;
  z-index: 100;
  border-color: rgba(255,255,255,0.35);
  background: rgba(255,255,255,0.08);
  box-shadow: 0 18px 50px rgba(0,0,0,0.42);
}

/* Falls Preview zuerst versteckt wird */
#siteLogoPreview[style*="display:none"] {
  display: none !important;
}

/* ---------------------------------------------------------
   Optional: etwas mehr Platz im Branding-Bereich
--------------------------------------------------------- */
admin-branding .grid {
  overflow: visible;
}

admin-branding .grid > div:last-child {
  min-height: 120px;
  overflow: visible;
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

/* ---------------------------------------------------------
   Mobile Anpassung
--------------------------------------------------------- */
@media (max-width: 768px) {
  #siteLogoPreview {
    width: 74px;
    height: 74px;
  }

  #siteLogoPreview:hover {
    transform: scale(1.6);
  }

  .site-brand img,
  #brandLogo {
    width: 46px;
    height: 46px;
  }
}
