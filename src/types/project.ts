export type ProjectType = 'drawing' | 'comic'

export type ComicPage = {
  id: string
  name: string
  canvas: Record<string, unknown>
  width: number
  height: number
}

export type ProjectData = {
  version: 1
  canvas?: Record<string, unknown>
  pages?: ComicPage[]
  activePageId?: string
  width: number
  height: number
  background: string
}

export type Project = {
  id: string
  name: string
  type: ProjectType
  thumbnail_url: string | null
  thumbnailPreview?: string | null
  project_data: ProjectData
  created_at: string
  updated_at: string
  user_id?: string
}

export type SaveState = 'local' | 'saving' | 'saved' | 'error'

export type LayerItem = {
  id: string
  name: string
  type: string
  visible: boolean
  locked: boolean
}

export type AIImageResult = {
  id: string
  url: string
  thumbUrl?: string
  storagePath?: string
  title?: string
  source?: string
  sourceUrl?: string
  license?: string
}
