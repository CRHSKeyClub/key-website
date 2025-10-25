// Test script to check environment variables
console.log('Testing environment variables...');

// Check if we're in a browser environment
if (typeof window !== 'undefined') {
  console.log('Running in browser environment');
  console.log('Available env vars:', Object.keys(import.meta?.env || {}));
  console.log('EXPO_PUBLIC_SUPABASE_URL:', import.meta?.env?.EXPO_PUBLIC_SUPABASE_URL);
  console.log('VITE_SUPABASE_URL:', import.meta?.env?.VITE_SUPABASE_URL);
} else {
  console.log('Running in Node.js environment');
  console.log('EXPO_PUBLIC_SUPABASE_URL:', process.env.EXPO_PUBLIC_SUPABASE_URL);
  console.log('VITE_SUPABASE_URL:', process.env.VITE_SUPABASE_URL);
}
