import { createClient } from 'npm:@supabase/supabase-js@2.112.3'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })
const clean = (value = '') => value.replace(/<[^>]*>/g, '').replace(/&[^;]+;/g, ' ').trim()

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (request.method !== 'POST') return json({ message: 'Método não permitido.' }, 405)
  try {
    const authorization = request.headers.get('Authorization')
    if (!authorization) return json({ message: 'Entre novamente para pesquisar imagens.' }, 401)
    const client = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authorization } } })
    const { data: auth } = await client.auth.getUser()
    if (!auth.user) return json({ message: 'Sessão inválida.' }, 401)
    const { prompt } = await request.json()
    if (typeof prompt !== 'string' || prompt.trim().length < 2 || prompt.length > 400) return json({ message: 'Escreva um pedido entre 2 e 400 caracteres.' }, 400)

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { count } = await client.from('image_usage').select('*', { count: 'exact', head: true }).eq('kind', 'search').gte('created_at', since)
    if ((count || 0) >= 60) return json({ message: 'O limite de 60 pesquisas por dia foi atingido. Tente amanhã.' }, 429)

    const params = new URLSearchParams({ action: 'query', generator: 'search', gsrsearch: `${prompt.trim()} filetype:bitmap`, gsrnamespace: '6', gsrlimit: '15', prop: 'imageinfo', iiprop: 'url|mime|extmetadata', iiurlwidth: '900', format: 'json', origin: '*' })
    const response = await fetch(`https://commons.wikimedia.org/w/api.php?${params}`, { headers: { 'User-Agent': 'TracoEHistoria/1.0 personal-comic-editor' } })
    if (!response.ok) return json({ message: 'A pesquisa de imagens está indisponível agora.' }, 502)
    const payload = await response.json()
    const pages = Object.values(payload?.query?.pages || {}) as any[]
    const seen = new Set<string>()
    const images = pages.flatMap((page) => {
      const info = page.imageinfo?.[0]
      const url = info?.thumburl || info?.url
      const mime = info?.mime || ''
      if (!url || !['image/png', 'image/jpeg', 'image/webp'].includes(mime) || seen.has(url)) return []
      seen.add(url)
      return [{ id: String(page.pageid), url, thumbUrl: url, title: String(page.title || '').replace(/^File:/, ''), source: 'Wikimedia Commons', sourceUrl: `https://commons.wikimedia.org/?curid=${page.pageid}`, license: clean(info?.extmetadata?.LicenseShortName?.value || info?.extmetadata?.UsageTerms?.value || '') }]
    }).slice(0, 3)
    if (images.length !== 3) return json({ message: 'Encontrei menos de três imagens válidas. Tente descrever de outro jeito.' }, 404)
    await client.from('image_usage').insert({ user_id: auth.user.id, kind: 'search' })
    return json({ images })
  } catch {
    return json({ message: 'Não foi possível concluir a pesquisa. Tente novamente.' }, 500)
  }
})
