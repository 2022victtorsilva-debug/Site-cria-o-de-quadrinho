import { ExternalLink, Search, LoaderCircle, Plus, X } from 'lucide-react'
import { useState } from 'react'
import { persistRemoteImage, requestImages } from '../services/imageService'
import type { AIImageResult } from '../types/project'

type Props = { onClose: () => void; onInsert: (result: AIImageResult) => Promise<void> }

export function ImageSearchPanel({ onClose, onInsert }: Props) {
  const [prompt, setPrompt] = useState('')
  const [results, setResults] = useState<AIImageResult[]>([])
  const [loading, setLoading] = useState(false)
  const [inserting, setInserting] = useState<string | null>(null)
  const [error, setError] = useState('')

  const submit = async () => {
    if (prompt.trim().length < 2) return setError('Escreva o que você quer encontrar.')
    setLoading(true); setError(''); setResults([])
    try { setResults(await requestImages(prompt.trim())) }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível pesquisar imagens.') }
    finally { setLoading(false) }
  }

  const insert = async (result: AIImageResult) => {
    setInserting(result.id); setError('')
    try { await onInsert(await persistRemoteImage(result)); onClose() }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível inserir a imagem.') }
    finally { setInserting(null) }
  }

  return <aside className="side-panel ai-panel">
    <div className="panel-heading"><div><span className="panel-kicker">Três opções da internet</span><h2>Pesquisar imagens</h2></div><button className="icon-button" onClick={onClose} aria-label="Fechar pesquisa de imagens"><X /></button></div>
    <label className="prompt-field"><span>O que você quer encontrar?</span><textarea value={prompt} maxLength={400} onChange={(event) => setPrompt(event.target.value)} placeholder="Ex.: dragão voando, castelo, cachorro..." /></label>
    <button className="button primary full" disabled={loading} onClick={submit}>{loading ? <><LoaderCircle className="spin" />Buscando 3 opções...</> : <><Search />Pesquisar imagem</>}</button>
    {error && <div className="inline-error" role="alert">{error}<button onClick={submit}>Tentar novamente</button></div>}
    {results.length > 0 && <div className="ai-results" aria-live="polite">{results.map((result, index) => <article key={result.id} className="ai-result">
      <div className="result-image"><img src={result.thumbUrl || result.url} alt={result.title || `Opção ${index + 1}`} /><span>Opção {index + 1}</span></div>
      <div className="result-actions"><button className="button primary small" disabled={Boolean(inserting)} onClick={() => insert(result)}>{inserting === result.id ? <LoaderCircle className="spin" /> : <Plus />}Inserir</button>{result.sourceUrl && <a href={result.sourceUrl} target="_blank" rel="noreferrer" title="Ver origem"><ExternalLink /></a>}</div>
      {(result.source || result.license) && <small className="source-line">{[result.source, result.license].filter(Boolean).join(' · ')}</small>}
    </article>)}</div>}
  </aside>
}
