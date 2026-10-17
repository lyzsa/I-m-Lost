import { createClient } from "@supabase/supabase-js";
// No network calls until explicitly used by the backend integration.
export function getSupabase() {
 const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
 const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
 if (!url || !key) throw new Error("Configure Supabase in .env.local first");
 return createClient(url, key);
}
