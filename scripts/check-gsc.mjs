import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const envPath = resolve(process.cwd(), '.env.local')
const envContent = readFileSync(envPath, 'utf-8')
const env = Object.fromEntries(
  envContent.split('\n').filter(l => l && l.indexOf('#') !== 0).map(l => {
    const idx = l.indexOf('=')
    return [l.slice(0, idx), l.slice(idx + 1)]
  })
)

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
})

const { data } = await supabase
  .from('admin_settings')
  .select('key, value')
  .like('key', 'seo_gsc%')

if (data && data.length > 0) {
  console.log('=== GSC settings found in DB ===')
  for (const row of data) {
    const v = row.value || ''
    if (row.key.includes('Secret') || row.key.includes('Token') || row.key.includes('Refresh')) {
      console.log(row.key + ' = ' + (v ? v.substring(0, 10) + '...' + v.slice(-4) : '(empty)'))
    } else {
      console.log(row.key + ' = ' + v)
    }
  }
} else {
  console.log('No GSC settings found in DB.')
}
