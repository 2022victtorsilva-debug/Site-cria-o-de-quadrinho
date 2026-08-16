import { BookOpen, LayoutGrid, Plus } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { ComicPagesPanel } from '../components/ComicPagesPanel'
import type { ComicPage, Project } from '../types/project'
import { CanvasStage } from './CanvasStage'
import type { CanvasEditorApi } from './editorApi'

export function ComicEditor({ project, apiRef, onChange }: { project: Project; apiRef: React.Ref<CanvasEditorApi>; onChange: (project: Project, thumbnail: string) => void }) {
  const pages = project.project_data.pages || []
  const activeId = project.project_data.activePageId || pages[0]?.id
  const active = useMemo(() => pages.find((page) => page.id === activeId) || pages[0], [pages, activeId])
  const [introOpen, setIntroOpen] = useState(() => ((pages[0]?.canvas as any)?.objects || []).length === 0)

  const updatePages = useCallback((next: ComicPage[], nextActive = activeId) => onChange({ ...project, project_data: { ...project.project_data, pages: next, activePageId: nextActive } }, project.thumbnailPreview || ''), [activeId, onChange, project])
  const addPage = () => { const page: ComicPage = { id: crypto.randomUUID(), name: `Página ${pages.length + 1}`, canvas: { version: '7.0.0', objects: [] }, width: project.project_data.width, height: project.project_data.height }; updatePages([...pages, page], page.id) }
  const duplicate = () => { if (!active) return; const page = { ...structuredClone(active), id: crypto.randomUUID(), name: `${active.name} cópia` }; updatePages([...pages, page], page.id) }
  const remove = () => { if (pages.length <= 1 || !active) return; const index = pages.findIndex((p) => p.id === active.id); const next = pages.filter((p) => p.id !== active.id); updatePages(next, next[Math.max(0, index - 1)].id) }
  const reorder = useCallback((ids: string[]) => updatePages(ids.map((id) => pages.find((page) => page.id === id)!).filter(Boolean)), [pages, updatePages])

  if (!active) return null
  return <div className="comic-workspace">
    <ComicPagesPanel pages={pages} activeId={active.id} onSelect={(id) => updatePages(pages, id)} onAdd={addPage} onDuplicate={duplicate} onDelete={remove} onRename={(id, name) => updatePages(pages.map((page) => page.id === id ? { ...page, name } : page))} onReorder={reorder} />
    <div className="comic-stage-wrap">
      {introOpen && <div className="comic-start-card">
        <span className="start-icon"><BookOpen /></span>
        <h2>Crie seu quadrinho</h2>
        <p>Comece com uma página livre ou escolha uma divisão pronta.</p>
        <div className="comic-start-actions"><button onClick={() => setIntroOpen(false)}><Plus /><strong>Criar em branco</strong><small>Começar do zero</small></button><div><span><LayoutGrid />Escolher layout</span><div className="start-layouts">{[1, 2, 3, 4, 6].map((count) => <button key={count} onClick={() => { (apiRef as any).current?.addPanelLayout(count); setIntroOpen(false) }}><i className={`layout-mini layout-${count}`}>{Array.from({ length: count }, (_, index) => <b key={index} />)}</i><small>{count}</small></button>)}</div></div></div>
      </div>}
      <CanvasStage canvasKey={active.id} json={active.canvas} width={active.width} height={active.height} background={project.project_data.background} comic apiRef={apiRef} onChange={(canvas, thumbnail, canvasBackground) => {
        const next = pages.map((page) => page.id === active.id ? { ...page, canvas } : page)
        onChange({ ...project, project_data: { ...project.project_data, pages: next, activePageId: active.id, background: canvasBackground } }, pages[0].id === active.id ? thumbnail : project.thumbnailPreview || '')
      }} />
    </div>
  </div>
}
