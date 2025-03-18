import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Supabase bağlantı bilgileri
const supabaseUrl = process.env.SUPABASE_URL || 'https://bevakpqfycmxnpzrkecv.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJldmFrcHFmeWNteG5wenJrZWN2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIzMDI5NzQsImV4cCI6MjA1Nzg3ODk3NH0.TQ6yWAkQXJuzDyZiaNX-J_kbtAqrF6aIn2mABe0n3NY';

// Supabase istemcisini oluştur
const supabase = createClient(supabaseUrl, supabaseKey);

export default supabase; 