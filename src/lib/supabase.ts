import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

export type { Database } from './database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const createBrowserSupabaseClient = () =>
  createClient<Database>(supabaseUrl, supabaseAnonKey);

// Shared singleton for existing imports across the app.
export const supabase = createBrowserSupabaseClient();

declare global {
  interface Window {
    supabase: SupabaseClient<Database>;
  }
}

if (typeof window !== 'undefined') {
  window.supabase = supabase;
}
