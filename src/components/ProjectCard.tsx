import { Copy, Download, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import type { Project } from '../types/project'

type Props = { project: Project; onOpen: () => void; onDuplicate: () => void; onDelete: () => void; onExport: () => void }

export function ProjectCard({ project, onOpen, onDuplicate, onDelete, onExport }: Props) {
  const date = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(project.updated_at))
  return <article className="project-card">
    <button className="project-preview" onClick={onOpen} aria-label={`Abrir ${project.name}`}>
      {project.thumbnailPreview ? <img src={project.thumbnailPreview} alt="" /> : <div className={`placeholder-art ${project.type}`}><Pencil /><span>{project.type === 'comic' ? 'HQ' : 'Desenho'}</span></div>}
      <span className="project-type">{project.type === 'comic' ? 'Quadrinho' : 'Desenho'}</span>
    </button>
    <div className="project-card-body">
      <div><h3>{project.name}</h3><p>Editado em {date}</p></div>
      <details className="project-menu"><summary aria-label="Mais opções"><MoreHorizontal /></summary><div>
        <button onClick={onOpen}><Pencil />Continuar editando</button>
        <button onClick={onDuplicate}><Copy />Duplicar</button>
        <button onClick={onExport}><Download />Exportar</button>
        <button className="danger-text" onClick={onDelete}><Trash2 />Excluir</button>
      </div></details>
    </div>
  </article>
}
