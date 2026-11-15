import { useRef, type Ref } from 'react'
import { useMagnetic } from '../motion/useMagnetic'
import type { Project } from '../data/projects'

interface PlaqueProps {
  project: Project
  onSheet: () => void
  /** Só nome e links, sobre o print (composição vitrine). */
  overlay?: boolean
  /** Sombra no texto pra ler por cima do print. */
  shadow?: boolean
  /** Centralizado (composição celular). */
  center?: boolean
  /** Só com mídia em vídeo e aparelho que mostra poster: botão pra tocar mesmo assim. */
  onMotion?: () => void
  blockRef?: Ref<HTMLDivElement>
  className?: string
  /** Tela por dentro aberta (null: a principal). */
  active?: string | null
  onView?: (id: string | null) => void
}

/**
 * Texto do projeto. Cada filho direto entra e sai em stagger (controlado pelo palco da seção).
 * Os dois links são botões de verdade: 44px de altura, magnéticos.
 */
export function Plaque({
  project,
  onSheet,
  overlay = false,
  shadow = false,
  center = false,
  onMotion,
  blockRef,
  className = '',
  active = null,
  onView,
}: PlaqueProps) {
  const liveRef = useRef<HTMLAnchorElement>(null)
  const sheetRef = useRef<HTMLButtonElement>(null)
  useMagnetic(liveRef)
  useMagnetic(sheetRef)

  const textShadow = shadow ? { textShadow: 'var(--shadow-text)' } : undefined

  return (
    <div ref={blockRef} className={className}>
      {!overlay && (
        <p className="font-mono text-[11px] text-muted md:text-xs" style={textShadow}>
          <span style={{ color: 'var(--accent)' }}>{project.kind}</span> · {project.city} · {project.delivered}
        </p>
      )}
      <h3
        className={`font-display leading-[0.84] uppercase ${
          overlay ? 'text-[11vw] md:text-[min(5.2vw,11svh)]' : 'mt-2 text-[11vw] md:mt-4 md:text-[min(4.6vw,9.5svh)]'
        }`}
        style={textShadow}
      >
        {project.name}
      </h3>
      {!overlay && (
        <p className="mt-2 text-base leading-snug text-bone md:mt-5 md:text-lg" style={textShadow}>
          {project.line}
        </p>
      )}
      {overlay && (
        // Por cima do print, só no celular: uma linha curta do que é (no desktop o nome basta).
        <p className="mt-1.5 line-clamp-2 text-[15px] leading-snug text-bone md:hidden" style={textShadow}>
          {project.line}
        </p>
      )}
      {!overlay && (
        <p className="mt-2 font-mono text-[11px] text-muted md:mt-3 md:text-xs" style={textShadow}>
          {project.stack.join(' · ')}
        </p>
      )}
      <div
        className={`mt-4 flex items-center font-mono text-xs md:mt-7 md:text-sm ${
          // Por cima do print os dois botões ficam na mesma linha, mais justos: empilhados eles subiam o bloco até o meio do print.
          overlay ? 'flex-nowrap gap-2 [&>*]:whitespace-nowrap [&>*]:px-3.5 md:gap-3 md:[&>*]:px-5' : 'flex-wrap gap-3'
        } ${center ? 'justify-center' : ''}`}
      >
        <a
          ref={liveRef}
          href={project.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center gap-2 rounded-[3px] px-5 font-bold text-bg"
          style={{ backgroundColor: 'var(--accent)' }}
        >
          ver no ar <span aria-hidden>↗</span>
        </a>
        <button
          ref={sheetRef}
          type="button"
          onClick={onSheet}
          className="inline-flex min-h-11 items-center rounded-[3px] px-5 text-bone"
          style={{ border: '1px solid var(--accent)', backgroundColor: 'var(--button-ghost)' }}
        >
          ficha técnica
        </button>
        {onMotion && (
          <button type="button" onClick={onMotion} className="inline-flex min-h-11 items-center px-2 text-muted underline underline-offset-4">
            ver em movimento
          </button>
        )}
      </div>
      {project.views.length > 0 && onView && (
        <div className={`mt-3 md:mt-5 ${center ? 'flex flex-col items-center' : ''}`}>
          <div
            role="group"
            aria-label={`${project.name} por dentro`}
            className={`no-scrollbar -mx-1 flex items-center gap-1.5 overflow-x-auto px-1 font-mono text-[11px] md:mx-0 md:flex-wrap md:gap-2 md:overflow-visible md:px-0 md:text-xs ${center ? 'md:justify-center' : ''}`}
          >
            <span className="mr-1 shrink-0 text-muted" style={textShadow}>
              por dentro
            </span>
            {[{ id: null as string | null, label: project.mainLabel }, ...project.views].map((v) => {
              const on = v.id === active
              return (
                <button
                  key={v.id ?? 'principal'}
                  type="button"
                  aria-pressed={on}
                  onClick={() => !on && onView(v.id)}
                  className="inline-flex min-h-9 shrink-0 items-center rounded-full px-3 transition-[background-color,color] duration-200"
                  style={
                    on
                      ? { backgroundColor: 'var(--accent)', color: 'var(--c-bg)', border: '1px solid var(--accent)' }
                      : { border: '1px solid color-mix(in srgb, var(--accent) 55%, transparent)', backgroundColor: 'var(--button-ghost)' }
                  }
                >
                  {v.label}
                </button>
              )
            })}
          </div>
          {!overlay && (
            <p aria-live="polite" className="mt-2 hidden min-h-[2.6em] max-w-[34ch] text-sm leading-snug text-muted md:block" style={textShadow}>
              {project.views.find((v) => v.id === active)?.caption ?? ''}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
