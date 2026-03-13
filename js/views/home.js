import { listHomeTicker } from "../modules/homeTicker.js";
import { listHomeTiles } from "../modules/homeTiles.js";
import { getLang } from "../i18n.js";
import { escapeHtml } from "../ui.js";

function pickLocalized(obj, lang){

return obj?.[lang] ?? obj?.de ?? "";

}

export async function renderHome(root){

const lang = getLang();

const ticker = await listHomeTicker();
const tiles = await listHomeTiles();

root.innerHTML = `

<div class="page">

<section class="home-ticker">

<div class="home-ticker-track">

${
[...ticker,...ticker].map(item=>{

const text = pickLocalized(item.text,lang);

return `

<span class="ticker-item">

<span class="ticker-dot ticker-${item.color}"></span>

<span class="ticker-label">

${
item.color==="green"
?"HEUTE"
:item.color==="yellow"
?"BALD"
:item.color==="red"
?"WICHTIG"
:"INFO"
}

</span>

<span class="ticker-text">

${escapeHtml(text)}

</span>

</span>

`;

}).join("")
}

</div>

</section>


<section class="home-tiles">

${
tiles.map(tile=>{

const title = pickLocalized(tile.title,lang);
const text = pickLocalized(tile.text,lang);
const button = pickLocalized(tile.button_text,lang);

return `

<div class="home-tile">

${
tile.image_url
?`<img src="${tile.image_url}" class="tile-img">`
:""
}

<h3>${escapeHtml(title)}</h3>

<p>${escapeHtml(text)}</p>

${
tile.link_url
?`<a href="${tile.link_url}" class="btn btn--accent">${escapeHtml(button)}</a>`
:""
}

</div>

`;

}).join("")
}

</section>

</div>

`;

}
