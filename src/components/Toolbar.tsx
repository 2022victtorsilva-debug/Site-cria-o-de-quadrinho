import {
  AlignCenter, AlignLeft, AlignRight, ArrowRight, Bold, Brush, Circle, ClipboardCopy, ClipboardPaste, Copy, Crop, Eraser, Highlighter, ImagePlus,
  Italic, Layers, Lock, Minus, MousePointer2, Palette, Pencil, Redo2, RotateCcw, Search, Square,
  Trash2, Triangle, Type, Undo2, ZoomIn, ZoomOut,
} from 'lucide-react'
import type { BrushSettings, CanvasEditorApi, EditorState, EditorTool } from '../editors/editorApi'

type Props = {
  api: CanvasEditorApi | null
  state: EditorState
  brush: BrushSettings
  onBrush: (value: BrushSettings) => void
  onImageSearch: () => void
  onUpload: () => void
  onCrop: () => void
  onLayers: () => void
  comic?: boolean
}

const ToolButton = ({ label, icon: Icon, active, disabled, onClick }: { label: string; icon: typeof Pencil; active?: boolean; disabled?: boolean; onClick: () => void }) => (
  <button className={`tool-button ${active ? 'active' : ''}`} title={label} aria-label={label} disabled={disabled} onClick={onClick}><Icon /></button>
)

export function Toolbar({ api, state, brush, onBrush, onImageSearch, onUpload, onCrop, onLayers, comic }: Props) {
  const setTool = (tool: EditorTool) => api?.setTool(tool)
  return <>
    <aside className="left-toolbar" aria-label="Ferramentas do editor">
      <div className="tool-group">
        <ToolButton label="Selecionar" icon={MousePointer2} active={state.activeTool === 'select'} onClick={() => setTool('select')} />
        <ToolButton label="Lápis" icon={Pencil} active={state.activeTool === 'pencil'} onClick={() => setTool('pencil')} />
        <ToolButton label="Pincel" icon={Brush} active={state.activeTool === 'brush'} onClick={() => setTool('brush')} />
        <ToolButton label="Marcador" icon={Highlighter} active={state.activeTool === 'marker'} onClick={() => setTool('marker')} />
        <ToolButton label="Borracha" icon={Eraser} active={state.activeTool === 'eraser'} onClick={() => setTool('eraser')} />
      </div>
      <div className="tool-divider" />
      <div className="tool-group">
        <ToolButton label="Texto" icon={Type} onClick={() => api?.addText()} />
        <ToolButton label="Imagem" icon={ImagePlus} onClick={onUpload} />
        <ToolButton label="Recortar imagem" icon={Crop} disabled={!state.hasSelection} onClick={onCrop} />
        <ToolButton label="Pesquisar imagens" icon={Search} onClick={onImageSearch} />
      </div>
      <div className="tool-divider" />
      <div className="tool-group">
        <ToolButton label="Retângulo" icon={Square} onClick={() => api?.addShape('rectangle')} />
        <ToolButton label="Quadrado" icon={Square} onClick={() => api?.addShape('square')} />
        <ToolButton label="Linha" icon={Minus} onClick={() => api?.addShape('line')} />
        <ToolButton label="Círculo" icon={Circle} onClick={() => api?.addShape('circle')} />
        <ToolButton label="Triângulo" icon={Triangle} onClick={() => api?.addShape('triangle')} />
        <ToolButton label="Seta" icon={ArrowRight} onClick={() => api?.addShape('arrow')} />
      </div>
      <div className="tool-divider" />
      <ToolButton label="Camadas" icon={Layers} onClick={onLayers} />
    </aside>
    <div className="context-toolbar">
      <div className="history-actions">
        <ToolButton label="Desfazer" icon={Undo2} disabled={!state.canUndo} onClick={() => api?.undo()} />
        <ToolButton label="Refazer" icon={Redo2} disabled={!state.canRedo} onClick={() => api?.redo()} />
        <ToolButton label="Copiar" icon={ClipboardCopy} disabled={!state.hasSelection} onClick={() => api?.copy()} />
        <ToolButton label="Colar" icon={ClipboardPaste} onClick={() => api?.paste()} />
      </div>
      <div className="context-divider" />
      <label className="compact-field" title="Cor"><Palette /><input type="color" value={brush.color} onChange={(e) => onBrush({ ...brush, color: e.target.value })} /></label>
      <label className="range-field">Espessura <input type="range" min="1" max="60" value={brush.width} onChange={(e) => onBrush({ ...brush, width: Number(e.target.value) })} /><span>{brush.width}</span></label>
      <label className="range-field opacity-field">Opacidade <input type="range" min="10" max="100" value={Math.round(brush.opacity * 100)} onChange={(e) => onBrush({ ...brush, opacity: Number(e.target.value) / 100 })} /><span>{Math.round(brush.opacity * 100)}%</span></label>
      {state.hasSelection && <>
        <div className="context-divider" />
        <select className="font-select" title="Fonte" defaultValue="Trebuchet MS" onChange={(e) => api?.updateSelected({ fontFamily: e.target.value })}><option>Trebuchet MS</option><option>Arial</option><option>Georgia</option><option>Courier New</option><option>Impact</option></select>
        <label className="font-size-field" title="Tamanho do texto"><input type="number" min="8" max="180" defaultValue="34" onChange={(e) => api?.updateSelected({ fontSize: Number(e.target.value) })} /><span>px</span></label>
        <ToolButton label="Negrito" icon={Bold} onClick={() => api?.updateSelected({ bold: true })} />
        <ToolButton label="Itálico" icon={Italic} onClick={() => api?.updateSelected({ italic: true })} />
        <ToolButton label="Alinhar texto à esquerda" icon={AlignLeft} onClick={() => api?.updateSelected({ textAlign: 'left' })} />
        <ToolButton label="Centralizar texto" icon={AlignCenter} onClick={() => api?.updateSelected({ textAlign: 'center' })} />
        <ToolButton label="Alinhar texto à direita" icon={AlignRight} onClick={() => api?.updateSelected({ textAlign: 'right' })} />
        <ToolButton label="Duplicar" icon={Copy} onClick={() => api?.duplicate()} />
        <ToolButton label={state.selectionLocked ? 'Desbloquear' : 'Bloquear'} icon={Lock} active={state.selectionLocked} onClick={() => api?.toggleLock()} />
        <ToolButton label="Excluir" icon={Trash2} onClick={() => api?.remove()} />
      </>}
      <div className="context-spacer" />
      {comic && <span className="comic-mode-pill">Modo quadrinho</span>}
      <ToolButton label="Diminuir zoom" icon={ZoomOut} onClick={() => api?.zoomOut()} />
      <button className="zoom-value" onClick={() => api?.fit()} title="Encaixar na tela">{Math.round(state.zoom * 100)}%</button>
      <ToolButton label="Aumentar zoom" icon={ZoomIn} onClick={() => api?.zoomIn()} />
      <ToolButton label="Centralizar e encaixar" icon={RotateCcw} onClick={() => api?.fit()} />
    </div>
  </>
}
