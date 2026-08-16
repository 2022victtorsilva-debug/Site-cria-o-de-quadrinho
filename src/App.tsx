import { BookOpen, ChevronDown, Cloud, CloudOff, Download, FolderOpen, Home, Image, Menu, Paintbrush, Settings, X } from 'lucide-react'
import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { ConfirmDialog } from './components/ConfirmDialog'
import { SaveStatus } from './components/SaveStatus'
import type { CanvasEditorApi } from './editors/editorApi'
import { useAutosave } from './hooks/useAutosave'
import { Gallery } from './pages/Gallery'
import { uploadImage } from './services/imageService'
import { duplicateProject, listProjects, newProject, removeProject, saveProject } from './services/projectService'
import { ensureAnonymousSession, supabaseConfigured } from './services/supabase'
import type { Project, ProjectType } from './types/project'
import { downloadDataUrl, exportStoredProject } from './utils/exportManager'

const DrawingEditor = lazy(() => import('./editors/DrawingEditor').then((module) => ({ default: module.DrawingEditor })))
const ComicEditor = lazy(() => import('./editors/ComicEditor').then((module) => ({ default: module.ComicEditor })))

export default function App() {
  const [projects, setProjects] = useState<Project[]>([])
  const [current, setCurrent] = useState<Project | null>(null)
  const [thumbnail, setThumbnail] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null)
  const [online, setOnline] = useState(false)
  const [loading, setLoading] = useState(true)
  const [mobileNav, setMobileNav] = useState(false)
  const [toast, setToast] = useState('')
  const apiRef = useRef<CanvasEditorApi>(null)
  const saveState = useAutosave(current, thumbnail)

  const refresh = async () => { setProjects(await listProjects()) }
  useEffect(() => { void (async () => { const session = await ensureAnonymousSession(); setOnline(Boolean(session)); await refresh(); setLoading(false) })() }, [])
  useEffect(() => { if (current) setProjects((items) => { const next = items.filter((item) => item.id !== current.id); return [current, ...next] }) }, [current])

  const create = (type: ProjectType) => { const project = newProject(type); setThumbnail(''); setCurrent(project); setMobileNav(false) }
  const open = (project: Project) => { setThumbnail(project.thumbnailPreview || ''); setCurrent(project); setMobileNav(false) }
  const showToast = (message: string) => { setToast(message); window.setTimeout(() => setToast(''), 2800) }

  const duplicate = async (project: Project) => { const copy = await duplicateProject(project); setProjects((items) => [copy, ...items]); showToast('Projeto duplicado.') }
  const confirmDelete = async () => { if (!deleteTarget) return; await removeProject(deleteTarget); setProjects((items) => items.filter((item) => item.id !== deleteTarget.id)); if (current?.id === deleteTarget.id) setCurrent(null); setDeleteTarget(null); showToast('Projeto excluído.') }
  const updateCurrent = (project: Project, nextThumbnail: string) => { setCurrent(project); if (nextThumbnail) setThumbnail(nextThumbnail) }

  const onUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; event.target.value = ''
    if (!file) return
    try { const image = await uploadImage(file); await apiRef.current?.addImage(image.url, image.storagePath); showToast('Imagem adicionada.') }
    catch (cause) { showToast(cause instanceof Error ? cause.message : 'Não foi possível adicionar a imagem.') }
  }

  const exportCurrent = async (format: 'png' | 'jpeg' | 'pdf' = 'png') => {
    if (!current) return
    if (current.type === 'drawing' && apiRef.current) {
      const url = apiRef.current.exportDataUrl(format === 'jpeg' ? 'jpeg' : 'png')
      downloadDataUrl(url, `${current.name}.${format === 'jpeg' ? 'jpg' : 'png'}`)
    } else await exportStoredProject(current)
  }

  const goGallery = async () => { if (current) { const saved = await saveProject(current, thumbnail); setProjects((items) => [saved, ...items.filter((item) => item.id !== saved.id)]) } setCurrent(null); setMobileNav(false) }

  return <div className="app-shell">
    <header className="app-header">
      <button className="mobile-menu icon-button" onClick={() => setMobileNav(true)} aria-label="Abrir menu"><Menu /></button>
      <button className="brand" onClick={goGallery} aria-label="Ir para Meus projetos"><span className="brand-mark"><Paintbrush /></span><span><strong>Traço & História</strong><small>Estúdio criativo</small></span></button>
      <nav className={mobileNav ? 'open' : ''} aria-label="Navegação principal">
        <button className="mobile-nav-close icon-button" onClick={() => setMobileNav(false)}><X /></button>
        <button className={!current ? 'active' : ''} onClick={goGallery}><FolderOpen />Meus projetos</button>
        <button className={current?.type === 'drawing' ? 'active' : ''} onClick={() => create('drawing')}><Paintbrush />Desenho</button>
        <button className={current?.type === 'comic' ? 'active' : ''} onClick={() => create('comic')}><BookOpen />Quadrinhos</button>
      </nav>
      <div className="header-status" title={online ? 'Conectado ao Supabase' : 'Salvando somente neste aparelho'}>{online ? <Cloud /> : <CloudOff />}<span>{online ? 'Nuvem ativa' : 'Modo local'}</span></div>
    </header>

    {loading ? <main className="loading-screen"><span className="brand-mark"><Paintbrush /></span><p>Preparando seu estúdio...</p></main> : current ? <main className="editor-page">
      <div className="project-topbar">
        <button className="back-button" onClick={goGallery}><Home />Projetos</button>
        <input className="project-name-input" value={current.name} maxLength={80} onChange={(e) => setCurrent({ ...current, name: e.target.value })} aria-label="Nome do projeto" />
        <SaveStatus state={saveState} />
        <details className="export-menu"><summary className="button primary"><Download />Exportar<ChevronDown /></summary><div>
          {current.type === 'drawing' ? <><button onClick={() => exportCurrent('png')}><Image />PNG</button><button onClick={() => exportCurrent('jpeg')}><Image />JPG</button></> : <><button onClick={() => exportCurrent('pdf')}><BookOpen />Quadrinho em PDF</button><button onClick={() => exportStoredProject(current, current.project_data.activePageId)}><Image />Página atual em PNG</button></>}
        </div></details>
      </div>
      <input id="editor-upload" className="visually-hidden" type="file" accept="image/png,image/jpeg,image/webp" onChange={onUpload} />
      <Suspense fallback={<div className="editor-loading">Abrindo o editor...</div>}>{current.type === 'drawing' ? <DrawingEditor project={current} apiRef={apiRef} onChange={updateCurrent} /> : <ComicEditor project={current} apiRef={apiRef} onChange={updateCurrent} />}</Suspense>
    </main> : <Gallery projects={projects} onCreate={create} onOpen={open} onDuplicate={duplicate} onDelete={setDeleteTarget} onExport={(project) => void exportStoredProject(project)} />}

    {!supabaseConfigured && <div className="config-banner"><Settings />Supabase não configurado. O app está em modo local.</div>}
    {deleteTarget && <ConfirmDialog title="Excluir este projeto?" message={`“${deleteTarget.name}” será removido da galeria e da nuvem. Essa ação não pode ser desfeita.`} onConfirm={confirmDelete} onClose={() => setDeleteTarget(null)} />}
    {toast && <div className="toast" role="status">{toast}</div>}
  </div>
}
