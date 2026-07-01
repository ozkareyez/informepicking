import { createClient, SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (client) return client;

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Supabase no configurado. Crea un archivo .env en frontend/ con:\n' +
      'VITE_SUPABASE_URL=https://tu-proyecto.supabase.co\n' +
      'VITE_SUPABASE_ANON_KEY=tu-anon-key'
    );
  }

  client = createClient(supabaseUrl, supabaseAnonKey);
  return client;
}
