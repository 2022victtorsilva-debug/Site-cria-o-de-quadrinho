import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Toolbar } from '../components/Toolbar'
import type { BrushSettings, CanvasEditorApi, EditorState } from '../editors/editorApi'

function setup(overrides: Partial<EditorState> = {}) {
  const api = {
    setTool: vi.fn(), addText: vi.fn(), addElement: vi.fn(), addBubble: vi.fn(), addEffect: vi.fn(), addPanelLayout: vi.fn(),
    undo: vi.fn(), redo: vi.fn(), duplicate: vi.fn(), remove: vi.fn(), bringForward: vi.fn(), sendBackward: vi.fn(),
    updateSelected: vi.fn(), updateSelectedText: vi.fn(), editSelectedText: vi.fn(), fit: vi.fn(), zoomIn: vi.fn(), zoomOut: vi.fn(),
  } as unknown as CanvasEditorApi
  const state: EditorState = {
    activeTool: 'select', canUndo: true, canRedo: true, zoom: 1, hasSelection: false, selectionLocked: false,
    selectionKind: 'none', selectedText: '', selectedFill: '#5b4bdb', selectedStroke: '#25233a', selectedFontFamily: 'Fredoka', selectedFontSize: 34, background: '#ffffff', layers: [], ...overrides,
  }
  const brush: BrushSettings = { color: '#25233a', width: 6, opacity: 1 }
  render(<Toolbar api={api} state={state} brush={brush} onBrush={vi.fn()} onImageInsert={vi.fn()} onUpload={vi.fn()} onCrop={vi.fn()} onBackground={vi.fn()} comic />)
  return api
}

describe('Toolbar do editor', () => {
  it('organiza o desenho em um painel com controles grandes', () => {
    const api = setup()
    fireEvent.click(screen.getAllByRole('button', { name: 'Desenhar' })[0])
    expect(screen.getByText(/um dedo desenha/i)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Caneta' }))
    expect(api.setTool).toHaveBeenCalledWith('pencil')
  })

  it('adiciona texto pela ferramenta principal', () => {
    const api = setup()
    fireEvent.click(screen.getAllByRole('button', { name: 'Texto' })[0])
    expect(api.addText).toHaveBeenCalledOnce()
    expect(screen.getAllByText('Texto').length).toBeGreaterThan(0)
  })

  it('abre elementos e insere um símbolo vetorial', () => {
    const api = setup()
    fireEvent.click(screen.getAllByRole('button', { name: 'Elementos' })[0])
    fireEvent.click(screen.getByRole('button', { name: 'Estrela' }))
    expect(api.addElement).toHaveBeenCalledWith('star')
  })

  it('mostra ações específicas quando uma imagem está selecionada', () => {
    setup({ hasSelection: true, selectionKind: 'image' })
    expect(screen.getByText('Imagem selecionado')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Recortar' }).length).toBeGreaterThan(0)
  })

  it('substitui Adicionar pela pesquisa no mesmo bottom sheet', () => {
    setup()
    fireEvent.click(screen.getAllByRole('button', { name: 'Adicionar' })[0])
    expect(screen.getByRole('region', { name: 'Opções da ferramenta' })).toHaveTextContent('Adicionar')
    fireEvent.click(screen.getByRole('button', { name: /Pesquisar imagem.*Buscar/i }))
    const sheet = screen.getByRole('region', { name: 'Opções da ferramenta' })
    expect(sheet).toHaveTextContent('Pesquisar imagens')
    expect(sheet).not.toHaveTextContent('Enviar imagem')
    fireEvent.click(screen.getByRole('button', { name: 'Voltar' }))
    expect(sheet).toHaveTextContent('Enviar imagem')
  })
})
