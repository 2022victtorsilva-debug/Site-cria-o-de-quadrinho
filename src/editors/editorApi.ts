import type { LayerItem } from '../types/project'

export type EditorTool = 'select' | 'pencil' | 'brush' | 'marker' | 'eraser' | 'line' | 'arrow' | 'rectangle' | 'square' | 'circle' | 'triangle'

export type SelectionKind = 'none' | 'text' | 'image' | 'shape' | 'bubble' | 'panel' | 'drawing' | 'effect'

export type ElementKind = 'rectangle' | 'square' | 'circle' | 'triangle' | 'star' | 'heart' | 'arrow' | 'line' | 'lightning' | 'cloud' | 'sun' | 'moon' | 'flame' | 'burst' | 'speed-lines'

export type CanvasEditorApi = {
  setTool: (tool: EditorTool) => void
  addText: (text?: string) => void
  addShape: (shape: EditorTool) => void
  addElement: (kind: ElementKind) => void
  addImage: (url: string, storagePath?: string) => Promise<void>
  addBubble: (kind: 'speech' | 'thought' | 'shout' | 'narration' | 'rounded' | 'rectangle') => void
  addEffect: (text: string) => void
  addPanel: () => void
  addPanelLayout: (count: number) => void
  setBackground: (color: string) => void
  editSelectedText: () => void
  finishTextEditing: () => void
  updateSelectedText: (text: string) => void
  undo: () => void
  redo: () => void
  copy: () => void
  paste: () => void
  duplicate: () => void
  remove: () => void
  toggleLock: () => void
  bringForward: () => void
  sendBackward: () => void
  align: (where: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => void
  zoomIn: () => void
  zoomOut: () => void
  fit: () => void
  setBrush: (settings: BrushSettings) => void
  updateSelected: (settings: SelectionSettings) => void
  selectLayer: (id: string) => void
  toggleLayerVisible: (id: string) => void
  toggleLayerLock: (id: string) => void
  moveLayer: (id: string, direction: 'up' | 'down') => void
  serialize: () => Record<string, unknown>
  exportDataUrl: (format?: 'png' | 'jpeg') => string
  getSelectedImageUrl: () => string | null
  replaceSelectedImage: (url: string) => Promise<void>
}

export type BrushSettings = { color: string; width: number; opacity: number }
export type SelectionSettings = Partial<BrushSettings & { fillColor: string; strokeColor: string; fontSize: number; fontFamily: string; bold: boolean; italic: boolean; textAlign: string }>

export type EditorState = {
  activeTool: EditorTool
  canUndo: boolean
  canRedo: boolean
  zoom: number
  hasSelection: boolean
  selectionLocked: boolean
  selectionKind: SelectionKind
  selectedText: string
  selectedFill: string
  selectedStroke: string
  selectedFontFamily: string
  selectedFontSize: number
  background: string
  layers: LayerItem[]
}
