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
  profile: null // {role, full_name}
};

export function getAuth() {
  return state;
}

export async function initAuth() {
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    console.error("getSession error:", error);
  }

  state.user = data?.session?.user ?? null;
  state.profile = null;

  if (state.user) {
    await loadProfile();
  }

  paintAuthPill();

  supabase.auth.onAuthStateChange(async (_event, session) => {
    state.user = session?.user ?? null;
    state.profile = null;

    if (state.user) {
      await loadProfile();
    }

    paintAuthPill();
  });
}

async function loadProfile() {
  if (!state.user?.id) {
    state.profile = null;
    return;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", state.user.id)
    .maybeSingle();

  if (error) {
    toast('Profil konnte nicht geladen werden (RLS/DB check).', "bad");
    console.error(error);
    state.profile = null;
    return;
  }

  state.profile = data ?? null;
}

function paintAuthPill() {
  const pill = document.querySelector("#auth-pill");
  if (!pill) return;

  const dot = pill.querySelector(".dot");
  const txt = pill.querySelector(".auth-pill__text");
  if (!dot || !txt) return;

  if (!state.user) {
    dot.style.background = "var(--bad)";
    txt.textContent = "Offline";
    return;
  }

  dot.style.background = "var(--ok)";
  const role = state.profile?.role ?? "user";
  txt.textContent = `${state.user.email} • ${role}`;
}

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    toast(error.message, "bad");
    throw error;
  }

  state.user = data?.user ?? data?.session?.user ?? null;
  state.profile = null;

  if (state.user) {
    await loadProfile();
  }

  paintAuthPill();
  toast("Login OK", "ok");
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();

  if (error) {
    toast(error.message, "bad");
    throw error;
  }

  state.user = null;
  state.profile = null;
  paintAuthPill();
  toast("Logout OK", "ok");
}

export function requireRole(roles) {
  const role = state.profile?.role;
  return !!role && roles.includes(role);
}
