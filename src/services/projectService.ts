import type { Project } from '../types/project'
import { deleteLocalProject, listLocalProjects, saveLocalProject } from './localDb'
import { getCurrentUserId, supabase } from './supabase'
export { newProject } from './projectFactory'

async function resolveThumbnail(project: Project) {
  if (!supabase || !project.thumbnail_url) return project
  if (project.thumbnail_url.startsWith('data:') || project.thumbnail_url.startsWith('http')) {
    return { ...project, thumbnailPreview: project.thumbnail_url }
  }
  const { data } = await supabase.storage.from('project-assets').createSignedUrl(project.thumbnail_url, 3600)
  return { ...project, thumbnailPreview: data?.signedUrl ?? null }
}

async function refreshAssetUrls(project: Project) {
  if (!supabase) return project
  const client = supabase
  const cloned = structuredClone(project)
  const objects: Array<Record<string, any>> = []
  const walk = (value: unknown) => {
    if (!value || typeof value !== 'object') return
    const record = value as Record<string, any>
    if (record.data?.storagePath && typeof record.src === 'string') objects.push(record)
    Object.values(record).forEach(walk)
  }
  walk(cloned.project_data)
  await Promise.all(objects.map(async (object) => {
    const { data } = await client.storage.from('project-assets').createSignedUrl(object.data.storagePath, 3600)
    if (data?.signedUrl) object.src = data.signedUrl
  }))
  return cloned
}

export async function listProjects(): Promise<Project[]> {
  const local = await listLocalProjects()
  if (!supabase) return local
  const userId = await getCurrentUserId()
  if (!userId) return local

  const { data, error } = await supabase.from('projects').select('*').order('updated_at', { ascending: false })
  if (error || !data) return local
  const remote = await Promise.all((data as Project[]).map(async (item) => resolveThumbnail(await refreshAssetUrls(item))))
  const merged = new Map(local.map((item) => [item.id, item]))
  remote.forEach((item) => merged.set(item.id, item))
  return [...merged.values()].sort((a, b) => b.updated_at.localeCompare(a.updated_at))
}

async function uploadThumbnail(project: Project, dataUrl: string) {
  if (!supabase) return null
  const userId = await getCurrentUserId()
  if (!userId) return null
  const blob = await (await fetch(dataUrl)).blob()
  const path = `${userId}/thumbnails/${project.id}.webp`
  const { error } = await supabase.storage.from('project-assets').upload(path, blob, {
    contentType: 'image/webp', upsert: true, cacheControl: '3600',
  })
  return error ? null : path
}

export async function saveProject(project: Project, thumbnail?: string): Promise<Project> {
  const updated = { ...project, updated_at: new Date().toISOString(), thumbnailPreview: thumbnail ?? project.thumbnailPreview }
  await saveLocalProject(updated)
  if (!supabase) return updated
  const userId = await getCurrentUserId()
  if (!userId) return updated

  const thumbnailPath = thumbnail ? await uploadThumbnail(updated, thumbnail) : updated.thumbnail_url
  const remote = { ...updated, user_id: userId, thumbnail_url: thumbnailPath, thumbnailPreview: undefined }
  const { error } = await supabase.from('projects').upsert(remote, { onConflict: 'id' })
  return error ? updated : { ...updated, thumbnail_url: thumbnailPath }
}

export async function removeProject(project: Project) {
  await deleteLocalProject(project.id)
  if (!supabase) return
  await supabase.from('projects').delete().eq('id', project.id)
  const userId = await getCurrentUserId()
  if (userId) {
    await supabase.storage.from('project-assets').remove([`${userId}/thumbnails/${project.id}.webp`])
  }
}

export async function duplicateProject(project: Project): Promise<Project> {
  const copy = {
    ...structuredClone(project),
    id: crypto.randomUUID(),
    name: `${project.name} — cópia`,
    thumbnail_url: null,
    thumbnailPreview: project.thumbnailPreview,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
  await saveLocalProject(copy)
  return copy
}
