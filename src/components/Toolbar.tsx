import {
  AlignCenter, AlignLeft, AlignRight, ArrowDown, ArrowRight, Bold, Brush, Circle, ClipboardCopy, ClipboardPaste, Cloud, Copy, Crop, Eraser, Flame,
  Heart, Highlighter, ImagePlus, Italic, Layers, Lock, Minus, Moon, MoreHorizontal, MousePointer2, Palette, Pencil, Plus,
  Redo2, Search, Shapes, Sparkles, Square, Star, Sun, Trash2, Triangle, Type, Undo2, X, Zap, ZoomIn, ZoomOut,
  type LucideIcon,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import type { BrushSettings, CanvasEditorApi, EditorState, EditorTool, ElementKind, SelectionSettings } from '../editors/editorApi'

type Drawer = 'draw' | 'text' | 'elements' | 'add' | 'colors' | 'fonts' | 'more' | null
type ColorTarget = 'brush' | 'text' | 'fill' | 'stroke' | 'background'

type Props = {
  api: CanvasEditorApi | null
  state: EditorState
  brush: BrushSettings
  onBrush: (value: BrushSettings) => void
  onImageSearch: () => void
  onUpload: () => void
  onCrop: () => void
  onLayers: () => void
  onBackground: (color: string) => void
  comic?: boolean
}

const quickColors = ['#111111', '#ffffff', '#ef4444', '#2563eb', '#16a34a', '#facc15', '#7c3aed', '#f97316']

const fonts = [
  { group: 'Simples', names: ['Arial', 'Inter', 'Roboto'] },
  { group: 'Divertidas', names: ['Fredoka', 'Baloo 2', 'Comic Sans MS'] },
  { group: 'Fortes', names: ['Anton', 'Bebas Neue', 'Oswald'] },
  { group: 'Elegantes', names: ['Playfair Display', 'Lora'] },
  { group: 'Quadrinhos', names: ['Bangers', 'Patrick Hand', 'Atkinson Hyperlegible'] },
]

const elements: Array<{ kind: ElementKind; label: string; icon: LucideIcon; group: string }> = [
  { kind: 'square', label: 'Quadrado', icon: Square, group: 'Formas' },
  { kind: 'rectangle', label: 'Retângulo', icon: Square, group: 'Formas' },
  { kind: 'circle', label: 'Círculo', icon: Circle, group: 'Formas' },
  { kind: 'triangle', label: 'Triângulo', icon: Triangle, group: 'Formas' },
  { kind: 'star', label: 'Estrela', icon: Star, group: 'Formas' },
  { kind: 'heart', label: 'Coração', icon: Heart, group: 'Formas' },
  { kind: 'arrow', label: 'Seta', icon: ArrowRight, group: 'Formas' },
  { kind: 'line', label: 'Linha', icon: Minus, group: 'Formas' },
  { kind: 'burst', label: 'Explosão', icon: Sparkles, group: 'Quadrinhos' },
  { kind: 'speed-lines', label: 'Velocidade', icon: MoreHorizontal, group: 'Quadrinhos' },
  { kind: 'lightning', label: 'Raio', icon: Zap, group: 'Símbolos' },
  { kind: 'cloud', label: 'Nuvem', icon: Cloud, group: 'Símbolos' },
  { kind: 'sun', label: 'Sol', icon: Sun, group: 'Símbolos' },
  { kind: 'moon', label: 'Lua', icon: Moon, group: 'Símbolos' },
  { kind: 'flame', label: 'Fogo', icon: Flame, group: 'Símbolos' },
]

function ToolButton({ label, icon: Icon, active, disabled, compact, danger, onClick }: { label: string; icon: LucideIcon; active?: boolean; disabled?: boolean; compact?: boolean; danger?: boolean; onClick: () => void }) {
  return <button className={`editor-tool-button ${active ? 'active' : ''} ${compact ? 'compact' : ''} ${danger ? 'danger' : ''}`} title={label} disabled={disabled} onClick={onClick}><Icon /><span>{label}</span></button>
}

function DrawerHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return <div className="drawer-heading"><strong>{title}</strong><button onClick={onClose} aria-label="Fechar painel"><X /></button></div>
}

export function Toolbar({ api, state, brush, onBrush, onImageSearch, onUpload, onCrop, onLayers, onBackground, comic }: Props) {
  const [drawer, setDrawer] = useState<Drawer>(null)
  const [colorTarget, setColorTarget] = useState<ColorTarget>('brush')
  const [recentColors, setRecentColors] = useState<string[]>([])

  useEffect(() => {
    if (!state.hasSelection && drawer === 'text') setDrawer(null)
  }, [state.hasSelection, drawer])

  const selectedLabel = useMemo(() => ({
    none: '', text: 'Texto', image: 'Imagem', shape: 'Elemento', bubble: 'Balão', panel: 'Quadro', drawing: 'Desenho', effect: 'Efeito',
  }[state.selectionKind]), [state.selectionKind])

  const chooseDrawer = (next: Drawer) => setDrawer((current) => current === next ? null : next)
  const setTool = (tool: EditorTool) => { api?.setTool(tool); if (tool === 'select') setDrawer(null); else if (['pencil', 'brush', 'marker', 'eraser'].includes(tool)) setDrawer('draw') }
  const openColors = (target: ColorTarget) => { setColorTarget(target); setDrawer('colors') }

  const applyColor = (color: string) => {
    setRecentColors((items) => [color, ...items.filter((item) => item !== color)].slice(0, 6))
    if (colorTarget === 'brush') onBrush({ ...brush, color })
    if (colorTarget === 'background') onBackground(color)
    if (colorTarget === 'text') api?.updateSelected({ color })
    if (colorTarget === 'fill') api?.updateSelected({ fillColor: color })
    if (colorTarget === 'stroke') api?.updateSelected({ strokeColor: color })
  }

  const addText = () => { api?.addText(); setDrawer('text') }
  const addElement = (kind: ElementKind) => { api?.addElement(kind); setDrawer(null) }
  const applyText = (settings: SelectionSettings) => api?.updateSelected(settings)

  return <>
    <aside className="desktop-tool-rail" aria-label="Ferramentas principais">
      <ToolButton label="Selecionar" icon={MousePointer2} active={state.activeTool === 'select'} onClick={() => setTool('select')} />
      <ToolButton label="Desenhar" icon={Pencil} active={['pencil', 'brush', 'marker', 'eraser'].includes(state.activeTool)} onClick={() => chooseDrawer('draw')} />
      <ToolButton label="Texto" icon={Type} active={drawer === 'text'} onClick={addText} />
      <ToolButton label="Elementos" icon={Shapes} active={drawer === 'elements'} onClick={() => chooseDrawer('elements')} />
      <ToolButton label="Imagem" icon={ImagePlus} onClick={() => chooseDrawer('add')} />
      {comic && <ToolButton label="Balões" icon={Cloud} onClick={() => chooseDrawer('add')} />}
      <ToolButton label="Fundo" icon={Palette} onClick={() => openColors('background')} />
      <ToolButton label="Mais" icon={MoreHorizontal} active={drawer === 'more'} onClick={() => chooseDrawer('more')} />
    </aside>

    <div className="editor-top-actions" aria-label="Ações do editor">
      <ToolButton compact label="Desfazer" icon={Undo2} disabled={!state.canUndo} onClick={() => api?.undo()} />
      <ToolButton compact label="Refazer" icon={Redo2} disabled={!state.canRedo} onClick={() => api?.redo()} />
      {state.hasSelection && <>
        <span className="selection-pill">{selectedLabel} selecionado</span>
        {(state.selectionKind === 'text' || state.selectionKind === 'bubble' || state.selectionKind === 'effect') && <ToolButton compact label="Editar" icon={Type} onClick={() => { api?.editSelectedText(); setDrawer('text') }} />}
        {state.selectionKind !== 'image' && <ToolButton compact label="Cor" icon={Palette} onClick={() => openColors(state.selectionKind === 'text' || state.selectionKind === 'effect' ? 'text' : 'fill')} />}
        <ToolButton compact label="Duplicar" icon={Copy} onClick={() => api?.duplicate()} />
        <ToolButton compact danger label="Excluir" icon={Trash2} onClick={() => api?.remove()} />
      </>}
      <span className="top-action-spacer" />
      <ToolButton compact label="Diminuir" icon={ZoomOut} onClick={() => api?.zoomOut()} />
      <button className="zoom-value" onClick={() => api?.fit()}>{Math.round(state.zoom * 100)}%</button>
      <ToolButton compact label="Aumentar" icon={ZoomIn} onClick={() => api?.zoomIn()} />
    </div>

    {state.hasSelection && <div className="mobile-selection-actions" aria-label={`Opções de ${selectedLabel}`}>
      <span>{selectedLabel}</span>
      {(state.selectionKind === 'text' || state.selectionKind === 'bubble' || state.selectionKind === 'effect') && <ToolButton compact label="Editar" icon={Type} onClick={() => setDrawer('text')} />}
      {state.selectionKind !== 'image' && <ToolButton compact label="Cor" icon={Palette} onClick={() => openColors(state.selectionKind === 'text' || state.selectionKind === 'effect' ? 'text' : 'fill')} />}
      {state.selectionKind === 'image' && <ToolButton compact label="Recortar" icon={Crop} onClick={onCrop} />}
      <ToolButton compact label="Duplicar" icon={Copy} onClick={() => api?.duplicate()} />
      <ToolButton compact danger label="Excluir" icon={Trash2} onClick={() => api?.remove()} />
    </div>}

    <nav className="mobile-editor-nav" aria-label="Ferramentas do editor">
      <ToolButton label="Selecionar" icon={MousePointer2} active={state.activeTool === 'select'} onClick={() => setTool('select')} />
      <ToolButton label="Desenhar" icon={Pencil} active={['pencil', 'brush', 'marker', 'eraser'].includes(state.activeTool)} onClick={() => chooseDrawer('draw')} />
      <ToolButton label="Texto" icon={Type} active={drawer === 'text'} onClick={addText} />
      <ToolButton label="Elementos" icon={Shapes} active={drawer === 'elements'} onClick={() => chooseDrawer('elements')} />
      <ToolButton label="Adicionar" icon={Plus} active={drawer === 'add'} onClick={() => chooseDrawer('add')} />
    </nav>

    {drawer && <section className="editor-drawer" aria-label="Opções da ferramenta">
      {drawer === 'draw' && <>
        <DrawerHeader title="Desenhar" onClose={() => setDrawer(null)} />
        <p className="drawer-help">Escolha a ferramenta. Neste modo, um dedo desenha e não move objetos.</p>
        <div className="choice-grid four">
          <ToolButton label="Caneta" icon={Pencil} active={state.activeTool === 'pencil'} onClick={() => setTool('pencil')} />
          <ToolButton label="Pincel" icon={Brush} active={state.activeTool === 'brush'} onClick={() => setTool('brush')} />
          <ToolButton label="Marcador" icon={Highlighter} active={state.activeTool === 'marker'} onClick={() => setTool('marker')} />
          <ToolButton label="Borracha" icon={Eraser} active={state.activeTool === 'eraser'} onClick={() => setTool('eraser')} />
        </div>
        <div className="drawer-section"><span>Cor</span><button className="color-summary" onClick={() => openColors('brush')}><i style={{ background: brush.color }} />Escolher cor</button></div>
        <div className="drawer-section"><span>Espessura</span><div className="brush-sizes">{[3, 6, 12, 24].map((size) => <button key={size} className={brush.width === size ? 'active' : ''} onClick={() => onBrush({ ...brush, width: size })}><i style={{ width: Math.max(6, size), height: Math.max(6, size) }} /><small>{size}</small></button>)}</div></div>
        <div className="drawer-section"><span>Opacidade</span><div className="size-chips">{[25, 50, 75, 100].map((value) => <button key={value} className={Math.round(brush.opacity * 100) === value ? 'active' : ''} onClick={() => onBrush({ ...brush, opacity: value / 100 })}>{value}%</button>)}</div></div>
      </>}

      {drawer === 'text' && <>
        <DrawerHeader title={state.hasSelection ? 'Editar texto' : 'Texto'} onClose={() => setDrawer(null)} />
        {state.hasSelection && (state.selectionKind === 'text' || state.selectionKind === 'bubble' || state.selectionKind === 'effect') && <label className="text-edit-field"><span>Conteúdo</span><textarea value={state.selectedText} onFocus={() => api?.editSelectedText()} onChange={(event) => api?.updateSelectedText(event.target.value)} /></label>}
        <div className="choice-grid text-actions">
          <button onClick={() => setDrawer('fonts')}><strong style={{ fontFamily: state.selectedFontFamily }}>Aa</strong><span>Fonte</span></button>
          <button onClick={() => openColors('text')}><Palette /><span>Cor</span></button>
          <button onClick={() => applyText({ bold: true })}><Bold /><span>Negrito</span></button>
          <button onClick={() => applyText({ italic: true })}><Italic /><span>Itálico</span></button>
        </div>
        <div className="drawer-section"><span>Tamanho</span><div className="size-chips">{[18, 24, 34, 48, 72].map((size) => <button key={size} className={state.selectedFontSize === size ? 'active' : ''} onClick={() => applyText({ fontSize: size })}>{size}</button>)}</div></div>
        <div className="drawer-section"><span>Alinhamento</span><div className="inline-actions"><ToolButton compact label="Esquerda" icon={AlignLeft} onClick={() => applyText({ textAlign: 'left' })} /><ToolButton compact label="Centro" icon={AlignCenter} onClick={() => applyText({ textAlign: 'center' })} /><ToolButton compact label="Direita" icon={AlignRight} onClick={() => applyText({ textAlign: 'right' })} /></div></div>
      </>}

      {drawer === 'fonts' && <>
        <DrawerHeader title="Escolher fonte" onClose={() => setDrawer('text')} />
        <div className="font-groups">{fonts.map((group) => <div key={group.group}><span>{group.group}</span>{group.names.map((font) => <button key={font} className={state.selectedFontFamily === font ? 'active' : ''} style={{ fontFamily: font }} onClick={() => { applyText({ fontFamily: font }); setDrawer('text') }}>{font}</button>)}</div>)}</div>
      </>}

      {drawer === 'elements' && <>
        <DrawerHeader title="Elementos" onClose={() => setDrawer(null)} />
        <p className="drawer-help">Formas e símbolos livres para decorar seu desenho.</p>
        {[...new Set(elements.map((item) => item.group))].map((group) => <div className="drawer-section" key={group}><span>{group}</span><div className="element-grid">{elements.filter((item) => item.group === group).map((item) => <button key={item.kind} onClick={() => addElement(item.kind)}><item.icon /><small>{item.label}</small></button>)}</div></div>)}
      </>}

      {drawer === 'add' && <>
        <DrawerHeader title="Adicionar" onClose={() => setDrawer(null)} />
        <div className="add-list">
          <button onClick={addText}><Type /><span><strong>Texto</strong><small>Escrever no projeto</small></span><ArrowRight /></button>
          <button onClick={() => setDrawer('elements')}><Shapes /><span><strong>Elementos e formas</strong><small>Símbolos e decorações</small></span><ArrowRight /></button>
          <button onClick={onUpload}><ImagePlus /><span><strong>Enviar imagem</strong><small>Do celular ou computador</small></span><ArrowRight /></button>
          <button onClick={onImageSearch}><Search /><span><strong>Pesquisar imagem</strong><small>Buscar três opções na internet</small></span><ArrowRight /></button>
          {comic && <>
            <div className="embedded-picker"><span>Layouts de quadrinhos</span><div>{[1, 2, 3, 4, 6].map((count) => <button key={count} onClick={() => api?.addPanelLayout(count)}><i className={`layout-mini layout-${count}`}>{Array.from({ length: count }, (_, index) => <b key={index} />)}</i><small>{count} {count === 1 ? 'quadro' : 'quadros'}</small></button>)}</div></div>
            <button onClick={() => api?.addBubble('speech')}><Cloud /><span><strong>Balão de fala</strong><small>Adicionar com texto</small></span><ArrowRight /></button>
            <button onClick={() => api?.addBubble('thought')}><Cloud /><span><strong>Pensamento</strong><small>Balão de pensamento</small></span><ArrowRight /></button>
            <button onClick={() => api?.addBubble('shout')}><Zap /><span><strong>Balão de grito</strong><small>Para cenas de impacto</small></span><ArrowRight /></button>
            <button onClick={() => api?.addBubble('narration')}><Type /><span><strong>Narração</strong><small>Caixa de texto da história</small></span><ArrowRight /></button>
            <button onClick={() => api?.addBubble('rounded')}><Cloud /><span><strong>Balão arredondado</strong><small>Para diálogos suaves</small></span><ArrowRight /></button>
            <button onClick={() => api?.addBubble('rectangle')}><Square /><span><strong>Balão retangular</strong><small>Caixa com texto</small></span><ArrowRight /></button>
            <button onClick={() => api?.addPanel()}><Square /><span><strong>Novo quadro</strong><small>Quadro livre na página</small></span><ArrowRight /></button>
            <div className="embedded-picker"><span>Textos de efeito</span><div className="effect-buttons">{['BOOM!', 'POW!', 'CRASH!', 'HAHA!', '?!'].map((text) => <button key={text} onClick={() => api?.addEffect(text)}>{text}</button>)}</div></div>
          </>}
          <button onClick={() => openColors('background')}><Palette /><span><strong>Fundo da página</strong><small>Mudar a cor do papel</small></span><ArrowRight /></button>
        </div>
      </>}

      {drawer === 'colors' && <>
        <DrawerHeader title={colorTarget === 'background' ? 'Cor do fundo' : colorTarget === 'stroke' ? 'Cor da borda' : 'Escolher cor'} onClose={() => setDrawer(null)} />
        <div className="drawer-section"><span>Cores rápidas</span><div className="color-grid">{quickColors.map((color) => <button key={color} style={{ background: color }} className={color === '#ffffff' ? 'light' : ''} onClick={() => applyColor(color)} aria-label={`Usar cor ${color}`} />)}</div></div>
        {recentColors.length > 0 && <div className="drawer-section"><span>Cores recentes</span><div className="color-grid recent">{recentColors.map((color) => <button key={color} style={{ background: color }} className={color === '#ffffff' ? 'light' : ''} onClick={() => applyColor(color)} />)}</div></div>}
        <label className="custom-color"><span>Escolher outra cor</span><input type="color" value={colorTarget === 'background' ? state.background : colorTarget === 'brush' ? brush.color : state.selectedFill || '#5b4bdb'} onChange={(event) => applyColor(event.target.value)} /></label>
        {state.hasSelection && state.selectionKind !== 'text' && state.selectionKind !== 'effect' && <div className="color-targets"><button onClick={() => setColorTarget('fill')}>Preenchimento</button><button onClick={() => setColorTarget('stroke')}>Borda</button>{state.selectionKind === 'bubble' && <button onClick={() => setColorTarget('text')}>Texto</button>}</div>}
      </>}

      {drawer === 'more' && <>
        <DrawerHeader title="Mais ferramentas" onClose={() => setDrawer(null)} />
        <div className="add-list">
          <button onClick={onLayers}><Layers /><span><strong>Camadas</strong><small>Organizar frente e trás</small></span><ArrowRight /></button>
          <button disabled={!state.hasSelection} onClick={() => api?.copy()}><ClipboardCopy /><span><strong>Copiar</strong><small>Guardar uma cópia do item</small></span><ArrowRight /></button>
          <button onClick={() => api?.paste()}><ClipboardPaste /><span><strong>Colar</strong><small>Inserir o item copiado</small></span><ArrowRight /></button>
          <button disabled={!state.hasSelection} onClick={() => api?.toggleLock()}><Lock /><span><strong>{state.selectionLocked ? 'Desbloquear' : 'Bloquear'}</strong><small>Evitar movimentos sem querer</small></span><ArrowRight /></button>
          <button disabled={!state.hasSelection} onClick={() => api?.bringForward()}><ArrowDown className="rotate-180" /><span><strong>Para frente</strong><small>Colocar sobre outros itens</small></span><ArrowRight /></button>
          <button disabled={!state.hasSelection} onClick={() => api?.sendBackward()}><ArrowDown /><span><strong>Para trás</strong><small>Colocar atrás de outros itens</small></span><ArrowRight /></button>
          {state.selectionKind === 'image' && <button onClick={onCrop}><Crop /><span><strong>Recortar imagem</strong><small>Ajustar a área visível</small></span><ArrowRight /></button>}
          <button onClick={() => api?.fit()}><ZoomOut /><span><strong>Encaixar na tela</strong><small>Ver a página inteira</small></span><ArrowRight /></button>
        </div>
        {state.hasSelection && <div className="drawer-section"><span>Opacidade do item</span><div className="size-chips">{[25, 50, 75, 100].map((value) => <button key={value} onClick={() => api?.updateSelected({ opacity: value / 100 })}>{value}%</button>)}</div></div>}
        {state.hasSelection && <div className="drawer-section"><span>Alinhar na página</span><div className="inline-actions"><ToolButton compact label="Esquerda" icon={AlignLeft} onClick={() => api?.align('left')} /><ToolButton compact label="Centro" icon={AlignCenter} onClick={() => api?.align('center')} /><ToolButton compact label="Direita" icon={AlignRight} onClick={() => api?.align('right')} /></div></div>}
      </>}
    </section>}
  </>
}
