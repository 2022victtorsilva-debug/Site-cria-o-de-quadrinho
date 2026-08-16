export type SearchCandidate = {
  title: string
  description?: string
  categories?: string
}

const ignoredTokens = new Set(['a', 'as', 'com', 'da', 'das', 'de', 'do', 'dos', 'e', 'em', 'imagem', 'imagens', 'o', 'os', 'para', 'png', 'foto', 'fotos'])
const batmanLocationTerms = ['batman province', 'batman turkey', 'batman türkiye', 'batman city', 'batman district', 'batman street', 'batman road', 'batman belediyesi', 'batman airport']

export function normalizeSearchText(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim().replace(/\s+/g, ' ')
}

export function buildCommonsSearch(prompt: string) {
  const cleanPrompt = prompt.trim().replace(/\s+/g, ' ')
  const normalized = normalizeSearchText(cleanPrompt)
  if (normalized === 'batman') return '"Batman" (superhero OR comics OR costume) filetype:bitmap'
  return `${cleanPrompt.replace(/["\\]/g, ' ')} filetype:bitmap`
}

export function searchRelevance(prompt: string, candidate: SearchCandidate) {
  const normalizedPrompt = normalizeSearchText(prompt)
  const title = normalizeSearchText(candidate.title)
  const haystack = normalizeSearchText([candidate.title, candidate.description, candidate.categories].filter(Boolean).join(' '))
  const tokens = normalizedPrompt.split(' ').filter((token) => token.length > 1 && !ignoredTokens.has(token))
  if (!tokens.length || !tokens.every((token) => haystack.includes(token))) return -1
  if (normalizedPrompt === 'batman' && batmanLocationTerms.some((term) => haystack.includes(term))) return -1
  let score = title.includes(normalizedPrompt) ? 20 : haystack.includes(normalizedPrompt) ? 12 : 0
  for (const token of tokens) score += title.includes(token) ? 5 : 2
  return score
}
