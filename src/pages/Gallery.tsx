import { BookOpen, Paintbrush, Plus, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { Project, ProjectType } from '../types/project'
import { ProjectCard } from '../components/ProjectCard'

type Props = {
  projects: Project[]
  onCreate: (type: ProjectType) => void
  onOpen: (project: Project) => void
  onDuplicate: (project: Project) => void
  onDelete: (project: Project) => void
  onExport: (project: Project) => void
}

export function Gallery({ projects, onCreate, onOpen, onDuplicate, onDelete, onExport }: Props) {
  const [tab, setTab] = useState<'all' | ProjectType>('all')
  const [query, setQuery] = useState('')
  const filtered = useMemo(() => projects.filter((p) => (tab === 'all' || p.type === tab) && p.name.toLowerCase().includes(query.toLowerCase())), [projects, tab, query])
  return <main className="gallery-page">
    <section className="gallery-hero">
      <div><span className="eyebrow">Seu espaço criativo</span><h1>O que vamos criar hoje?</h1><p>Desenhe livremente ou conte uma história quadro por quadro.</p></div>
      <div className="create-cards">
        <button onClick={() => onCreate('drawing')}><span className="create-icon purple"><Paintbrush /></span><span><strong>Novo desenho</strong><small>Canvas livre para criar</small></span><Plus /></button>
        <button onClick={() => onCreate('comic')}><span className="create-icon yellow"><BookOpen /></span><span><strong>Novo quadrinho</strong><small>Páginas, quadros e balões</small></span><Plus /></button>
      </div>
    </section>
    <section className="projects-section">
      <div className="section-heading"><div><h2>Meus projetos</h2><p>{projects.length} {projects.length === 1 ? 'projeto salvo' : 'projetos salvos'}</p></div><label className="search-box"><Search /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar projeto" /></label></div>
      <div className="filter-tabs" role="tablist">
        <button className={tab === 'all' ? 'active' : ''} onClick={() => setTab('all')}>Todos</button>
        <button className={tab === 'drawing' ? 'active' : ''} onClick={() => setTab('drawing')}>Desenhos</button>
        <button className={tab === 'comic' ? 'active' : ''} onClick={() => setTab('comic')}>Quadrinhos</button>
      </div>
      {filtered.length ? <div className="project-grid">{filtered.map((project) => <ProjectCard key={project.id} project={project} onOpen={() => onOpen(project)} onDuplicate={() => onDuplicate(project)} onDelete={() => onDelete(project)} onExport={() => onExport(project)} />)}</div> : <div className="empty-state"><Paintbrush /><h3>Nenhum projeto por aqui</h3><p>Crie um desenho ou quadrinho para começar.</p></div>}
    </section>
  </main>
}
