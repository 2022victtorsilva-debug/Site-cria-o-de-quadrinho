import { openDB } from 'idb'
import type { Project } from '../types/project'

const dbPromise = openDB('traco-historia', 1, {
  upgrade(db) {
    if (!db.objectStoreNames.contains('projects')) {
      const store = db.createObjectStore('projects', { keyPath: 'id' })
      store.createIndex('updated_at', 'updated_at')
    }
  },
})

export async function saveLocalProject(project: Project) {
  return (await dbPromise).put('projects', project)
}

export async function getLocalProject(id: string) {
  return (await dbPromise).get('projects', id) as Promise<Project | undefined>
}

export async function listLocalProjects() {
  const items = (await dbPromise).getAll('projects') as Promise<Project[]>
  return (await items).sort((a, b) => b.updated_at.localeCompare(a.updated_at))
}

export async function deleteLocalProject(id: string) {
  return (await dbPromise).delete('projects', id)
}
