import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bevakpqfycmxnpzrkecv.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJldmFrcHFmeWNteG5wenJrZWN2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIzMDI5NzQsImV4cCI6MjA1Nzg3ODk3NH0.TQ6yWAkQXJuzDyZiaNX-J_kbtAqrF6aIn2mABe0n3NY';

// Gizlilik için process.env kullanımını tercih edin
// const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
// const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

console.log('Supabase URL:', supabaseUrl);
console.log('Supabase Anon Key (ilk 10 karakter):', supabaseAnonKey.substring(0, 10) + '...');

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default supabase; 