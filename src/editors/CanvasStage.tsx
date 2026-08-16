import { useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'
import {
  Canvas, Circle, FabricImage, FabricObject, Group, Line, Path, PencilBrush, Point, Polygon, Rect, Shadow, Textbox, Triangle,
} from 'fabric'
import { ImageCropperModal } from '../components/ImageCropperModal'
import { Toolbar } from '../components/Toolbar'
import type { LayerItem } from '../types/project'
import type { BrushSettings, CanvasEditorApi, EditorState, EditorTool, ElementKind, SelectionKind, SelectionSettings } from './editorApi'

FabricObject.customProperties = ['data']

type Props = {
  canvasKey: string
  json: Record<string, unknown>
  width: number
  height: number
  background: string
  comic?: boolean
  apiRef?: React.Ref<CanvasEditorApi>
  onChange: (json: Record<string, unknown>, thumbnail: string, background: string) => void
}

const initialState: EditorState = {
  activeTool: 'select', canUndo: false, canRedo: false, zoom: 1, hasSelection: false, selectionLocked: false,
  selectionKind: 'none', selectedText: '', selectedFill: '#5b4bdb', selectedStroke: '#25233a', selectedFontFamily: 'Fredoka', selectedFontSize: 34, background: '#ffffff', layers: [],
}

const placementOffsets = [[0, 0], [32, 32], [-32, 32], [32, -32], [-32, -32], [64, 0], [0, 64], [-64, 0], [0, -64]]

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
  object.set({ cornerColor: '#5b4bdb', cornerStrokeColor: '#ffffff', borderColor: '#5b4bdb', transparentCorners: false, cornerStyle: 'circle', cornerSize: 13, touchCornerSize: 34, padding: 7, centeredRotation: true, lockScalingFlip: true })
  const role = (object as any).data?.role
  if (object.type === 'image' || role === 'element') object.setControlsVisibility({ ml: false, mr: false, mt: false, mb: false })
}

function selectionKind(object?: FabricObject | null): SelectionKind {
  if (!object) return 'none'
  const data = (object as any).data || {}
  if (data.role === 'panel') return 'panel'
  if (data.role === 'bubble') return 'bubble'
  if (data.role === 'effect') return 'effect'
  if (object.type?.includes('text')) return 'text'
  if (object.type === 'image') return 'image'
  if (object.type === 'path' && data.role !== 'element') return 'drawing'
  return 'shape'
}

function textObject(object?: FabricObject | null): Textbox | null {
  if (!object) return null
  if (object.type?.includes('text')) return object as Textbox
  if (object.type === 'group') return ((object as Group).getObjects().find((item) => item.type?.includes('text')) as Textbox | undefined) || null
  return null
}

function visualObject(object?: FabricObject | null) {
  if (!object || object.type !== 'group') return object
  return (object as Group).getObjects().find((item) => !item.type?.includes('text')) || object
}

function applyToGroup(object: FabricObject, callback: (item: FabricObject) => void) {
  if (object.type === 'group') (object as Group).getObjects().forEach((item) => callback(item))
  else callback(object)
}

function starPoints(points: number, outer: number, inner: number) {
  return Array.from({ length: points * 2 }, (_, index) => {
    const radius = index % 2 === 0 ? outer : inner
    const angle = -Math.PI / 2 + index * Math.PI / points
    return { x: outer + Math.cos(angle) * radius, y: outer + Math.sin(angle) * radius }
  })
}

function finite(value: unknown, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export function sanitizeObjectTransform(object: FabricObject, canvasWidth: number, canvasHeight: number) {
  const objectWidth = Math.max(1, finite(object.width, 1))
  const objectHeight = Math.max(1, finite(object.height, 1))
  const minScaleX = Math.min(1, 20 / objectWidth)
  const minScaleY = Math.min(1, 20 / objectHeight)
  let scaleX = clamp(Math.abs(finite(object.scaleX, 1)), minScaleX, 20)
  let scaleY = clamp(Math.abs(finite(object.scaleY, 1)), minScaleY, 20)
  const role = (object as any).data?.role
  if (object.type === 'image' || role === 'element') {
    const uniform = clamp(Math.max(scaleX, scaleY), Math.max(minScaleX, minScaleY), 20)
    scaleX = uniform
    scaleY = uniform
  }
  object.set({
    left: clamp(finite(object.left, canvasWidth / 2), -canvasWidth * 2, canvasWidth * 3),
    top: clamp(finite(object.top, canvasHeight / 2), -canvasHeight * 2, canvasHeight * 3),
    scaleX,
    scaleY,
    angle: ((finite(object.angle, 0) % 360) + 360) % 360,
  })
  object.setCoords()
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
  const pinch = useRef<{ distance: number; zoom: number } | null>(null)
  const [brush, setBrushState] = useState<BrushSettings>(brushRef.current)
  const [editorState, setEditorState] = useState<EditorState>(initialState)
  const [cropSrc, setCropSrc] = useState<string | null>(null)
  const [notice, setNotice] = useState('')
  const [guides, setGuides] = useState({ x: false, y: false })
  const [showTips, setShowTips] = useState(() => !window.localStorage.getItem('editor-tips-seen'))

  const refreshState = useCallback((canvas = fabricRef.current) => {
    if (!canvas) return
    const active = canvas.getActiveObject()
    const activeText = textObject(active)
    const activeVisual = visualObject(active) as any
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
      selectionKind: selectionKind(active),
      selectedText: activeText?.text || '',
      selectedFill: typeof activeVisual?.fill === 'string' ? activeVisual.fill : '#5b4bdb',
      selectedStroke: typeof activeVisual?.stroke === 'string' ? activeVisual.stroke : '#25233a',
      selectedFontFamily: activeText?.fontFamily || 'Fredoka',
      selectedFontSize: activeText?.fontSize || 34,
      background: typeof canvas.backgroundColor === 'string' ? canvas.backgroundColor : background,
      layers,
    }))
  }, [background])

  const emitChange = useCallback((recordHistory = true) => {
    const canvas = fabricRef.current
    if (!canvas || loading.current) return
    try {
      canvas.getObjects().forEach((object) => sanitizeObjectTransform(object, width, height))
      const canvasJson = canvas.toJSON()
      const canvasBackground = typeof canvas.backgroundColor === 'string' ? canvas.backgroundColor : background
      const serialized = JSON.stringify({ canvas: canvasJson, background: canvasBackground })
      if (recordHistory && history.current[historyIndex.current] !== serialized) {
        history.current = history.current.slice(0, historyIndex.current + 1)
        history.current.push(serialized)
        historyIndex.current = history.current.length - 1
        if (history.current.length > 60) { history.current.shift(); historyIndex.current -= 1 }
      }
      refreshState(canvas)
      if (changeTimer.current) window.clearTimeout(changeTimer.current)
      changeTimer.current = window.setTimeout(() => {
        try {
          const thumb = canvas.toDataURL({ format: 'webp', quality: 0.72, multiplier: 0.35 })
          onChange(canvasJson, thumb, canvasBackground)
        } catch {
          setNotice('Não foi possível criar a miniatura, mas seu trabalho continua aberto.')
          window.setTimeout(() => setNotice(''), 2800)
        }
      }, 180)
    } catch {
      setNotice('Esse ajuste não pôde ser aplicado. O objeto foi mantido em segurança.')
      window.setTimeout(() => setNotice(''), 2800)
      canvas.requestRenderAll()
    }
  }, [background, height, onChange, refreshState, width])

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
    let restored = false
    try {
      const snapshot = JSON.parse(serialized)
      await canvas.loadFromJSON(snapshot.canvas || snapshot)
      canvas.getObjects().forEach((object) => { setObjectIdentity(object); sanitizeObjectTransform(object, width, height) })
      canvas.backgroundColor = snapshot.background || background
      canvas.renderAll()
      refreshState(canvas)
      restored = true
    } catch {
      setNotice('Não foi possível restaurar essa etapa. O projeto atual foi preservado.')
      window.setTimeout(() => setNotice(''), 2800)
    } finally { loading.current = false }
    if (restored) emitChange(false)
  }, [background, emitChange, height, refreshState, width])

  const addAndSelect = useCallback((object: FabricObject, name?: string) => {
    const canvas = fabricRef.current
    if (!canvas) return
    setObjectIdentity(object, name)
    sanitizeObjectTransform(object, width, height)
    canvas.add(object)
    canvas.setActiveObject(object)
    canvas.renderAll()
    emitChange()
  }, [emitChange, height, width])

  const applyZoom = useCallback((value: number) => {
    const canvas = fabricRef.current
    if (!canvas || !Number.isFinite(value)) return
    const zoom = clamp(value, .2, 3)
    canvas.setDimensions({ width: Math.max(1, width * zoom), height: Math.max(1, height * zoom) })
    canvas.setZoom(zoom)
    canvas.requestRenderAll()
    refreshState(canvas)
  }, [height, refreshState, width])

  const api: CanvasEditorApi = {
    setTool(tool) {
      toolRef.current = tool
      setEditorState((prev) => ({ ...prev, activeTool: tool }))
      const canvas = fabricRef.current
      if (canvas) {
        canvas.selection = tool === 'select'
        canvas.skipTargetFind = tool !== 'select'
        canvas.defaultCursor = tool === 'select' ? 'default' : 'crosshair'
        if (tool !== 'select') canvas.discardActiveObject()
        canvas.renderAll()
      }
      configureBrush(tool)
    },
    addText(text = 'Escreva aqui') {
      api.setTool('select')
      const canvas = fabricRef.current
      const textCount = canvas?.getObjects().filter((object) => object.type?.includes('text') || textObject(object)).length || 0
      const [offsetX, offsetY] = placementOffsets[textCount % placementOffsets.length]
      const textbox = new Textbox(text, { left: width / 2 - 120 + offsetX, top: height / 2 - 40 + offsetY, width: 240, fontSize: 34, fontFamily: 'Fredoka', fill: brushRef.current.color, editable: true })
      addAndSelect(textbox, 'Texto')
      window.setTimeout(() => { textbox.enterEditing(); textbox.selectAll(); textbox.hiddenTextarea?.focus(); refreshState() }, 80)
    },
    addShape(shape) {
      api.setTool('select')
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
    addElement(kind: ElementKind) {
      api.setTool('select')
      const color = brushRef.current.color
      const common = { left: width / 2 - 75, top: height / 2 - 75, fill: color, stroke: '#25233a', strokeWidth: 4 }
      let object: FabricObject
      let name: string
      if (kind === 'circle') { object = new Circle({ ...common, radius: 75 }); name = 'Círculo' }
      else if (kind === 'triangle') { object = new Triangle({ ...common, width: 160, height: 145 }); name = 'Triângulo' }
      else if (kind === 'square' || kind === 'rectangle') { object = new Rect({ ...common, width: kind === 'square' ? 150 : 210, height: 150, rx: 12, ry: 12 }); name = kind === 'square' ? 'Quadrado' : 'Retângulo' }
      else if (kind === 'line') { object = new Line([0, 0, 190, 0], { left: width / 2 - 95, top: height / 2, stroke: color, strokeWidth: 8 }); name = 'Linha' }
      else if (kind === 'arrow') {
        const line = new Line([0, 0, 155, 0], { stroke: color, strokeWidth: 10, originX: 'center', originY: 'center' })
        const head = new Triangle({ width: 32, height: 38, fill: color, left: 88, angle: 90, originX: 'center', originY: 'center' })
        object = new Group([line, head], { left: width / 2 - 95, top: height / 2 }); name = 'Seta'
      } else if (kind === 'star') { object = new Polygon(starPoints(5, 80, 36), common); name = 'Estrela' }
      else if (kind === 'burst') { object = new Polygon(starPoints(12, 92, 62), common); name = 'Explosão' }
      else if (kind === 'heart') { object = new Path('M 100 180 C 20 120 5 70 45 35 C 72 12 100 30 100 56 C 100 30 128 12 155 35 C 195 70 180 120 100 180 Z', common); name = 'Coração' }
      else if (kind === 'lightning') { object = new Path('M 95 0 L 25 105 L 78 105 L 52 205 L 165 70 L 105 70 Z', common); name = 'Raio' }
      else if (kind === 'cloud') { object = new Path('M 42 145 C 5 145 0 100 30 82 C 23 40 78 20 105 50 C 135 10 198 32 194 78 C 238 86 232 145 194 145 Z', common); name = 'Nuvem' }
      else if (kind === 'flame') { object = new Path('M 105 0 C 138 48 86 65 125 98 C 148 72 166 120 158 154 C 151 194 114 215 78 207 C 18 194 12 120 52 76 C 50 118 78 122 75 75 C 73 44 91 24 105 0 Z', common); name = 'Fogo' }
      else if (kind === 'moon') { object = new Path('M 140 10 C 62 30 52 137 132 178 C 70 198 8 155 8 89 C 8 32 69 -8 140 10 Z', common); name = 'Lua' }
      else if (kind === 'sun') {
        const rays = Array.from({ length: 12 }, (_, index) => { const angle = index * 30; return new Rect({ width: 8, height: 38, fill: color, left: 90, top: 90, originX: 'center', originY: 'bottom', angle }) })
        object = new Group([new Circle({ radius: 55, fill: color, left: 35, top: 35 }), ...rays], { left: width / 2 - 90, top: height / 2 - 90 }); name = 'Sol'
      } else {
        const lines = Array.from({ length: 9 }, (_, index) => new Line([0, index * 18, 180 - index * 8, index * 18], { stroke: color, strokeWidth: Math.max(2, 8 - index * .6) }))
        object = new Group(lines, { left: width / 2 - 90, top: height / 2 - 75 }); name = 'Linhas de velocidade'
      }
      ;(object as any).data = { id: crypto.randomUUID(), name, role: 'element' }
      addAndSelect(object, name)
    },
    async addImage(url, storagePath) {
      api.setTool('select')
      const image = await FabricImage.fromURL(url, { crossOrigin: 'anonymous' })
      if (!Number.isFinite(image.width) || !Number.isFinite(image.height) || !image.width || !image.height) throw new Error('A imagem recebida possui dimensões inválidas.')
      const max = Math.min(width * .55 / (image.width || 1), height * .55 / (image.height || 1), 1)
      image.set({ left: width / 2, top: height / 2, originX: 'center', originY: 'center', scaleX: max, scaleY: max })
      ;(image as any).data = { id: crypto.randomUUID(), name: 'Imagem', storagePath }
      addAndSelect(image, 'Imagem')
    },
    addBubble(kind) {
      api.setTool('select')
      const fill = '#ffffff', stroke = '#25233a'
      let objects: FabricObject[]
      if (kind === 'narration') objects = [new Rect({ width: 300, height: 110, rx: 8, ry: 8, fill: '#fff6c7', stroke, strokeWidth: 4 }), new Textbox('Narração...', { width: 260, left: 20, top: 22, fontSize: 26, textAlign: 'center', fontFamily: 'Fredoka' })]
      else if (kind === 'rounded' || kind === 'rectangle') objects = [new Rect({ width: 300, height: 125, rx: kind === 'rounded' ? 42 : 4, ry: kind === 'rounded' ? 42 : 4, fill, stroke, strokeWidth: 4 }), new Textbox('Escreva...', { width: 260, left: 20, top: 35, fontSize: 27, textAlign: 'center', fontFamily: 'Fredoka' })]
      else if (kind === 'thought') objects = [new Circle({ radius: 90, scaleX: 1.6, fill, stroke, strokeWidth: 4 }), new Circle({ radius: 16, left: 25, top: 180, fill, stroke, strokeWidth: 3 }), new Circle({ radius: 9, left: 5, top: 215, fill, stroke, strokeWidth: 3 }), new Textbox('Pensando...', { width: 240, left: -30, top: 60, fontSize: 26, textAlign: 'center', fontFamily: 'Fredoka' })]
      else if (kind === 'shout') {
        const points = Array.from({ length: 20 }, (_, i) => { const a = i * Math.PI / 10; const r = i % 2 ? 105 : 145; return { x: Math.cos(a) * r + 145, y: Math.sin(a) * r + 145 } })
        objects = [new Polygon(points, { fill, stroke, strokeWidth: 4 }), new Textbox('GRITO!', { width: 210, left: 40, top: 110, fontSize: 32, fontWeight: 'bold', textAlign: 'center', fontFamily: 'Impact' })]
      } else objects = [new Path('M 20 20 Q 20 0 45 0 L 250 0 Q 280 0 280 25 L 280 110 Q 280 140 250 140 L 100 140 L 55 185 L 70 140 L 45 140 Q 20 140 20 115 Z', { fill, stroke, strokeWidth: 4 }), new Textbox('Olá!', { width: 220, left: 40, top: 45, fontSize: 30, textAlign: 'center', fontFamily: 'Fredoka' })]
      const bubble = new Group(objects, { left: width / 2 - 145, top: height / 2 - 100 })
      ;(bubble as any).data = { id: crypto.randomUUID(), name: kind === 'narration' ? 'Caixa de narração' : 'Balão', role: 'bubble' }
      addAndSelect(bubble, kind === 'narration' ? 'Caixa de narração' : 'Balão')
    },
    addEffect(text) {
      api.setTool('select')
      const effect = new Textbox(text, { left: width / 2 - 120, top: height / 2 - 50, width: 260, fontSize: 70, fontFamily: 'Bangers', fontWeight: 'bold', textAlign: 'center', fill: '#ffcc33', stroke: '#25233a', strokeWidth: 3, shadow: new Shadow({ color: '#ff5a66', offsetX: 5, offsetY: 6 }), angle: -8 })
      ;(effect as any).data = { id: crypto.randomUUID(), name: 'Efeito', role: 'effect' }
      addAndSelect(effect, 'Efeito')
    },
    addPanel() {
      api.setTool('select')
      const panel = new Rect({ left: width / 2 - width * .3, top: height / 2 - height * .22, width: width * .6, height: height * .44, fill: '#ffffff', stroke: '#25233a', strokeWidth: 7, rx: 3, ry: 3 })
      ;(panel as any).data = { id: crypto.randomUUID(), name: 'Quadro', role: 'panel' }
      addAndSelect(panel, 'Quadro')
      fabricRef.current?.sendObjectToBack(panel)
      fabricRef.current?.renderAll()
      emitChange()
    },
    addPanelLayout(count) {
      api.setTool('select')
      const currentCanvas = fabricRef.current
      loading.current = true
      currentCanvas?.getObjects().filter((object) => (object as any).data?.role === 'panel').forEach((object) => currentCanvas.remove(object))
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
      loading.current = false
      currentCanvas?.renderAll()
      emitChange()
    },
    setBackground(color) {
      const canvas = fabricRef.current
      if (!canvas) return
      canvas.backgroundColor = color
      canvas.renderAll()
      emitChange()
    },
    editSelectedText() {
      const active = fabricRef.current?.getActiveObject()
      const text = textObject(active)
      if (active?.type?.includes('text') && text) window.setTimeout(() => { text.enterEditing(); text.selectAll(); text.hiddenTextarea?.focus() }, 40)
    },
    finishTextEditing() {
      const canvas = fabricRef.current
      const active = canvas?.getActiveObject()
      const text = textObject(active)
      if (!canvas || !active || !text) return
      if (text.isEditing) text.exitEditing()
      canvas.setActiveObject(active)
      active.setCoords()
      canvas.requestRenderAll()
      refreshState(canvas)
      emitChange()
    },
    updateSelectedText(value) {
      const canvas = fabricRef.current
      const active = canvas?.getActiveObject()
      const text = textObject(active)
      if (!canvas || !active || !text) return
      text.set({ text: value })
      if (active.type === 'group') active.set({ dirty: true })
      active.setCoords()
      canvas.renderAll()
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
    zoomIn() { const c = fabricRef.current; if (c) applyZoom(c.getZoom() + .1) },
    zoomOut() { const c = fabricRef.current; if (c) applyZoom(c.getZoom() - .1) },
    fit() { const el = wrapper.current; if (!el) return; applyZoom(Math.min((el.clientWidth - 32) / width, (el.clientHeight - 32) / height, 1)) },
    setBrush(settings) { brushRef.current = settings; setBrushState(settings); configureBrush() },
    updateSelected(settings: SelectionSettings) {
      const canvas = fabricRef.current
      const object = canvas?.getActiveObject()
      if (!canvas || !object) return
      const text = textObject(object) as any
      const visual = visualObject(object) as any
      if (settings.color && text) text.set({ fill: settings.color })
      else if (settings.color) applyToGroup(object, (item) => item.set({ fill: settings.color, stroke: item.type === 'path' || item.type === 'line' ? settings.color : item.stroke }))
      if (settings.fillColor) applyToGroup(object, (item) => { if (item.type === 'line') item.set({ stroke: settings.fillColor }); else if (!item.type?.includes('text')) item.set({ fill: settings.fillColor }) })
      if (settings.strokeColor) applyToGroup(object, (item) => { if (!item.type?.includes('text')) item.set({ stroke: settings.strokeColor }) })
      if (settings.opacity != null) object.set({ opacity: settings.opacity })
      if (text) {
        if (settings.fontSize) text.set({ fontSize: settings.fontSize })
        if (settings.fontFamily) text.set({ fontFamily: settings.fontFamily })
        if (settings.bold) text.set({ fontWeight: text.fontWeight === 'bold' ? 'normal' : 'bold' })
        if (settings.italic) text.set({ fontStyle: text.fontStyle === 'italic' ? 'normal' : 'italic' })
        if (settings.textAlign) text.set({ textAlign: settings.textAlign })
      } else if (visual && settings.fillColor) visual.set({ fill: settings.fillColor })
      if (object.type === 'group') object.set({ dirty: true })
      object.setCoords(); canvas.renderAll(); emitChange()
    },
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
      canvas.backgroundColor = background; canvas.getObjects().forEach((o) => { setObjectIdentity(o); sanitizeObjectTransform(o, width, height) }); canvas.renderAll(); loading.current = false
      const first = JSON.stringify({ canvas: canvas.toJSON(), background }); history.current = [first]; historyIndex.current = 0; refreshState(canvas); window.setTimeout(() => api.fit(), 0)
    }).catch(() => {
      loading.current = false
      canvas.clear()
      canvas.backgroundColor = background
      canvas.renderAll()
      setNotice('O canvas salvo tinha dados inválidos. Abrimos uma página segura para você continuar.')
    })
    const changed = () => emitChange()
    const selection = () => refreshState(canvas)
    const protect = (handler: (event: any) => void) => (event: any) => {
      try { handler(event) }
      catch {
        setNotice('Esse gesto foi interrompido para proteger o projeto.')
        window.setTimeout(() => setNotice(''), 2400)
        canvas.requestRenderAll()
      }
    }
    canvas.on('object:added', changed); canvas.on('object:removed', changed); canvas.on('path:created', protect((event: any) => { if (event.path) { setObjectIdentity(event.path, toolRef.current === 'eraser' ? 'Borracha' : 'Traço'); if (toolRef.current === 'eraser') event.path.set({ globalCompositeOperation: 'destination-out' }) } changed() }))
    canvas.on('selection:created', selection); canvas.on('selection:updated', selection); canvas.on('selection:cleared', selection); canvas.on('text:changed', () => { refreshState(canvas); changed() })
    canvas.on('object:scaling', protect((event: any) => { if (event.target) { sanitizeObjectTransform(event.target, width, height); canvas.requestRenderAll() } }))
    canvas.on('object:rotating', protect((event: any) => { if (event.target) sanitizeObjectTransform(event.target, width, height) }))
    canvas.on('object:moving', protect((event: any) => {
      const object = event.target as FabricObject | undefined
      if (!object) return
      sanitizeObjectTransform(object, width, height)
      const center = object.getCenterPoint()
      const nearX = Math.abs(center.x - width / 2) < 14
      const nearY = Math.abs(center.y - height / 2) < 14
      if (nearX || nearY) object.setPositionByOrigin(new Point(nearX ? width / 2 : center.x, nearY ? height / 2 : center.y), 'center', 'center')
      setGuides((current) => current.x === nearX && current.y === nearY ? current : { x: nearX, y: nearY })
    }))
    canvas.on('object:modified', protect((event: any) => { if (event.target) sanitizeObjectTransform(event.target, width, height); setGuides({ x: false, y: false }); changed() }))
    const touchDistance = (event: TouchEvent) => event.touches.length >= 2 ? Math.hypot(event.touches[0].clientX - event.touches[1].clientX, event.touches[0].clientY - event.touches[1].clientY) : 0
    const touchStart = (event: TouchEvent) => {
      if (event.touches.length !== 2) return
      const distance = touchDistance(event)
      if (!Number.isFinite(distance) || distance < 2) return
      pinch.current = { distance, zoom: canvas.getZoom() }
      canvas.isDrawingMode = false
      event.preventDefault()
    }
    const touchMove = (event: TouchEvent) => {
      if (event.touches.length !== 2 || !pinch.current) return
      const distance = touchDistance(event)
      if (!Number.isFinite(distance) || pinch.current.distance < 2) return
      applyZoom(pinch.current.zoom * distance / pinch.current.distance)
      event.preventDefault()
    }
    const touchEnd = () => { if (pinch.current) { pinch.current = null; configureBrush() } }
    canvas.upperCanvasEl.addEventListener('touchstart', touchStart, { passive: false })
    canvas.upperCanvasEl.addEventListener('touchmove', touchMove, { passive: false })
    canvas.upperCanvasEl.addEventListener('touchend', touchEnd)
    const resize = () => api.fit(); window.addEventListener('resize', resize)
    return () => {
      window.removeEventListener('resize', resize)
      canvas.upperCanvasEl.removeEventListener('touchstart', touchStart)
      canvas.upperCanvasEl.removeEventListener('touchmove', touchMove)
      canvas.upperCanvasEl.removeEventListener('touchend', touchEnd)
      if (changeTimer.current) window.clearTimeout(changeTimer.current); canvas.dispose(); fabricRef.current = null
    }
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

  const updateBrush = (next: BrushSettings) => { brushRef.current = next; setBrushState(next); api.setBrush(next) }
  const crop = () => { const src = api.getSelectedImageUrl(); if (src) setCropSrc(src); else { setNotice('Selecione uma imagem para recortar.'); window.setTimeout(() => setNotice(''), 2600) } }
  const closeTips = () => { window.localStorage.setItem('editor-tips-seen', '1'); setShowTips(false) }

  return <div className="editor-grid">
    <Toolbar api={api} state={editorState} brush={brush} onBrush={updateBrush} onImageInsert={async (result) => api.addImage(result.url, result.storagePath)} onUpload={() => document.getElementById('editor-upload')?.click()} onCrop={crop} onBackground={(color) => api.setBackground(color)} comic={comic} />
    <div className="canvas-viewport" ref={wrapper}>
      <div className="canvas-stage-layer">
        <div className="canvas-shadow"><canvas ref={canvasElement} /></div>
        {guides.x && <i className="alignment-guide vertical" />}
        {guides.y && <i className="alignment-guide horizontal" />}
      </div>
      {notice && <div className="canvas-notice">{notice}</div>}
    </div>
    {cropSrc && <ImageCropperModal src={cropSrc} onCancel={() => setCropSrc(null)} onApply={async (url) => { await api.replaceSelectedImage(url); setCropSrc(null) }} />}
    {showTips && <div className="first-use-tips"><strong>Três dicas rápidas</strong><span>Toque em <b>Adicionar</b> para colocar texto, imagem ou balão.</span><span>Use <b>Selecionar</b> para mover os objetos.</span><span>Use dois dedos para ampliar a página.</span><button onClick={closeTips}>Entendi</button></div>}
  </div>
}
