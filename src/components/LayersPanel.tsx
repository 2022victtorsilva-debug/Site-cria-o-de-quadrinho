import { ChevronDown, ChevronUp, Eye, EyeOff, GripVertical, Lock, Unlock, X } from 'lucide-react'
import type { CanvasEditorApi, EditorState } from '../editors/editorApi'

export function LayersPanel({ api, state, onClose }: { api: CanvasEditorApi | null; state: EditorState; onClose: () => void }) {
  return <aside className="side-panel layers-panel">
    <div className="panel-heading"><div><span className="panel-kicker">Organização</span><h2>Camadas</h2></div><button className="icon-button" onClick={onClose} aria-label="Fechar camadas"><X /></button></div>
    <p className="panel-help">Os itens do topo aparecem na frente.</p>
    <div className="layer-list">
      {state.layers.length ? state.layers.map((layer) => <button key={layer.id} className="layer-row" onClick={() => api?.selectLayer(layer.id)}>
        <GripVertical className="layer-grip" />
        <span className="layer-icon">{layer.name.slice(0, 1)}</span>
        <span className="layer-name"><strong>{layer.name}</strong><small>{layer.type}</small></span>
        <span className="layer-actions" onClick={(e) => e.stopPropagation()}>
          <span role="button" tabIndex={0} title={layer.visible ? 'Ocultar' : 'Mostrar'} onClick={() => api?.toggleLayerVisible(layer.id)}>{layer.visible ? <Eye /> : <EyeOff />}</span>
          <span role="button" tabIndex={0} title={layer.locked ? 'Desbloquear' : 'Bloquear'} onClick={() => api?.toggleLayerLock(layer.id)}>{layer.locked ? <Lock /> : <Unlock />}</span>
          <span role="button" tabIndex={0} title="Subir" onClick={() => api?.moveLayer(layer.id, 'up')}><ChevronUp /></span>
          <span role="button" tabIndex={0} title="Descer" onClick={() => api?.moveLayer(layer.id, 'down')}><ChevronDown /></span>
        </span>
      </button>) : <div className="panel-empty">Adicione texto, formas ou imagens para ver as camadas.</div>}
    </div>
  </aside>
}
