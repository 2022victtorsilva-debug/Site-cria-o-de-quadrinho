import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Component, type ReactNode } from 'react'

type Props = { children: ReactNode; resetKey: string }
type State = { failed: boolean }

export class EditorErrorBoundary extends Component<Props, State> {
  state: State = { failed: false }

  static getDerivedStateFromError(): State {
    return { failed: true }
  }

  componentDidUpdate(previous: Props) {
    if (previous.resetKey !== this.props.resetKey && this.state.failed) this.setState({ failed: false })
  }

  render() {
    if (!this.state.failed) return this.props.children
    return <div className="editor-recovery" role="alert"><AlertTriangle /><h2>O editor encontrou um ajuste inválido</h2><p>Seu projeto continua salvo. Reabra o canvas para continuar.</p><button className="button primary" onClick={() => this.setState({ failed: false })}><RefreshCw />Reabrir editor</button></div>
  }
}
