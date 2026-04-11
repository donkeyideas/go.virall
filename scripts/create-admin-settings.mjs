import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// Read .env.local
const envPath = resolve(process.cwd(), '.env.local')
const envContent = readFileSync(envPath, 'utf-8')
const env = Object.fromEntries(
  envContent.split('\n').filter(l => l && !l.startsWith('#')).map(l => {
    const idx = l.indexOf('=')
    return [l.slice(0, idx), l.slice(idx + 1)]
  })
)

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceKey) {
  console.error('Missing SUPABASE_URL or SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

// Check if table exists by trying to query it
const { data, error } = await supabase.from('admin_settings').select('key').limit(1)

if (error && error.code === 'PGRST205') {
  console.log('Table admin_settings does not exist. Creating via SQL...')

  // Use the Supabase SQL endpoint (management API)
  // Since we can't run raw SQL via the data API, we'll use the pg connection
  // Instead, let's try using rpc or the management API

  console.log('\n=== TABLE DOES NOT EXIST ===')
  console.log('Please run this SQL in the Supabase Dashboard SQL Editor:')
  console.log('Go to: https://supabase.com/dashboard → your project → SQL Editor\n')
  console.log(`
CREATE TABLE IF NOT EXISTS admin_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (already implicit, but explicit for clarity)
CREATE POLICY "Service role full access" ON admin_settings
  FOR ALL USING (true) WITH CHECK (true);
`)
} else if (error) {
  console.error('Unexpected error:', error)
} else {
  console.log('Table admin_settings already exists! Found', data?.length ?? 0, 'rows')

  // Test insert
  const testKey = '__test_connectivity'
  const { error: insErr } = await supabase.from('admin_settings').insert({ key: testKey, value: 'test' })
  if (insErr) {
    console.error('Insert test failed:', insErr)
  } else {
    console.log('Insert test passed!')
    await supabase.from('admin_settings').delete().eq('key', testKey)
    console.log('Cleanup done.')
  }
}
