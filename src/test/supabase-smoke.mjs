import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false } })
const signed = await supabase.auth.signInAnonymously()
if (signed.error || !signed.data.user) throw new Error(`ANON_AUTH_FAILED: ${signed.error?.message || 'unknown'}`)
console.log('ANON_AUTH_OK')

const id = crypto.randomUUID()
const now = new Date().toISOString()
const row = { id, user_id: signed.data.user.id, name: 'Teste automático', type: 'drawing', thumbnail_url: null, project_data: { version: 1, width: 100, height: 100, background: '#fff', canvas: { objects: [] } }, created_at: now, updated_at: now }
try {
  const inserted = await supabase.from('projects').insert(row)
  if (inserted.error) throw new Error(`PROJECT_INSERT_FAILED: ${inserted.error.message}`)
  const selected = await supabase.from('projects').select('id,name').eq('id', id).single()
  if (selected.error || selected.data?.id !== id) throw new Error(`PROJECT_SELECT_FAILED: ${selected.error?.message || 'missing'}`)
  console.log('PROJECT_RLS_OK')

  const search = await supabase.functions.invoke('search-images', { body: { prompt: 'árvore desenho' } })
  if (search.error || !Array.isArray(search.data?.images) || search.data.images.length !== 3) throw new Error(`SEARCH_FUNCTION_FAILED: ${search.error?.message || search.data?.message || 'invalid'}`)
  console.log('SEARCH_THREE_RESULTS_OK')
} finally {
  await supabase.from('projects').delete().eq('id', id)
  console.log('PROJECT_CLEANUP_OK')
}
