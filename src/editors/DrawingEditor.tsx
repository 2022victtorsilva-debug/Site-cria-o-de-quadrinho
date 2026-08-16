import type { Ref } from 'react'
import type { Project } from '../types/project'
import type { CanvasEditorApi } from './editorApi'
import { CanvasStage } from './CanvasStage'

export function DrawingEditor({ project, apiRef, onChange }: { project: Project; apiRef: Ref<CanvasEditorApi>; onChange: (project: Project, thumbnail: string) => void }) {
  const data = project.project_data
  return <CanvasStage canvasKey={project.id} json={data.canvas || { objects: [] }} width={data.width} height={data.height} background={data.background} apiRef={apiRef} onChange={(canvas, thumbnail) => onChange({ ...project, project_data: { ...data, canvas } }, thumbnail)} />
}
