import { ExternalLink, LoaderCircle, Plus, Search } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { persistRemoteImage, requestImages } from '../services/imageService'
import type { AIImageResult } from '../types/project'

type Props = { onComplete: () => void; onInsert: (result: AIImageResult) => Promise<void> }

export function ImageSearchPanel({ onComplete, onInsert }: Props) {
  const [prompt, setPrompt] = useState('')
  const [searchedPrompt, setSearchedPrompt] = useState('')
  const [results, setResults] = useState<AIImageResult[]>([])
  const [loading, setLoading] = useState(false)
  const [inserting, setInserting] = useState<string | null>(null)
  const [error, setError] = useState('')

  const submit = async (event?: FormEvent) => {
    event?.preventDefault()
    const query = prompt.trim().replace(/\s+/g, ' ')
    if (query.length < 2) return setError('Escreva o que você quer encontrar.')
    setLoading(true); setError(''); setResults([]); setSearchedPrompt(query)
    try {
      const images = await requestImages(query)
      setResults(images)
      if (images.length === 0) setError('Não encontramos imagens relevantes para essa pesquisa.')
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível pesquisar imagens.') }
    finally { setLoading(false) }
  }

  const insert = async (result: AIImageResult) => {
    setInserting(result.id); setError('')
    try { await onInsert(await persistRemoteImage(result)); onComplete() }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível inserir a imagem.') }
    finally { setInserting(null) }
  }

  return <div className="image-search-content">
    <p className="drawer-help">A pesquisa usa o pedido completo e mostra somente resultados considerados relevantes.</p>
    <form className="image-search-form" onSubmit={submit}>
      <label className="prompt-field"><span>O que você quer encontrar?</span><input value={prompt} maxLength={400} onChange={(event) => setPrompt(event.target.value)} placeholder="Ex.: dragão voando, castelo medieval..." /></label>
      <button className="button primary" disabled={loading} type="submit">{loading ? <><LoaderCircle className="spin" />Buscando...</> : <><Search />Pesquisar</>}</button>
    </form>
    {searchedPrompt && !loading && <small className="search-query-label">Pesquisa: “{searchedPrompt}”</small>}
    {error && <div className="inline-error" role="alert"><span>{error}</span><button type="button" onClick={() => void submit()}>Tentar novamente</button></div>}
    {results.length > 0 && <div className="ai-results" aria-live="polite">{results.map((result, index) => <article key={result.id} className="ai-result">
      <div className="result-image"><img src={result.thumbUrl || result.url} alt={result.title || `Opção ${index + 1}`} /><span>Opção {index + 1}</span></div>
      <div className="result-copy"><strong>{result.title || `Imagem ${index + 1}`}</strong><small>{[result.source, result.license].filter(Boolean).join(' · ') || 'Origem disponível'}</small></div>
      <div className="result-actions"><button className="button primary small" disabled={Boolean(inserting)} onClick={() => void insert(result)}>{inserting === result.id ? <LoaderCircle className="spin" /> : <Plus />}Inserir</button>{result.sourceUrl && <a href={result.sourceUrl} target="_blank" rel="noreferrer" title="Ver origem"><ExternalLink /></a>}</div>
    </article>)}</div>}
  </div>
}
