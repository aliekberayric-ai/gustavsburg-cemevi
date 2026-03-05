/**
 * auth.js
 * - handles login / logout
 * - loads user profile role
 * - exposes auth state
 */

import { supabase } from "./api.js";
import { toast } from "./ui.js";

let state = {
  user: null,
  profile: null, // {role, full_name}
};

export function getAuth(){
  return state;
}

export async function initAuth(){
  const { data } = await supabase.auth.getSession();
  state.user = data.session?.user ?? null;

  if(state.user) await loadProfile();
  paintAuthPill();

  supabase.auth.onAuthStateChange(async (_event, session)=>{
    state.user = session?.user ?? null;
    state.profile = null;
    if(state.user) await loadProfile();
    paintAuthPill();
  });
}

async function loadProfile(){
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", state.user.id)
    .maybeSingle();

  if(error){
    toast("Profil konnte nicht geladen werden (RLS/DB check).", "bad");
    console.error(error);
    return;
  }
  state.profile = data;
}

function paintAuthPill(){
  const pill = document.querySelector("#auth-pill");
  const dot = pill.querySelector(".dot");
  const txt = pill.querySelector(".auth-pill__text");

  if(!state.user){
    dot.style.background = "var(--bad)";
    txt.textContent = "Offline";
    return;
  }
  dot.style.background = "var(--ok)";
  const role = state.profile?.role ?? "user";
  txt.textContent = `${state.user.email} • ${role}`;
}

export async function signIn(email, password){
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if(error){
    toast(error.message, "bad");
    throw error;
  }
  toast("Login OK", "ok");
}

export async function signOut(){
  const { error } = await supabase.auth.signOut();
  if(error){
    toast(error.message, "bad");
    throw error;
  }
  toast("Logout OK", "ok");
}

export function requireRole(roles){
  const role = state.profile?.role;
  return !!role && roles.includes(role);
}
