import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Create a mock client that throws helpful errors when credentials are missing
const createMockClient = (): SupabaseClient => {
  const handler = {
    get: () => {
      return new Proxy(() => {}, {
        get: () => handler.get(),
        apply: () => {
          throw new Error('Supabase credentials not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables.');
        },
      });
    },
  };
  return new Proxy({} as SupabaseClient, handler);
};

export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : createMockClient();

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);
