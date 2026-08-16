import { describe, expect, it } from 'vitest'
import { newProject } from '../services/projectFactory'
import { prepareImage } from '../services/imageService'

describe('projetos', () => {
  it('cria um desenho com canvas vazio', () => {
    const project = newProject('drawing')
    expect(project.type).toBe('drawing')
    expect(project.project_data.canvas).toMatchObject({ objects: [] })
    expect(project.project_data.pages).toBeUndefined()
  })

  it('cria um quadrinho com a primeira página', () => {
    const project = newProject('comic')
    expect(project.project_data.pages).toHaveLength(1)
    expect(project.project_data.pages?.[0].name).toBe('Página 1')
    expect(project.project_data.width).toBeLessThan(project.project_data.height)
  })
})

describe('upload seguro', () => {
  it('recusa arquivos que não são imagens permitidas', async () => {
    const file = new File(['conteúdo'], 'arquivo.svg', { type: 'image/svg+xml' })
    await expect(prepareImage(file)).rejects.toThrow('PNG, JPG ou WebP')
  })
})
