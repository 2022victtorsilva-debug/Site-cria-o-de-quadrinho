import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { BottomSheet } from '../components/BottomSheet'

describe('Bottom Sheet mobile', () => {
  it('fecha quando a alça é arrastada para baixo', () => {
    const onClose = vi.fn()
    const { container } = render(<BottomSheet title="Desenhar" viewKey="draw" initialSnap="compact" onClose={onClose}><button>Caneta</button></BottomSheet>)
    const handle = container.querySelector('.sheet-drag-zone') as HTMLElement
    fireEvent.pointerDown(handle, { pointerId: 1, clientY: 180 })
    fireEvent.pointerMove(handle, { pointerId: 1, clientY: 700 })
    fireEvent.pointerUp(handle, { pointerId: 1, clientY: 700 })
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('mantém o conteúdo em uma única região sobreposta', () => {
    render(<BottomSheet title="Pesquisar imagens" viewKey="images" initialSnap="expanded" onClose={vi.fn()}><p>Resultados</p></BottomSheet>)
    expect(screen.getAllByRole('region', { name: 'Opções da ferramenta' })).toHaveLength(1)
    expect(screen.getByRole('region', { name: 'Opções da ferramenta' })).toHaveClass('bottom-sheet')
  })
})
