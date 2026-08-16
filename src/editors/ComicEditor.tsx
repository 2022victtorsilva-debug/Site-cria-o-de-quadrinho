import { BookOpen, LayoutGrid, MessageCircle, MessageSquareText, Plus, Sparkles, Star, Brain, Zap } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { ComicPagesPanel } from '../components/ComicPagesPanel'
import type { ComicPage, Project } from '../types/project'
import { CanvasStage } from './CanvasStage'
import type { CanvasEditorApi } from './editorApi'

export function ComicEditor({ project, apiRef, onChange }: { project: Project; apiRef: React.Ref<CanvasEditorApi>; onChange: (project: Project, thumbnail: string) => void }) {
  const pages = project.project_data.pages || []
  const activeId = project.project_data.activePageId || pages[0]?.id
  const active = useMemo(() => pages.find((page) => page.id === activeId) || pages[0], [pages, activeId])
  const [toolsOpen, setToolsOpen] = useState(true)

  const updatePages = useCallback((next: ComicPage[], nextActive = activeId) => onChange({ ...project, project_data: { ...project.project_data, pages: next, activePageId: nextActive } }, project.thumbnailPreview || ''), [activeId, onChange, project])
  const addPage = () => { const page: ComicPage = { id: crypto.randomUUID(), name: `Página ${pages.length + 1}`, canvas: { version: '7.0.0', objects: [] }, width: project.project_data.width, height: project.project_data.height }; updatePages([...pages, page], page.id) }
  const duplicate = () => { if (!active) return; const page = { ...structuredClone(active), id: crypto.randomUUID(), name: `${active.name} cópia` }; updatePages([...pages, page], page.id) }
  const remove = () => { if (pages.length <= 1 || !active) return; const index = pages.findIndex((p) => p.id === active.id); const next = pages.filter((p) => p.id !== active.id); updatePages(next, next[Math.max(0, index - 1)].id) }
  const reorder = useCallback((ids: string[]) => updatePages(ids.map((id) => pages.find((page) => page.id === id)!).filter(Boolean)), [pages, updatePages])

  if (!active) return null
  return <div className="comic-workspace">
    <ComicPagesPanel pages={pages} activeId={active.id} onSelect={(id) => updatePages(pages, id)} onAdd={addPage} onDuplicate={duplicate} onDelete={remove} onRename={(id, name) => updatePages(pages.map((page) => page.id === id ? { ...page, name } : page))} onReorder={reorder} />
    <div className="comic-stage-wrap">
      <button className="comic-tools-toggle" onClick={() => setToolsOpen((value) => !value)}><BookOpen />Ferramentas de HQ</button>
      {toolsOpen && <div className="comic-tools">
        <div className="comic-tool-section"><span><LayoutGrid />Quadros</span>{[1, 2, 3, 4, 6].map((count) => <button key={count} onClick={() => (apiRef as any).current?.addPanelLayout(count)}>{count}</button>)}<button onClick={() => (apiRef as any).current?.addShape('rectangle')}><Plus />Livre</button></div>
        <div className="comic-tool-section"><span><MessageCircle />Balões</span><button onClick={() => (apiRef as any).current?.addBubble('speech')}><MessageCircle />Fala</button><button onClick={() => (apiRef as any).current?.addBubble('thought')}><Brain />Pensamento</button><button onClick={() => (apiRef as any).current?.addBubble('shout')}><Zap />Grito</button><button onClick={() => (apiRef as any).current?.addBubble('narration')}><MessageSquareText />Narração</button></div>
        <div className="comic-tool-section effects"><span><Sparkles />Efeitos</span>{['BOOM!', 'POW!', 'CRASH!', 'HAHA!', '?!'].map((text) => <button key={text} onClick={() => (apiRef as any).current?.addEffect(text)}>{text}</button>)}<button onClick={() => { const text = window.prompt('Digite o efeito:'); if (text?.trim()) (apiRef as any).current?.addEffect(text.trim()) }}><Star />Outro</button></div>
      </div>}
      <CanvasStage canvasKey={active.id} json={active.canvas} width={active.width} height={active.height} background={project.project_data.background} comic apiRef={apiRef} onChange={(canvas, thumbnail) => {
        const next = pages.map((page) => page.id === active.id ? { ...page, canvas } : page)
        onChange({ ...project, project_data: { ...project.project_data, pages: next, activePageId: active.id } }, pages[0].id === active.id ? thumbnail : project.thumbnailPreview || '')
      }} />
    </div>
  </div>
}
