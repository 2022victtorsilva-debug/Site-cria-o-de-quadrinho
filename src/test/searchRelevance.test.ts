import { describe, expect, it } from 'vitest'
import { buildCommonsSearch, searchRelevance } from '../../supabase/functions/_shared/searchRelevance'

describe('relevância da pesquisa de imagens', () => {
  it('preserva a frase completa na consulta', () => {
    expect(buildCommonsSearch('castelo medieval à noite')).toContain('castelo medieval à noite')
  })

  it('não aceita ruas da cidade Batman como resultado do personagem', () => {
    expect(searchRelevance('Batman', { title: 'Street in Batman', description: 'Road in Batman Province, Turkey' })).toBe(-1)
  })

  it('aceita um resultado realmente relacionado ao Batman', () => {
    expect(searchRelevance('Batman', { title: 'Batman superhero costume', description: 'Comic convention' })).toBeGreaterThan(0)
  })

  it('exige os termos importantes de uma frase', () => {
    expect(searchRelevance('castelo medieval', { title: 'Modern city street', description: 'Urban road' })).toBe(-1)
    expect(searchRelevance('castelo medieval', { title: 'Castelo medieval', description: 'Fortificação histórica' })).toBeGreaterThan(0)
  })
})
