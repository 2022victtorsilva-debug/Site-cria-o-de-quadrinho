import { Check, CloudOff, LoaderCircle } from 'lucide-react'
import type { SaveState } from '../types/project'

export function SaveStatus({ state }: { state: SaveState }) {
  const content = {
    local: [CloudOff, 'Rascunho local'],
    saving: [LoaderCircle, 'Salvando...'],
    saved: [Check, 'Salvo ✓'],
    error: [CloudOff, 'Salvo neste aparelho'],
  } as const
  const [Icon, label] = content[state]
  return <span className={`save-status save-${state}`}><Icon size={15} className={state === 'saving' ? 'spin' : ''} />{label}</span>
}
