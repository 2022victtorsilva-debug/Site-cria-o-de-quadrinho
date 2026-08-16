const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve((request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors })
  return new Response(JSON.stringify({ message: 'A criação de imagens foi desativada. Use a pesquisa de imagens da internet.' }), {
    status: 410,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })
})
