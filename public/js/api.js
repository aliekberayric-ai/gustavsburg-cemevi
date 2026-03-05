/**
 * api.js
 * - Creates Supabase client (via ESM CDN)
 * - Central place for config
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export const SUPABASE_URL = "PASTE_YOUR_SUPABASE_URL_HERE";
export const SUPABASE_ANON_KEY = "PASTE_YOUR_SUPABASE_ANON_KEY_HERE";

/**
 * IMPORTANT:
 * - Put URL + anon key from your Supabase project settings
 * - Never put service_role key into frontend!
 */
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true },
});
