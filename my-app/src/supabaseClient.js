import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  throw new Error(
    "Missing Supabase settings. Create .env.local with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, then restart npm run dev."
  );
}

export const supabase = createClient(url, key);