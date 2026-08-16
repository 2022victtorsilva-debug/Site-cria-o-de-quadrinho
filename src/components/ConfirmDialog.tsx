import { AlertTriangle, X } from 'lucide-react'

type Props = { title: string; message: string; confirmLabel?: string; onConfirm: () => void; onClose: () => void }

export function ConfirmDialog({ title, message, confirmLabel = 'Excluir', onConfirm, onClose }: Props) {
  return <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
    <div className="dialog" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" onMouseDown={(e) => e.stopPropagation()}>
      <button className="icon-button dialog-close" onClick={onClose} aria-label="Fechar"><X /></button>
      <div className="danger-icon"><AlertTriangle /></div>
      <h2 id="confirm-title">{title}</h2>
      <p>{message}</p>
      <div className="dialog-actions"><button className="button ghost" onClick={onClose}>Cancelar</button><button className="button danger" onClick={onConfirm}>{confirmLabel}</button></div>
    </div>
  </div>
}
