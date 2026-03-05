/**
 * api.js
 * - Creates Supabase client (via ESM CDN)
 * - Central place for config
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export const SUPABASE_URL = "https://qhxswxevocfvmtwutghk.supabase.co";
export const SUPABASE_ANON_KEY = "sb_publishable_CQhc7cbuR0ypSfEJ7MHGmw_4v7rCy5f";

/**
 * IMPORTANT:
 * - Put URL + anon key from your Supabase project settings
 * - Never put service_role key into frontend!
 */
export const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
