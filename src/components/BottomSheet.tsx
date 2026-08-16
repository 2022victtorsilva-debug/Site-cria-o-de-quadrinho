import { ArrowLeft, X } from 'lucide-react'
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'

export type SheetSnap = 'compact' | 'medium' | 'expanded'

type Props = {
  children: ReactNode
  initialSnap?: SheetSnap
  onBack?: () => void
  onClose: () => void
  title: string
  viewKey: string
}

const ratios: Record<SheetSnap, number> = { compact: .32, medium: .56, expanded: .88 }
const orderedSnaps: SheetSnap[] = ['compact', 'medium', 'expanded']

function viewportHeight() {
  return Math.max(320, window.visualViewport?.height || window.innerHeight)
}

export function BottomSheet({ children, initialSnap = 'medium', onBack, onClose, title, viewKey }: Props) {
  const contentRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{ pointerId: number; startHeight: number; currentHeight: number; startY: number; lastY: number; lastTime: number; velocity: number } | null>(null)
  const [snap, setSnap] = useState<SheetSnap>(initialSnap)
  const [availableHeight, setAvailableHeight] = useState(() => viewportHeight() - 70)
  const [contentHeight, setContentHeight] = useState(0)
  const [dragHeight, setDragHeight] = useState<number | null>(null)
  const [manualSnap, setManualSnap] = useState(false)

  useEffect(() => {
    const updateViewport = () => setAvailableHeight(Math.max(250, viewportHeight() - 70))
    updateViewport()
    window.addEventListener('resize', updateViewport)
    window.visualViewport?.addEventListener('resize', updateViewport)
    return () => {
      window.removeEventListener('resize', updateViewport)
      window.visualViewport?.removeEventListener('resize', updateViewport)
    }
  }, [])

  useLayoutEffect(() => {
    setSnap(initialSnap)
    setDragHeight(null)
    setManualSnap(false)
    const content = contentRef.current
    if (!content) return
    const measure = () => setContentHeight(content.scrollHeight + 62)
    measure()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(measure)
    observer.observe(content)
    return () => observer.disconnect()
  }, [initialSnap, viewKey])

  useEffect(() => {
    document.documentElement.classList.add('editor-sheet-open')
    document.body.classList.add('editor-sheet-open')
    return () => {
      document.documentElement.classList.remove('editor-sheet-open')
      document.body.classList.remove('editor-sheet-open')
    }
  }, [])

  const snapHeight = Math.min(
    availableHeight * ratios[snap],
    !manualSnap && contentHeight ? Math.max(150, contentHeight) : Number.POSITIVE_INFINITY,
  )
  const currentHeight = Math.max(120, dragHeight ?? snapHeight)

  const startDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest('button, input, textarea, select, a')) return
    event.preventDefault()
    event.currentTarget.setPointerCapture?.(event.pointerId)
    dragRef.current = { pointerId: event.pointerId, startHeight: currentHeight, currentHeight, startY: event.clientY, lastY: event.clientY, lastTime: performance.now(), velocity: 0 }
    setDragHeight(currentHeight)
  }

  const moveDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    event.preventDefault()
    const now = performance.now()
    const elapsed = Math.max(1, now - drag.lastTime)
    drag.velocity = (event.clientY - drag.lastY) / elapsed
    drag.lastY = event.clientY
    drag.lastTime = now
    drag.currentHeight = Math.max(76, Math.min(availableHeight * .92, drag.startHeight - (event.clientY - drag.startY)))
    setDragHeight(drag.currentHeight)
  }

  const finishDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    event.preventDefault()
    dragRef.current = null
    const height = drag.currentHeight
    const ratio = height / availableHeight
    setDragHeight(null)
    if (ratio < .2 || (drag.velocity > 1.05 && ratio < .42)) {
      onClose()
      return
    }
    const nearest = orderedSnaps.reduce((best, candidate) => Math.abs(ratios[candidate] - ratio) < Math.abs(ratios[best] - ratio) ? candidate : best, 'compact')
    setManualSnap(true)
    setSnap(nearest)
  }

  const style = { '--sheet-height': `${currentHeight}px` } as CSSProperties

  return <section className={`editor-drawer bottom-sheet snap-${snap} ${dragHeight != null ? 'dragging' : ''}`} style={style} aria-label="Opções da ferramenta">
    <div className="sheet-drag-zone" onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={finishDrag} onPointerCancel={finishDrag}>
      <i aria-hidden="true" />
    </div>
    <div className="drawer-heading">
      <div className="drawer-title-wrap">{onBack && <button className="drawer-back" onClick={onBack} aria-label="Voltar"><ArrowLeft /></button>}<strong>{title}</strong></div>
      <button onClick={onClose} aria-label="Fechar painel"><X /></button>
    </div>
    <div className="bottom-sheet-content" ref={contentRef}>{children}</div>
  </section>
}
