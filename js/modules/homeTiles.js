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
