import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://oxdgeznwvgjxdlougzqg.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94ZGdlem53dmdqeGRsb3VnenFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM3OTEwODAsImV4cCI6MjA3OTM2NzA4MH0.h60-BxCN91uVxx1yuAHKblXgSc4I-dPviMQQie0McoQ';

export const supabase = createClient(supabaseUrl, supabaseKey);