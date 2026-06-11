import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = (): boolean => {
  return !!(supabaseUrl && supabaseAnonKey && supabaseUrl.startsWith('http'));
};

// Initialize client if configured, otherwise export null to prevent crash
export const supabase = isSupabaseConfigured()
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

/**
 * Universal sync helper to write to Supabase alongside Firestore.
 * This runs quietly in the background without blocking the UI.
 * If Supabase is not configured, it will be a silent no-op.
 */
export async function syncToSupabase(table: string, id: string, data: Record<string, unknown>) {
  if (!isSupabaseConfigured() || !supabase) {
    return;
  }
  
  try {
    // Basic insert or upsert
    const { error } = await supabase
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
