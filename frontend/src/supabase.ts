import { createClient, SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

function assertEnv(value: string, name: string): asserts value is string {
  if (!value) {
    throw new Error(
      `Falta ${name}. Configúrala en Vercel → Settings → Environment Variables o en el archivo .env local.`
    );
  }
}

export function getSupabase(): SupabaseClient {
  if (client) return client;
  assertEnv(SUPABASE_URL, 'VITE_SUPABASE_URL');
  assertEnv(SUPABASE_ANON_KEY, 'VITE_SUPABASE_ANON_KEY');
  client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return client;
}
