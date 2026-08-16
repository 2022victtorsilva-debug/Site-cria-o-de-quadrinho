import type { Project, ProjectType } from '../types/project'

export function newProject(type: ProjectType): Project {
  const now = new Date().toISOString()
  const id = crypto.randomUUID()
  const width = type === 'comic' ? 900 : 1000
  const height = type === 'comic' ? 1273 : 720
  return {
    id,
    name: type === 'comic' ? 'Minha história' : 'Meu desenho',
    type,
    thumbnail_url: null,
    project_data: {
      version: 1,
      width,
      height,
      background: '#ffffff',
      canvas: { version: '7.0.0', objects: [] },
      pages: type === 'comic'
        ? [{ id: crypto.randomUUID(), name: 'Página 1', canvas: { version: '7.0.0', objects: [] }, width, height }]
        : undefined,
    },
    created_at: now,
    updated_at: now,
  }
}
