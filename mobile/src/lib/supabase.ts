import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://qrtbfhhhilcoeovdubqb.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFydGJmaGhoaWxjb2VvdmR1YnFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxMDM4MDUsImV4cCI6MjA4OTY3OTgwNX0.vJmTxT36lHf2IowpDtS0XS_kbyv1JH32aPeHJePpGb8';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
