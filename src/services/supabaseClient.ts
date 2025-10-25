import { createClient } from '@supabase/supabase-js'

// Get environment variables (prioritize EXPO_PUBLIC for Netlify compatibility)
const supabaseUrl = import.meta.env.EXPO_PUBLIC_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY

// Debug environment variables
console.log('🔍 Supabase URL:', supabaseUrl);
console.log('🔍 Supabase Key:', supabaseAnonKey ? `Present (${supabaseAnonKey.substring(0, 20)}...)` : 'Missing');

// Validate environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('URL:', supabaseUrl);
  console.error('Key:', supabaseAnonKey ? 'Present' : 'Missing');
  throw new Error('Missing Supabase environment variables. Please check your .env file.');
}

// Create Supabase client with explicit headers
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
  global: {
    headers: {
      'apikey': supabaseAnonKey,
      'Authorization': `Bearer ${supabaseAnonKey}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
  },
  db: {
    schema: 'public'
  }
});

// Test connection immediately
console.log('🧪 Testing Supabase connection...');
supabase
  .from('students')
  .select('count')
  .limit(1)
  .then(({ data, error }) => {
    if (error) {
      console.error('❌ Supabase connection test failed:', error);
    } else {
      console.log('✅ Supabase connection test successful');
    }
  })
  .catch(err => {
    console.error('❌ Supabase connection exception:', err);
  });

