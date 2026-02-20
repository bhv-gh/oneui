import { createClient } from '@supabase/supabase-js';
import { getUserHash } from '../utils/userHash';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Supabase credentials not set. Add REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY to .env'
  );
}

let cachedClient = null;
let cachedHash = null;

// Returns a Supabase client with the current user's hash set as a request header.
// RLS policies on the DB enforce that only rows matching this hash are accessible.
export function getSupabase() {
  if (!supabaseUrl || !supabaseAnonKey) return null;

  const currentHash = getUserHash();
  if (cachedClient && cachedHash === currentHash) return cachedClient;

  cachedClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        'x-user-hash': currentHash,
      },
    },
  });
  cachedHash = currentHash;
  return cachedClient;
}
