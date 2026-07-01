import { createClient, SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;

const SUPABASE_URL = 'https://myzzzbelcyxxgctgzxqx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15enp6YmVsY3l4eGdjdGd6eHF4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI4NjgzNzcsImV4cCI6MjA5ODQ0NDM3N30.dq4iIIP10o_PjNgZGzO-Zk32Jk3s3Q8oIcpfOgIrG3U';

export function getSupabase(): SupabaseClient {
  if (client) return client;
  client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return client;
}
