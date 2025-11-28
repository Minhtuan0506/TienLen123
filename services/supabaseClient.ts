import { createClient } from '@supabase/supabase-js';

const rawSupabaseUrl = process.env.SUPABASE_URL;
const rawSupabaseAnonKey = process.env.SUPABASE_ANON_KEY;

// Check if credentials exist and are not empty strings
export const isSupabaseConfigured = !!(rawSupabaseUrl && rawSupabaseAnonKey && rawSupabaseUrl.length > 0);

// Use real credentials if available, otherwise use placeholders to prevent 'createClient' crash.
// App.tsx handles the logic to not call Supabase if 'isSupabaseConfigured' is false.
const supabaseUrl = isSupabaseConfigured ? rawSupabaseUrl : 'https://placeholder.supabase.co';
const supabaseAnonKey = isSupabaseConfigured ? rawSupabaseAnonKey : 'placeholder';

export const supabase = createClient(supabaseUrl!, supabaseAnonKey!);