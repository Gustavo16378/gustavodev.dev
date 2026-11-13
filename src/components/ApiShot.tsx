import type { ApiShot as Shot } from '../data/projects'

/** Pinta uma linha de JSON ou de rota: chave, texto, método e comentário em tons diferentes. */
function Line({ text }: { text: string }) {
  if (text.startsWith('#')) return <span className="text-muted">{text}</span>
  const route = /^(GET|POST|PUT|PATCH|DELETE)(\s+)(.*)$/.exec(text)
  if (route) {
    return (
      <>
        <span style={{ color: 'var(--accent)' }}>{route[1]}</span>
        {route[2]}
        <span className="text-bone">{route[3]}</span>
      </>
    )
  }
  // JSON: "chave": em acento, "texto" claro, o resto apagado.
  const parts = text.split(/("(?:[^"\\]|\\.)*"\s*:?)/g)
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith('"') ? (
          <span key={i} style={p.trimEnd().endsWith(':') ? { color: 'var(--accent)' } : undefined} className="text-bone">
            {p}
          </span>
        ) : (
          <span key={i} className="text-muted">
            {p}
          </span>
        ),
      )}
    </>
  )
}

/**
 * Tela "api" dentro do frame: um terminal com a requisição e o que voltou. O tamanho do texto acompanha a
 * largura do frame (unidade cqw), então cabe igual no frame do desktop e no do celular.
 */
export function ApiShot({ shot, phone }: { shot: Shot; phone: boolean }) {
  return (
    <div
      className="flex size-full flex-col bg-[var(--c-terminal)] font-mono leading-[1.55]"
      style={{ fontSize: phone ? 'max(7px, 3.6cqw)' : 'max(7px, 1.25cqw)', padding: phone ? '7cqw 6cqw' : '3.2cqw 4cqw' }}
    >
      <div className="flex items-center gap-[0.8em] pb-[1.2em]" style={{ borderBottom: '1px solid var(--c-border)' }}>
        <span aria-hidden className="flex gap-[0.45em]">
          {[0, 1, 2].map((k) => (
            <span key={k} className="inline-block size-[0.7em] rounded-full bg-[var(--c-border)]" />
          ))}
        </span>
        <span className="min-w-0 truncate text-bone">{shot.request}</span>
        <span className="ml-auto shrink-0" style={{ color: 'var(--accent)' }}>
          {shot.status}
        </span>
      </div>
      <pre className="mt-[1.2em] min-h-0 flex-1 overflow-hidden whitespace-pre-wrap">
        {shot.lines.map((l, i) => (
          <div key={i}>
            <Line text={l} />
          </div>
        ))}
      </pre>
    </div>
  )
}
