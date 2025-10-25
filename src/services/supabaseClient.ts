import { createClient } from '@supabase/supabase-js'

// Get environment variables with fallback to hardcoded values for Netlify
const supabaseUrl = import.meta.env.EXPO_PUBLIC_SUPABASE_URL || 
                   import.meta.env.VITE_SUPABASE_URL || 
                   'https://zvoavkzruhnzzeqyihrc.supabase.co'

const supabaseAnonKey = import.meta.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 
                        import.meta.env.VITE_SUPABASE_ANON_KEY || 
                        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp2b2F2a3pydWhuenplcXlpaHJjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkwMTE0OTcsImV4cCI6MjA2NDU4NzQ5N30.YOi2Cu6C7IwlNVpq3WXuhk_euHNg2n8V4BWSAwRleyM'

// Debug environment variables
console.log('🔍 Supabase URL:', supabaseUrl);
console.log('🔍 Supabase Key:', supabaseAnonKey ? `Present (${supabaseAnonKey.substring(0, 20)}...)` : 'Missing');
console.log('🔍 Available env vars:', Object.keys(import.meta.env));

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

