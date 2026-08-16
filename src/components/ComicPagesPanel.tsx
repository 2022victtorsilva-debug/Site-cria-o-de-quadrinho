import { Copy, GripVertical, Plus, Trash2 } from 'lucide-react'
import { useEffect, useRef } from 'react'
import Sortable from 'sortablejs'
import type { ComicPage } from '../types/project'

type Props = { pages: ComicPage[]; activeId: string; onSelect: (id: string) => void; onAdd: () => void; onDuplicate: () => void; onDelete: () => void; onRename: (id: string, name: string) => void; onReorder: (ids: string[]) => void }

export function ComicPagesPanel({ pages, activeId, onSelect, onAdd, onDuplicate, onDelete, onRename, onReorder }: Props) {
  const listRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!listRef.current) return
    const sortable = new Sortable(listRef.current, { animation: 160, handle: '.page-grip', onEnd: () => { if (listRef.current) onReorder([...listRef.current.children].map((child) => (child as HTMLElement).dataset.id!)) } })
    return () => sortable.destroy()
  }, [onReorder])
  return <aside className="pages-panel">
    <div className="pages-heading"><span>Páginas</span><button onClick={onAdd} title="Adicionar página"><Plus /></button></div>
    <div className="pages-list" ref={listRef}>{pages.map((page, index) => <button key={page.id} data-id={page.id} className={`page-thumb ${page.id === activeId ? 'active' : ''}`} onClick={() => onSelect(page.id)}>
      <GripVertical className="page-grip" /><span className="page-paper"><span>{index + 1}</span><i /><i /><i /></span><input aria-label="Nome da página" value={page.name} onClick={(e) => e.stopPropagation()} onChange={(e) => onRename(page.id, e.target.value)} />
    </button>)}</div>
    <div className="page-actions"><button onClick={onDuplicate} title="Duplicar página"><Copy /></button><button onClick={onDelete} disabled={pages.length <= 1} title="Excluir página"><Trash2 /></button></div>
  </aside>
}
