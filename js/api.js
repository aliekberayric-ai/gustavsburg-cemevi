/**
 * api.js
 * - Creates Supabase client (via ESM CDN)
 * - Central place for config
 */

import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

export const SUPABASE_URL = "https://qhxswxevocfvmtwutghk.supabase.co";
export const SUPABASE_ANON_KEY = "sb_publishable_CQhc7cbuR0ypSfEJ7MHGmw_4v7rCy5f";

/**
 * IMPORTANT:
 * - Put URL + anon key from your Supabase project settings
 * - Never put service_role key into frontend!
 */
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
