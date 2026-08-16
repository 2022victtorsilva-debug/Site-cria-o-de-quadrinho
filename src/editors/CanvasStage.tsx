import { useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'
import {
  Canvas, Circle, FabricImage, FabricObject, Group, Line, Path, PencilBrush, Polygon, Rect, Shadow, Textbox, Triangle,
} from 'fabric'
import { ImageSearchPanel } from '../components/ImageSearchPanel'
import { ImageCropperModal } from '../components/ImageCropperModal'
import { LayersPanel } from '../components/LayersPanel'
import { Toolbar } from '../components/Toolbar'
import type { AIImageResult, LayerItem } from '../types/project'
import type { BrushSettings, CanvasEditorApi, EditorState, EditorTool, SelectionSettings } from './editorApi'

FabricObject.customProperties = ['data']

type Props = {
  canvasKey: string
  json: Record<string, unknown>
  width: number
  height: number
  background: string
  comic?: boolean
  apiRef?: React.Ref<CanvasEditorApi>
  onChange: (json: Record<string, unknown>, thumbnail: string) => void
}

const initialState: EditorState = { activeTool: 'select', canUndo: false, canRedo: false, zoom: 1, hasSelection: false, selectionLocked: false, layers: [] }

function withAlpha(hex: string, opacity: number) {
  const clean = hex.replace('#', '')
  if (clean.length !== 6) return hex
  const n = Number.parseInt(clean, 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${opacity})`
}

function objectName(object: FabricObject) {
  const data = (object as any).data || {}
  if (data.name) return data.name as string
  if (object.type?.includes('text')) return 'Texto'
  if (object.type === 'image') return 'Imagem'
  if (object.type === 'path') return 'Traço'
  if (object.type === 'group') return 'Grupo'
  return 'Forma'
}

function setObjectIdentity(object: FabricObject, name?: string) {
  const current = (object as any).data || {}
  ;(object as any).data = { ...current, id: current.id || crypto.randomUUID(), name: name || current.name || objectName(object) }
}

export function CanvasStage({ canvasKey, json, width, height, background, comic, apiRef, onChange }: Props) {
  const canvasElement = useRef<HTMLCanvasElement>(null)
  const wrapper = useRef<HTMLDivElement>(null)
  const fabricRef = useRef<Canvas | null>(null)
  const history = useRef<string[]>([])
  const historyIndex = useRef(-1)
  const loading = useRef(false)
  const copied = useRef<FabricObject | null>(null)
  const brushRef = useRef<BrushSettings>({ color: '#25233a', width: 5, opacity: 1 })
  const toolRef = useRef<EditorTool>('select')
  const changeTimer = useRef<number | null>(null)
  const [brush, setBrushState] = useState<BrushSettings>(brushRef.current)
  const [editorState, setEditorState] = useState<EditorState>(initialState)
  const [panel, setPanel] = useState<'images' | 'layers' | null>(null)
  const [cropSrc, setCropSrc] = useState<string | null>(null)
  const [notice, setNotice] = useState('')

  const refreshState = useCallback((canvas = fabricRef.current) => {
    if (!canvas) return
    const active = canvas.getActiveObject()
    const layers: LayerItem[] = [...canvas.getObjects()].reverse().map((object) => {
      setObjectIdentity(object)
      const data = (object as any).data
      return { id: data.id, name: objectName(object), type: object.type || 'objeto', visible: object.visible !== false, locked: !object.selectable }
    })
    setEditorState((prev) => ({
      ...prev,
      canUndo: historyIndex.current > 0,
      canRedo: historyIndex.current >= 0 && historyIndex.current < history.current.length - 1,
      zoom: canvas.getZoom(),
      hasSelection: Boolean(active),
      selectionLocked: Boolean(active && !active.selectable),
      layers,
    }))
  }, [])

  const emitChange = useCallback((recordHistory = true) => {
    const canvas = fabricRef.current
    if (!canvas || loading.current) return
    const serialized = JSON.stringify(canvas.toJSON())
    if (recordHistory && history.current[historyIndex.current] !== serialized) {
      history.current = history.current.slice(0, historyIndex.current + 1)
      history.current.push(serialized)
      historyIndex.current = history.current.length - 1
      if (history.current.length > 60) { history.current.shift(); historyIndex.current -= 1 }
    }
    refreshState(canvas)
    if (changeTimer.current) window.clearTimeout(changeTimer.current)
    changeTimer.current = window.setTimeout(() => {
      const thumb = canvas.toDataURL({ format: 'webp', quality: 0.72, multiplier: 0.35 })
      onChange(JSON.parse(serialized), thumb)
    }, 180)
  }, [onChange, refreshState])

  const configureBrush = useCallback((tool = toolRef.current) => {
    const canvas = fabricRef.current
    if (!canvas) return
    canvas.isDrawingMode = ['pencil', 'brush', 'marker', 'eraser'].includes(tool)
    if (!canvas.isDrawingMode) return
    const settings = brushRef.current
    const fabricBrush = new PencilBrush(canvas)
    fabricBrush.width = tool === 'marker' ? settings.width * 3 : tool === 'brush' ? settings.width * 1.5 : settings.width
    fabricBrush.color = tool === 'eraser' ? 'rgba(255,255,255,1)' : withAlpha(settings.color, tool === 'marker' ? Math.min(settings.opacity, .35) : settings.opacity)
    canvas.freeDrawingBrush = fabricBrush
  }, [])

  const loadSnapshot = useCallback(async (serialized: string) => {
    const canvas = fabricRef.current
    if (!canvas) return
    loading.current = true
    await canvas.loadFromJSON(serialized)
    canvas.backgroundColor = background
    canvas.renderAll()
    loading.current = false
    refreshState(canvas)
  }, [background, refreshState])

  const addAndSelect = useCallback((object: FabricObject, name?: string) => {
    const canvas = fabricRef.current
    if (!canvas) return
    setObjectIdentity(object, name)
    object.set({ cornerColor: '#5b4bdb', cornerStrokeColor: '#ffffff', borderColor: '#5b4bdb', transparentCorners: false, cornerStyle: 'circle', padding: 4 })
    canvas.add(object)
    canvas.setActiveObject(object)
    canvas.renderAll()
    emitChange()
  }, [emitChange])

  const api: CanvasEditorApi = {
    setTool(tool) {
      toolRef.current = tool
      setEditorState((prev) => ({ ...prev, activeTool: tool }))
      const canvas = fabricRef.current
      if (canvas) { canvas.selection = tool === 'select'; canvas.defaultCursor = tool === 'select' ? 'default' : 'crosshair' }
      configureBrush(tool)
    },
    addText() {
      addAndSelect(new Textbox('Escreva aqui', { left: width / 2 - 100, top: height / 2 - 30, width: 220, fontSize: 34, fontFamily: 'Trebuchet MS', fill: brushRef.current.color }), 'Texto')
    },
    addShape(shape) {
      const common = { left: width / 2 - 70, top: height / 2 - 55, fill: withAlpha(brushRef.current.color, .18), stroke: brushRef.current.color, strokeWidth: Math.max(2, brushRef.current.width / 2) }
      if (shape === 'circle') addAndSelect(new Circle({ ...common, radius: 70 }), 'Círculo')
      else if (shape === 'triangle') addAndSelect(new Triangle({ ...common, width: 150, height: 130 }), 'Triângulo')
      else if (shape === 'line') addAndSelect(new Line([0, 0, 180, 0], { ...common, fill: undefined, left: width / 2 - 90, top: height / 2 }), 'Linha')
      else if (shape === 'arrow') {
        const line = new Line([0, 0, 150, 0], { stroke: brushRef.current.color, strokeWidth: 7, originX: 'center', originY: 'center' })
        const head = new Triangle({ width: 26, height: 32, fill: brushRef.current.color, left: 85, angle: 90, originX: 'center', originY: 'center' })
        addAndSelect(new Group([line, head], { left: width / 2 - 90, top: height / 2 }), 'Seta')
      } else addAndSelect(new Rect({ ...common, width: shape === 'square' ? 140 : 190, height: 140, rx: 8, ry: 8 }), shape === 'square' ? 'Quadrado' : 'Retângulo')
    },
    async addImage(url, storagePath) {
      const image = await FabricImage.fromURL(url, { crossOrigin: 'anonymous' })
      const max = Math.min(width * .55 / (image.width || 1), height * .55 / (image.height || 1), 1)
      image.set({ left: width / 2, top: height / 2, originX: 'center', originY: 'center', scaleX: max, scaleY: max })
      ;(image as any).data = { id: crypto.randomUUID(), name: 'Imagem', storagePath }
      addAndSelect(image, 'Imagem')
    },
    addBubble(kind) {
      const fill = '#ffffff', stroke = '#25233a'
      let objects: FabricObject[]
      if (kind === 'narration') objects = [new Rect({ width: 300, height: 110, rx: 8, ry: 8, fill: '#fff6c7', stroke, strokeWidth: 4 }), new Textbox('Narração...', { width: 260, left: 20, top: 22, fontSize: 26, textAlign: 'center', fontFamily: 'Trebuchet MS' })]
      else if (kind === 'thought') objects = [new Circle({ radius: 90, scaleX: 1.6, fill, stroke, strokeWidth: 4 }), new Circle({ radius: 16, left: 25, top: 180, fill, stroke, strokeWidth: 3 }), new Circle({ radius: 9, left: 5, top: 215, fill, stroke, strokeWidth: 3 }), new Textbox('Pensando...', { width: 240, left: -30, top: 60, fontSize: 26, textAlign: 'center', fontFamily: 'Trebuchet MS' })]
      else if (kind === 'shout') {
        const points = Array.from({ length: 20 }, (_, i) => { const a = i * Math.PI / 10; const r = i % 2 ? 105 : 145; return { x: Math.cos(a) * r + 145, y: Math.sin(a) * r + 145 } })
        objects = [new Polygon(points, { fill, stroke, strokeWidth: 4 }), new Textbox('GRITO!', { width: 210, left: 40, top: 110, fontSize: 32, fontWeight: 'bold', textAlign: 'center', fontFamily: 'Impact' })]
      } else objects = [new Path('M 20 20 Q 20 0 45 0 L 250 0 Q 280 0 280 25 L 280 110 Q 280 140 250 140 L 100 140 L 55 185 L 70 140 L 45 140 Q 20 140 20 115 Z', { fill, stroke, strokeWidth: 4 }), new Textbox('Olá!', { width: 220, left: 40, top: 45, fontSize: 30, textAlign: 'center', fontFamily: 'Trebuchet MS' })]
      addAndSelect(new Group(objects, { left: width / 2 - 145, top: height / 2 - 100 }), kind === 'narration' ? 'Caixa de narração' : 'Balão')
    },
    addEffect(text) {
      addAndSelect(new Textbox(text, { left: width / 2 - 120, top: height / 2 - 50, width: 260, fontSize: 70, fontFamily: 'Impact', fontWeight: 'bold', textAlign: 'center', fill: '#ffcc33', stroke: '#25233a', strokeWidth: 3, shadow: new Shadow({ color: '#ff5a66', offsetX: 5, offsetY: 6 }), angle: -8 }), 'Efeito')
    },
    addPanelLayout(count) {
      const gap = 20, margin = 45, usableW = width - margin * 2, usableH = height - margin * 2
      const layouts: Record<number, Array<[number, number, number, number]>> = {
        1: [[0, 0, 1, 1]], 2: [[0, 0, 1, .48], [0, .52, 1, .48]],
        3: [[0, 0, 1, .42], [0, .46, .48, .54], [.52, .46, .48, .54]],
        4: [[0, 0, .48, .48], [.52, 0, .48, .48], [0, .52, .48, .48], [.52, .52, .48, .48]],
        6: [[0, 0, .48, .31], [.52, 0, .48, .31], [0, .345, .48, .31], [.52, .345, .48, .31], [0, .69, .48, .31], [.52, .69, .48, .31]],
      }
      layouts[count]?.forEach(([x, y, w, h], index) => {
        const panel = new Rect({ left: margin + x * usableW, top: margin + y * usableH, width: w * usableW - gap / 2, height: h * usableH - gap / 2, fill: '#ffffff', stroke: '#25233a', strokeWidth: 7, rx: 3, ry: 3 })
        ;(panel as any).data = { id: crypto.randomUUID(), name: `Quadro ${index + 1}`, role: 'panel' }
        const canvas = fabricRef.current; if (canvas) { canvas.add(panel); canvas.sendObjectToBack(panel) }
      })
      emitChange()
    },
    undo() { if (historyIndex.current > 0) { historyIndex.current--; void loadSnapshot(history.current[historyIndex.current]) } },
    redo() { if (historyIndex.current < history.current.length - 1) { historyIndex.current++; void loadSnapshot(history.current[historyIndex.current]) } },
    copy() { const active = fabricRef.current?.getActiveObject(); if (active) void active.clone().then((clone) => { copied.current = clone }) },
    paste() { if (copied.current) void copied.current.clone().then((clone) => { clone.set({ left: (clone.left || 0) + 24, top: (clone.top || 0) + 24 }); setObjectIdentity(clone); addAndSelect(clone, objectName(clone)) }) },
    duplicate() { const active = fabricRef.current?.getActiveObject(); if (active) void active.clone().then((clone) => { clone.set({ left: (active.left || 0) + 24, top: (active.top || 0) + 24 }); (clone as any).data = { ...(active as any).data, id: crypto.randomUUID(), name: `${objectName(active)} cópia` }; addAndSelect(clone) }) },
    remove() { const canvas = fabricRef.current; const active = canvas?.getActiveObjects() || []; if (canvas && active.length) { active.forEach((o) => canvas.remove(o)); canvas.discardActiveObject(); canvas.renderAll(); emitChange() } },
    toggleLock() { const object = fabricRef.current?.getActiveObject(); if (!object) return; const locked = object.selectable !== false; object.set({ selectable: !locked, evented: !locked, lockMovementX: locked, lockMovementY: locked, lockRotation: locked, lockScalingX: locked, lockScalingY: locked }); fabricRef.current?.discardActiveObject(); fabricRef.current?.renderAll(); emitChange() },
    bringForward() { const c = fabricRef.current, o = c?.getActiveObject(); if (c && o) { c.bringObjectForward(o); emitChange() } },
    sendBackward() { const c = fabricRef.current, o = c?.getActiveObject(); if (c && o) { c.sendObjectBackwards(o); emitChange() } },
    align(where) { const c = fabricRef.current, o = c?.getActiveObject(); if (!c || !o) return; const bounds = o.getBoundingRect(); if (where === 'left') o.set({ left: 0 }); if (where === 'center') o.set({ left: width / 2, originX: 'center' }); if (where === 'right') o.set({ left: width - bounds.width, originX: 'left' }); if (where === 'top') o.set({ top: 0 }); if (where === 'middle') o.set({ top: height / 2, originY: 'center' }); if (where === 'bottom') o.set({ top: height - bounds.height, originY: 'top' }); o.setCoords(); c.renderAll(); emitChange() },
    zoomIn() { const c = fabricRef.current; if (c) { const zoom = Math.min(3, c.getZoom() + .1); c.setDimensions({ width: width * zoom, height: height * zoom }); c.setZoom(zoom); refreshState(c) } },
    zoomOut() { const c = fabricRef.current; if (c) { const zoom = Math.max(.2, c.getZoom() - .1); c.setDimensions({ width: width * zoom, height: height * zoom }); c.setZoom(zoom); refreshState(c) } },
    fit() { const c = fabricRef.current, el = wrapper.current; if (!c || !el) return; const zoom = Math.min((el.clientWidth - 48) / width, (el.clientHeight - 48) / height, 1); c.setDimensions({ width: width * zoom, height: height * zoom }); c.setZoom(zoom); refreshState(c) },
    setBrush(settings) { brushRef.current = settings; setBrushState(settings); configureBrush() },
    updateSelected(settings: SelectionSettings) { const object = fabricRef.current?.getActiveObject() as any; if (!object) return; const next: any = {}; if (settings.color) { next.fill = settings.color; next.stroke = object.type === 'path' ? settings.color : object.stroke } if (settings.opacity != null) next.opacity = settings.opacity; if (settings.fontSize) next.fontSize = settings.fontSize; if (settings.fontFamily) next.fontFamily = settings.fontFamily; if (settings.bold) next.fontWeight = object.fontWeight === 'bold' ? 'normal' : 'bold'; if (settings.italic) next.fontStyle = object.fontStyle === 'italic' ? 'normal' : 'italic'; if (settings.textAlign) next.textAlign = settings.textAlign; object.set(next); fabricRef.current?.renderAll(); emitChange() },
    selectLayer(id) { const c = fabricRef.current; const o = c?.getObjects().find((item) => (item as any).data?.id === id); if (c && o && o.selectable) { c.setActiveObject(o); c.renderAll(); refreshState(c) } },
    toggleLayerVisible(id) { const c = fabricRef.current; const o = c?.getObjects().find((item) => (item as any).data?.id === id); if (c && o) { o.set({ visible: o.visible === false }); c.renderAll(); emitChange() } },
    toggleLayerLock(id) { const c = fabricRef.current; const o = c?.getObjects().find((item) => (item as any).data?.id === id); if (c && o) { const locked = o.selectable !== false; o.set({ selectable: !locked, evented: !locked, lockMovementX: locked, lockMovementY: locked, lockRotation: locked, lockScalingX: locked, lockScalingY: locked }); c.renderAll(); emitChange() } },
    moveLayer(id, direction) { const c = fabricRef.current; const o = c?.getObjects().find((item) => (item as any).data?.id === id); if (c && o) { if (direction === 'up') c.bringObjectForward(o); else c.sendObjectBackwards(o); c.renderAll(); emitChange() } },
    serialize() { return fabricRef.current?.toJSON() || {} },
    exportDataUrl(format = 'png') { const canvas = fabricRef.current; return canvas?.toDataURL({ format, quality: .95, multiplier: 1 / canvas.getZoom() }) || '' },
    getSelectedImageUrl() { const active = fabricRef.current?.getActiveObject(); return active?.type === 'image' ? (active as FabricImage).getSrc() : null },
    async replaceSelectedImage(url) { const c = fabricRef.current, old = c?.getActiveObject(); if (!c || !old || old.type !== 'image') return; const image = await FabricImage.fromURL(url); image.set({ left: old.left, top: old.top, scaleX: old.scaleX, scaleY: old.scaleY, angle: old.angle, originX: old.originX, originY: old.originY }); (image as any).data = (old as any).data; c.remove(old); addAndSelect(image, 'Imagem') },
  }

  useImperativeHandle(apiRef, () => api)

  useEffect(() => {
    if (!canvasElement.current) return
    const canvas = new Canvas(canvasElement.current, { width, height, backgroundColor: background, preserveObjectStacking: true, selectionColor: 'rgba(91,75,219,.12)', selectionBorderColor: '#5b4bdb' })
    fabricRef.current = canvas
    loading.current = true
    void canvas.loadFromJSON(json).then(() => {
      canvas.backgroundColor = background; canvas.getObjects().forEach((o) => setObjectIdentity(o)); canvas.renderAll(); loading.current = false
      const first = JSON.stringify(canvas.toJSON()); history.current = [first]; historyIndex.current = 0; refreshState(canvas); window.setTimeout(() => api.fit(), 0)
    })
    const changed = () => emitChange()
    const selection = () => refreshState(canvas)
    canvas.on('object:added', changed); canvas.on('object:modified', changed); canvas.on('object:removed', changed); canvas.on('path:created', (event: any) => { if (event.path) { setObjectIdentity(event.path, toolRef.current === 'eraser' ? 'Borracha' : 'Traço'); if (toolRef.current === 'eraser') event.path.set({ globalCompositeOperation: 'destination-out' }) } changed() })
    canvas.on('selection:created', selection); canvas.on('selection:updated', selection); canvas.on('selection:cleared', selection)
    canvas.on('object:moving', (event: any) => { const object = event.target; if (!object) return; const snap = 10; object.set({ left: Math.round((object.left || 0) / snap) * snap, top: Math.round((object.top || 0) / snap) * snap }) })
    const resize = () => api.fit(); window.addEventListener('resize', resize)
    return () => { window.removeEventListener('resize', resize); if (changeTimer.current) window.clearTimeout(changeTimer.current); canvas.dispose(); fabricRef.current = null }
  }, [canvasKey])

  useEffect(() => { api.setBrush(brush) }, [brush.color, brush.width, brush.opacity])

  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      if ((event.target as HTMLElement)?.matches('input, textarea, [contenteditable="true"]')) return
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') { event.preventDefault(); if (event.shiftKey) api.redo(); else api.undo() }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'c') api.copy()
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'v') api.paste()
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'd') { event.preventDefault(); api.duplicate() }
      if (event.key === 'Delete' || event.key === 'Backspace') api.remove()
    }
    window.addEventListener('keydown', keydown); return () => window.removeEventListener('keydown', keydown)
  })

  const updateBrush = (next: BrushSettings) => { brushRef.current = next; setBrushState(next); api.setBrush(next); if (editorState.hasSelection) api.updateSelected(next) }
  const crop = () => { const src = api.getSelectedImageUrl(); if (src) setCropSrc(src); else { setNotice('Selecione uma imagem para recortar.'); window.setTimeout(() => setNotice(''), 2600) } }

  return <div className="editor-grid">
    <Toolbar api={api} state={editorState} brush={brush} onBrush={updateBrush} onImageSearch={() => setPanel(panel === 'images' ? null : 'images')} onUpload={() => document.getElementById('editor-upload')?.click()} onCrop={crop} onLayers={() => setPanel(panel === 'layers' ? null : 'layers')} comic={comic} />
    <div className="canvas-viewport" ref={wrapper}><div className="canvas-shadow"><canvas ref={canvasElement} /></div>{notice && <div className="canvas-notice">{notice}</div>}</div>
    {panel === 'layers' && <LayersPanel api={api} state={editorState} onClose={() => setPanel(null)} />}
    {panel === 'images' && <ImageSearchPanel onClose={() => setPanel(null)} onInsert={async (result: AIImageResult) => api.addImage(result.url, result.storagePath)} />}
    {cropSrc && <ImageCropperModal src={cropSrc} onCancel={() => setCropSrc(null)} onApply={async (url) => { await api.replaceSelectedImage(url); setCropSrc(null) }} />}
  </div>
}
