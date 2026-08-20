import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Project-wide default credentials for seamless multi-device synchronization
export const DEFAULT_SUPABASE_URL = 'https://dcmgjrhvlxikrmktsfgm.supabase.co';
export const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_1St-rtzTWS-Klc4c0ConkQ_J0SKjmgi';

// Read credentials from localStorage, environment variables, or default project credentials
export function getSupabaseCredentials(): { url: string; key: string } {
  const envUrl = import.meta.env.VITE_SUPABASE_URL || '';
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

  const localUrl = localStorage.getItem('g4s_supabase_url') || '';
  const localKey = localStorage.getItem('g4s_supabase_key') || '';

  return {
    url: localUrl || envUrl || DEFAULT_SUPABASE_URL,
    key: localKey || envKey || DEFAULT_SUPABASE_ANON_KEY,
  };
}

export function isSupabaseConfigured(): boolean {
  const { url, key } = getSupabaseCredentials();
  return Boolean(url && key && url.startsWith('http'));
}

let cachedClient: SupabaseClient | null = null;
let lastUrl = '';
let lastKey = '';

export function getSupabaseClient(): SupabaseClient | null {
  const { url, key } = getSupabaseCredentials();
  if (url && key && url.startsWith('http')) {
    if (!cachedClient || lastUrl !== url || lastKey !== key) {
      lastUrl = url;
      lastKey = key;
      cachedClient = createClient(url, key, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      });
    }
    return cachedClient;
  }
  return null;
}

export function saveSupabaseCredentials(url: string, key: string) {
  if (url) localStorage.setItem('g4s_supabase_url', url);
  else localStorage.removeItem('g4s_supabase_url');

  if (key) localStorage.setItem('g4s_supabase_key', key);
  else localStorage.removeItem('g4s_supabase_key');

  // Invalidate cache to force re-instantiation
  cachedClient = null;
}

/**
 * Send password recovery email using Supabase Auth resetPasswordForEmail
 * Generic response is returned to avoid email enumeration
 */
export async function sendPasswordRecoveryEmail(email: string): Promise<{ success: boolean; message: string }> {
  const redirectUrl = `${window.location.origin}${window.location.pathname}`;

  if (isSupabaseConfigured()) {
    const supabase = getSupabaseClient();
    if (supabase) {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: redirectUrl,
      });

      if (error) {
        console.warn('Supabase resetPasswordForEmail warning:', error.message);
        if (
          error.status === 429 ||
          error.message.toLowerCase().includes('rate limit') ||
          error.message.toLowerCase().includes('too many')
        ) {
          throw new Error('Too many password reset requests. Please wait a few minutes and try again.');
        }
      }
    }
  }

  // Always return a generic success message to prevent exposing whether an email exists
  return {
    success: true,
    message: 'If an account exists for this email, a password recovery link has been sent.',
  };
}

/**
 * Update user password using Supabase Auth updateUser
 */
export async function updateUserPassword(newPassword: string): Promise<{ success: boolean; message: string }> {
  if (isSupabaseConfigured()) {
    const supabase = getSupabaseClient();
    if (supabase) {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        throw error;
      }
    }
  }

  return {
    success: true,
    message: 'Password updated successfully.',
  };
}

