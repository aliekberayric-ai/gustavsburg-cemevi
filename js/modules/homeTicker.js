import { supabase } from "../api.js";

export async function listHomeTicker() {

const { data } = await supabase
.from("home_ticker")
.select("*")
.eq("active", true)
.order("sort_order", { ascending: true });

return data ?? [];

}

export async function listHomeTickerAdmin(){

const { data } = await supabase
.from("home_ticker")
.select("*")
.order("sort_order",{ascending:true});

return data ?? [];

}

export async function createHomeTicker(payload){

await supabase
.from("home_ticker")
.insert([payload]);

}

export async function updateHomeTicker(id,patch){

await supabase
.from("home_ticker")
.update(patch)
.eq("id",id);

}

export async function deleteHomeTicker(id){

await supabase
.from("home_ticker")
.delete()
.eq("id",id);

}
