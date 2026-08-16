import { useEffect, useRef, useState } from 'react'
import type { Project, SaveState } from '../types/project'
import { saveLocalProject } from '../services/localDb'
import { saveProject } from '../services/projectService'

export function useAutosave(project: Project | null, thumbnail?: string) {
  const [state, setState] = useState<SaveState>('saved')
  const previous = useRef('')

  useEffect(() => {
    if (!project) return
    const serialized = JSON.stringify(project)
    if (serialized === previous.current) return
    previous.current = serialized
    setState('local')
    void saveLocalProject(project)

    const timer = window.setTimeout(async () => {
      setState('saving')
      try {
        await saveProject(project, thumbnail)
        setState('saved')
      } catch {
        setState('error')
      }
    }, 1500)
    return () => window.clearTimeout(timer)
  }, [project, thumbnail])

  return state
}
