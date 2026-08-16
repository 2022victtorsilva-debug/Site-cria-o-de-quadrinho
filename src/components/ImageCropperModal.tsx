import { Crop, X } from 'lucide-react'
import { useRef } from 'react'
import { Cropper, type ReactCropperElement } from 'react-cropper'
import 'cropperjs/dist/cropper.css'

type Props = { src: string; onCancel: () => void; onApply: (dataUrl: string) => void }

export function ImageCropperModal({ src, onCancel, onApply }: Props) {
  const ref = useRef<ReactCropperElement>(null)
  return <div className="modal-backdrop crop-backdrop" onMouseDown={onCancel}>
    <div className="crop-dialog" role="dialog" aria-modal="true" aria-label="Recortar imagem" onMouseDown={(e) => e.stopPropagation()}>
      <div className="panel-heading"><div><span className="panel-kicker">Ajuste a área</span><h2>Recortar imagem</h2></div><button className="icon-button" onClick={onCancel}><X /></button></div>
      <div className="crop-area"><Cropper ref={ref} src={src} viewMode={1} guides background={false} responsive autoCropArea={0.85} /></div>
      <div className="dialog-actions"><button className="button ghost" onClick={onCancel}>Cancelar</button><button className="button primary" onClick={() => { const canvas = ref.current?.cropper.getCroppedCanvas({ maxWidth: 2400, maxHeight: 2400 }); if (canvas) onApply(canvas.toDataURL('image/png')) }}><Crop />Aplicar recorte</button></div>
    </div>
  </div>
}
