import { createClient } from '@supabase/supabase-js';

// Read credentials from env or localStorage
export function getSupabaseCredentials(): { url: string; key: string } {
  const envUrl = import.meta.env.VITE_SUPABASE_URL || '';
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

  const localUrl = localStorage.getItem('g4s_supabase_url') || '';
  const localKey = localStorage.getItem('g4s_supabase_key') || '';

  return {
    url: envUrl || localUrl,
    key: envKey || localKey,
  };
}

export function isSupabaseConfigured(): boolean {
  const { url, key } = getSupabaseCredentials();
  return Boolean(url && key && url.startsWith('http'));
}

export function getSupabaseClient() {
  const { url, key } = getSupabaseCredentials();
  if (url && key && url.startsWith('http')) {
    return createClient(url, key);
  }
  return null;
}

export function saveSupabaseCredentials(url: string, key: string) {
  if (url) localStorage.setItem('g4s_supabase_url', url);
  else localStorage.removeItem('g4s_supabase_url');

  if (key) localStorage.setItem('g4s_supabase_key', key);
  else localStorage.removeItem('g4s_supabase_key');
}
