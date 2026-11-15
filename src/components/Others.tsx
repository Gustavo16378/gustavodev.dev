import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import { Draggable, gsap } from '../motion/gsap'
import { prefersReducedMotion } from '../motion/reducedMotion'
import { useScrollSkew } from '../motion/useScrollSkew'
import { useMagnetic } from '../motion/useMagnetic'
import { otherProjects, type OtherPrint, type OtherProject } from '../data/projects'
import { SectionChrome } from './SectionChrome'

const initials = (name: string) =>
  name
    .split(' ')
    .filter((w) => w.length > 2)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()

const srcSet = (p: OtherPrint) => p.sizes.map(([w, src]) => `${src} ${w}w`).join(', ')

function PrintImage({ print, alt, sizes }: { print: OtherPrint; alt: string; sizes: string }) {
  return (
    <picture>
      <source srcSet={srcSet(print)} sizes={sizes} type="image/webp" />
      <img
        src={print.png}
        alt={alt}
        width={print.width}
        height={print.height}
        loading="lazy"
        decoding="async"
        draggable={false}
        className="block size-full object-cover object-top select-none"
      />
    </picture>
  )
}

const frame: CSSProperties = { border: '1px solid var(--c-border)', boxShadow: 'var(--shadow-frame)' }

/** Cartão da faixa: print do desktop com o do celular sobreposto no canto; sem print, o código. */
function Card({ project }: { project: OtherProject }) {
  const { prints } = project
  if (!prints) {
    return (
      <div className="relative flex aspect-[16/10] w-full flex-col justify-between overflow-hidden rounded-[6px] bg-[var(--c-terminal)] p-[6%] font-mono" style={frame}>
        <span className="text-[clamp(11px,1.1vw,15px)] text-muted">
          <span className="text-acid">$</span> git clone {project.repo?.replace('https://', '')}
        </span>
        <span className="font-display text-[clamp(64px,9vw,150px)] leading-none text-bone">{initials(project.name)}</span>
        <span className="text-[clamp(11px,1vw,14px)] text-muted">{project.stack.join(' · ')}</span>
      </div>
    )
  }
  return (
    <div className="relative">
      <div className="aspect-[16/10] w-full overflow-hidden rounded-[6px] bg-surface" style={frame}>
        <PrintImage print={prints.desktop} alt={`${project.name} no desktop`} sizes="(min-width: 768px) 46vw, 80vw" />
      </div>
      <div
        className="absolute right-[-3%] bottom-[-8%] aspect-[480/1039] w-[19%] overflow-hidden rounded-[10px] bg-surface"
        style={frame}
      >
        <PrintImage print={prints.mobile} alt={`${project.name} no celular`} sizes="(min-width: 768px) 9vw, 16vw" />
      </div>
    </div>
  )
}

/** Texto do projeto do meio, embaixo da faixa. */
function Details({ project }: { project: OtherProject }) {
  const liveRef = useRef<HTMLAnchorElement>(null)
  const repoRef = useRef<HTMLAnchorElement>(null)
  useMagnetic(liveRef)
  useMagnetic(repoRef)
  return (
    <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] md:gap-12">
      <div data-reveal>
        <p className="font-mono text-[11px] text-muted md:text-xs">
          <span className="text-acid">{project.kind}</span> · {project.year}
        </p>
        <h3 className="mt-2 font-display text-[12vw] leading-[0.86] uppercase md:text-[4.4vw]">{project.name}</h3>
        <p className="mt-2 text-base leading-snug text-bone md:text-lg">{project.line}</p>
      </div>
      <div data-reveal className="flex flex-col gap-4">
        {project.about.map((p) => (
          <p key={p} className="max-w-[40rem] text-[15px] leading-snug text-muted md:text-base">
            {p}
          </p>
        ))}
        {project.stack.length > 0 && <p className="font-mono text-[11px] text-muted md:text-xs">{project.stack.join(' · ')}</p>}
        <div className="flex flex-wrap gap-3 font-mono text-xs md:text-sm">
          {project.url && (
            <a
              ref={liveRef}
              href={project.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center gap-2 rounded-[3px] bg-acid px-5 font-bold text-bg"
            >
              ver no ar <span aria-hidden>↗</span>
            </a>
          )}
          {project.repo && (
            <a
              ref={repoRef}
              href={project.repo}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center rounded-[3px] border border-acid px-5 text-bone"
            >
              código
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

const pad = (n: number) => String(n).padStart(2, '0')

/**
 * Seção 04. Faixa horizontal de prints que se arrasta com inércia (mouse ou dedo) e sempre para com um projeto
 * no meio. O do meio fica grande e de frente; os vizinhos encolhem, apagam e giram um pouco, como se a faixa
 * passasse por uma curva. O texto do projeto do meio aparece embaixo. Setas, teclado e clique nos vizinhos
 * também andam.
 */
export function Others() {
  const titleRef = useRef<HTMLHeadingElement>(null)
  const viewportRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const cards = useRef<(HTMLDivElement | null)[]>([])
  const detailsRef = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(0)
  const activeRef = useRef(0)
  const api = useRef<{ goTo: (i: number) => void }>({ goTo: () => undefined })
  const n = otherProjects.length

  useScrollSkew(titleRef, { stiffness: 120, damping: 10 })

  useEffect(() => {
    const viewport = viewportRef.current
    const track = trackRef.current
    const els = cards.current.filter((c): c is HTMLDivElement => !!c)
    if (!viewport || !track || els.length !== n) return
    const reduced = prefersReducedMotion()
    let positions: number[] = []
    let pressed = activeRef.current

    const measure = () => {
      const vw = viewport.clientWidth
      positions = els.map((c) => vw / 2 - (c.offsetLeft + c.offsetWidth / 2))
    }
    const nearest = (x: number) => {
      let best = 0
      positions.forEach((p, i) => {
        if (Math.abs(p - x) < Math.abs(positions[best] - x)) best = i
      })
      return best
    }

    const setters = els.map((c) => ({
      scale: gsap.quickSetter(c, 'scale') as (v: number) => void,
      rot: gsap.quickSetter(c, 'rotationY', 'deg') as (v: number) => void,
      alpha: gsap.quickSetter(c, 'opacity') as (v: number) => void,
    }))
    gsap.set(els, { transformPerspective: 1600, transformOrigin: '50% 50%' })

    // Cada quadro: quanto cada cartão está longe do meio decide tamanho, giro e brilho.
    const paint = () => {
      const x = Number(gsap.getProperty(track, 'x'))
      const vw = viewport.clientWidth
      els.forEach((c, i) => {
        const d = (c.offsetLeft + c.offsetWidth / 2 + x - vw / 2) / c.offsetWidth
        const a = Math.min(1, Math.abs(d))
        setters[i].scale(1 - 0.18 * a)
        setters[i].rot(reduced ? 0 : Math.max(-28, Math.min(28, -d * 22)))
        setters[i].alpha(1 - 0.6 * a)
      })
      const i = nearest(x)
      if (i !== activeRef.current) {
        activeRef.current = i
        setActive(i)
      }
    }

    measure()
    gsap.set(track, { x: positions[activeRef.current] })
    paint()

    // Dica de arrasto (ver mais abaixo). Qualquer toque na faixa cancela, mesmo que ela ainda não tenha começado.
    let hinted = false
    let hint: gsap.core.Timeline | null = null
    let hintIO: IntersectionObserver | null = null
    const stopHint = () => {
      hinted = true
      hintIO?.disconnect()
      hint?.kill()
    }

    const [drag] = Draggable.create(track, {
      type: 'x',
      inertia: !reduced,
      edgeResistance: 0.85,
      bounds: { minX: positions[n - 1], maxX: positions[0] },
      // Um arremesso anda no máximo dois projetos: com a inércia solta, um dedo forte passava a faixa toda.
      throwResistance: 2400,
      maxDuration: 0.9,
      snap: {
        x: (v: number) => {
          // Onde a inércia levaria; mas um arrasto de verdade (mais de 12% do cartão) sempre anda ao menos um
          // projeto pro lado dele, mesmo devagar: voltar pro mesmo parecia que a faixa estava travada.
          let i = nearest(v)
          const moved = Number(gsap.getProperty(track, 'x')) - positions[pressed]
          if (i === pressed && Math.abs(moved) > els[pressed].offsetWidth * 0.12) i = pressed + (moved < 0 ? 1 : -1)
          i = Math.max(pressed - 2, Math.min(pressed + 2, i))
          return positions[Math.max(0, Math.min(n - 1, i))]
        },
      },
      allowNativeTouchScrolling: true,
      dragClickables: true,
      minimumMovement: 6,
      onPress() {
        stopHint()
        gsap.killTweensOf(track)
        pressed = activeRef.current
      },
      onDrag: paint,
      onThrowUpdate: paint,
      onThrowComplete: paint,
      onRelease() {
        // Sem inércia (reduced-motion), assenta no mais próximo.
        if (reduced) api.current.goTo(nearest(this.x))
      },
      onClick(e: PointerEvent) {
        // Clique num vizinho traz ele pro meio; no do meio não faz nada (os links estão no texto).
        const target = (e.target as HTMLElement).closest<HTMLElement>('[data-card]')
        const i = target ? Number(target.dataset.card) : -1
        if (i >= 0 && i !== activeRef.current) api.current.goTo(i)
      },
    })

    // Sem isto o Draggable deixa touch-action: manipulation, o navegador assume o gesto horizontal e cancela o
    // ponteiro no primeiro movimento: no celular a faixa não arrastava. pan-y: vertical rola a página, horizontal é nosso.
    track.style.touchAction = 'pan-y'
    viewport.style.touchAction = 'pan-y'

    api.current.goTo = (i: number) => {
      stopHint()
      const k = Math.max(0, Math.min(n - 1, i))
      gsap.to(track, {
        x: positions[k],
        duration: reduced ? 0.01 : 0.9,
        ease: 'expo.out',
        overwrite: true,
        onUpdate: paint,
        onComplete: () => {
          paint()
          drag.update()
        },
      })
    }

    const onResize = () => {
      measure()
      drag.applyBounds({ minX: positions[n - 1], maxX: positions[0] })
      gsap.set(track, { x: positions[activeRef.current] })
      drag.update()
      paint()
    }
    const ro = new ResizeObserver(onResize)
    ro.observe(viewport)

    // Dica: na primeira vez que a faixa aparece, ela anda um pouco pro lado e volta, mostrando que arrasta.
    hintIO = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting || hinted || reduced) return
        hinted = true
        hintIO?.disconnect()
        const x = positions[activeRef.current]
        hint = gsap
          .timeline({ delay: 0.5, onUpdate: paint })
          .to(track, { x: x - viewport.clientWidth * 0.22, duration: 0.55, ease: 'power2.inOut' })
          .to(track, { x, duration: 0.9, ease: 'elastic.out(1, 0.5)' })
      },
      { threshold: 0.6 },
    )
    hintIO.observe(viewport)

    return () => {
      ro.disconnect()
      stopHint()
      drag.kill()
      gsap.killTweensOf(track)
    }
  }, [n])

  // O texto troca entrando de baixo.
  useEffect(() => {
    const el = detailsRef.current
    if (!el) return
    const parts = el.querySelectorAll('[data-reveal]')
    gsap.fromTo(
      parts,
      { y: prefersReducedMotion() ? 0 : 18, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.5, stagger: 0.07, ease: 'power3.out', overwrite: true },
    )
  }, [active])

  const go = useCallback((dir: 1 | -1) => api.current.goTo(activeRef.current + dir), [])

  return (
    <section
      id="outros"
      data-section
      aria-roledescription="carrossel"
      className="relative isolate overflow-x-clip pt-24 pb-32 md:py-36"
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight') go(1)
        if (e.key === 'ArrowLeft') go(-1)
      }}
    >
      <SectionChrome id="outros" />
      <div className="flex items-end justify-between gap-6 px-4 pl-6 md:px-12">
        <h2 ref={titleRef} className="origin-left font-display text-[17vw] leading-[0.84] uppercase will-change-transform md:text-[8vw]">
          Outros no ar
        </h2>
      </div>

      <div className="relative mt-10 md:mt-14">
      <div ref={viewportRef} className="relative cursor-grab overflow-hidden py-[5vw] active:cursor-grabbing">
        <div ref={trackRef} className="flex w-max items-center gap-[4vw] will-change-transform">
          {otherProjects.map((p, i) => (
            <div
              key={p.id}
              data-card={i}
              ref={(el) => {
                cards.current[i] = el
              }}
              aria-hidden={i !== active}
              className="w-[72vw] shrink-0 will-change-transform md:w-[46vw]"
            >
              <Card project={p} />
            </div>
          ))}
        </div>
      </div>
        {/* Desktop: as setas ficam nas laterais da faixa, na altura dos cards (no título, lá em cima, ninguém via). */}
        <button
          type="button"
          aria-label="projeto anterior"
          onClick={() => go(-1)}
          disabled={active === 0}
          className="absolute top-1/2 left-[2.5vw] z-10 hidden size-16 -translate-y-1/2 items-center justify-center rounded-full border border-acid bg-bg text-2xl text-acid shadow-[0_8px_30px_rgb(0_0_0/0.5)] transition-[transform,opacity,background-color,color] hover:scale-105 hover:bg-acid hover:text-bg disabled:pointer-events-none disabled:opacity-0 md:inline-flex"
        >
          ←
        </button>
        <button
          type="button"
          aria-label="próximo projeto"
          onClick={() => go(1)}
          disabled={active === n - 1}
          className="absolute top-1/2 right-[2.5vw] z-10 hidden size-16 -translate-y-1/2 items-center justify-center rounded-full border border-acid bg-bg text-2xl text-acid shadow-[0_8px_30px_rgb(0_0_0/0.5)] transition-[transform,opacity,background-color,color] hover:scale-105 hover:bg-acid hover:text-bg disabled:pointer-events-none disabled:opacity-0 md:inline-flex"
        >
          →
        </button>
      </div>

      <div className="mt-3 flex items-center justify-between gap-4 px-6 md:mt-5 md:justify-center">
        <button type="button" aria-label="projeto anterior" onClick={() => go(-1)} disabled={active === 0} className="inline-flex size-12 md:hidden shrink-0 items-center justify-center rounded-full border border-acid text-lg text-acid disabled:border-border disabled:text-muted disabled:opacity-40">
          ←
        </button>
        <div className="flex flex-col items-center gap-2">
          <div aria-hidden className="flex gap-1.5">
            {otherProjects.map((p, i) => (
              <span key={p.id} className="h-1.5 rounded-full transition-[width,background-color] duration-300" style={{ width: i === active ? 18 : 6, backgroundColor: i === active ? 'var(--c-acid)' : 'var(--c-border)' }} />
            ))}
          </div>
          <span className="font-mono text-[11px] text-muted">
            <span className="text-acid">{pad(active + 1)}</span> / {pad(n)} · arrasta pro lado<span className="hidden md:inline"> ou usa as setas</span>
          </span>
        </div>
        <button type="button" aria-label="próximo projeto" onClick={() => go(1)} disabled={active === n - 1} className="inline-flex size-12 md:hidden shrink-0 items-center justify-center rounded-full border border-acid text-lg text-acid disabled:border-border disabled:text-muted disabled:opacity-40">
          →
        </button>
      </div>

      <div ref={detailsRef} aria-live="polite" className="mt-8 px-4 pl-6 md:mt-10 md:px-12">
        <Details key={otherProjects[active].id} project={otherProjects[active]} />
      </div>
    </section>
  )
}
