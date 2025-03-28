import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://npuqlzzctgtkezxvbtdv.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5wdXFsenpjdGd0a2V6eHZidGR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAxMDE1MzYsImV4cCI6MjA1NTY3NzUzNn0.yFIY2puybr7X330vsR33GxxPC013SPAV8UzGUF_6Ms0';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);