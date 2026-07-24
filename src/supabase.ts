import { createClient, SupabaseClient } from '@supabase/supabase-js';

export const getSupabaseUrl = (): string => {
  if (typeof window !== 'undefined') {
    const localUrl = localStorage.getItem('custom_supabase_url');
    if (localUrl) return localUrl;
  }
  return import.meta.env.VITE_SUPABASE_URL || '';
};

export const getSupabaseAnonKey = (): string => {
  if (typeof window !== 'undefined') {
    const localKey = localStorage.getItem('custom_supabase_anon_key');
    if (localKey) return localKey;
  }
  return import.meta.env.VITE_SUPABASE_ANON_KEY || '';
};

export const isSupabaseConfigured = (): boolean => {
  const url = getSupabaseUrl();
  const key = getSupabaseAnonKey();
  return !!(url && key && url.startsWith('http'));
};

let clientInstance: SupabaseClient | null = null;

export const getSupabaseClient = (): SupabaseClient | null => {
  if (!isSupabaseConfigured()) {
    return null;
  }
  const url = getSupabaseUrl();
  const key = getSupabaseAnonKey();
  if (!clientInstance) {
    try {
      clientInstance = createClient(url, key);
    } catch (err) {
      console.warn('[Supabase] Failed to instantiate Supabase client:', err);
      return null;
    }
  }
  return clientInstance;
};

// Export default singleton client or null
export const supabase = isSupabaseConfigured() ? getSupabaseClient() : null;

export const saveSupabaseCredentials = (url: string, key: string): boolean => {
  if (typeof window === 'undefined') return false;
  if (!url || !key || !url.startsWith('http')) return false;
  
  localStorage.setItem('custom_supabase_url', url.trim());
  localStorage.setItem('custom_supabase_anon_key', key.trim());
  clientInstance = createClient(url.trim(), key.trim());
  window.dispatchEvent(new CustomEvent('supabase-config-changed'));
  return true;
};

export const clearSupabaseCredentials = (): void => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('custom_supabase_url');
  localStorage.removeItem('custom_supabase_anon_key');
  clientInstance = null;
  window.dispatchEvent(new CustomEvent('supabase-config-changed'));
};

export const testSupabaseConnection = async (): Promise<{ success: boolean; message: string; tableCount?: number }> => {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, message: 'Supabase client belum dikonfigurasi. Harap masukkan URL & Anon Key.' };
  }

  try {
    const { data, error } = await client.from('users').select('count', { count: 'exact', head: true });
    if (error) {
      if (error.code === 'PGRST301' || error.message.includes('relation "public.users" does not exist')) {
        return { 
          success: true, 
          message: 'Terhubung ke Project Supabase! Namun tabel "public.users" belum dibuat. Jalankan SQL Schema di Supabase SQL Editor.' 
        };
      }
      return { success: false, message: `Koneksi gagal: ${error.message}` };
    }
    return { success: true, message: 'Koneksi ke Supabase Berhasil dan tabel public.users terverifikasi!', tableCount: data as unknown as number };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, message: `Error koneksi: ${msg}` };
  }
};

/**
 * Universal sync helper to write to Supabase alongside Firestore.
 * This runs quietly in the background without blocking the UI.
 * If Supabase is not configured, it will be a silent no-op.
 */
export async function syncToSupabase(table: string, id: string, data: Record<string, unknown>) {
  const client = getSupabaseClient();
  if (!client) {
    return;
  }
  
  try {
    const { error } = await client
      .from(table)
      .upsert({ id, ...data, updated_at: new Date().toISOString() });
      
    if (error) {
      console.warn(`[Supabase Async Sync Error on ${table}]:`, error.message);
    } else {
      console.log(`[Supabase Async Sync Success on ${table}] ID: ${id}`);
    }
  } catch (err) {
    console.warn(`[Supabase Async Sync Exception on ${table}]:`, err);
  }
}

