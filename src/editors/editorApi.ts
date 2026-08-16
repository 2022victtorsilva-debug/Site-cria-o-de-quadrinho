import type { LayerItem } from '../types/project'

export type EditorTool = 'select' | 'pencil' | 'brush' | 'marker' | 'eraser' | 'line' | 'arrow' | 'rectangle' | 'square' | 'circle' | 'triangle'

export type CanvasEditorApi = {
  setTool: (tool: EditorTool) => void
  addText: () => void
  addShape: (shape: EditorTool) => void
  addImage: (url: string, storagePath?: string) => Promise<void>
  addBubble: (kind: 'speech' | 'thought' | 'shout' | 'narration') => void
  addEffect: (text: string) => void
  addPanelLayout: (count: number) => void
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
export type SelectionSettings = Partial<BrushSettings & { fontSize: number; fontFamily: string; bold: boolean; italic: boolean; textAlign: string }>

export type EditorState = {
  activeTool: EditorTool
  canUndo: boolean
  canRedo: boolean
  zoom: number
  hasSelection: boolean
  selectionLocked: boolean
  layers: LayerItem[]
}
