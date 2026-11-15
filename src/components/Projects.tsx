import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { flushSync } from 'react-dom'
import { projects, projectById, type Print, type Project, type ProjectId, type ProjectView } from '../data/projects'
import { gsap } from '../motion/gsap'
import { prefersReducedMotion } from '../motion/reducedMotion'
import { ApiShot } from './ApiShot'
import { useProjectsStage, type StageEls } from '../motion/useProjectsStage'
import { useTilt } from '../motion/useTilt'
import { useScrollSkew } from '../motion/useScrollSkew'
import { heroOf, TEXT_LAYOUT } from './projectLayout'
import { useOverlayState } from './useDialog'
import { useVideoPolicy } from './useVideoPolicy'
import { ProjectRail } from './ProjectRail'
import { Plaque } from './Plaque'
import { TechSheet } from './TechSheet'
import { SectionChrome } from './SectionChrome'
import { GridBackdrop } from './GridBackdrop'

type AccentStyle = CSSProperties & Record<'--accent', string>

// Borda de 1px na cor de acento (compensada pela escala via --ring) e sombra suave.
const frameBox =
  'relative size-full overflow-hidden bg-surface [box-shadow:0_0_0_var(--ring,1px)_var(--frame-edge),var(--shadow-frame)]'

// Anel do tamanho da borda, onde passa o brilho.
const ringMask: CSSProperties = {
  inset: 'calc(var(--ring, 1px) * -1)',
  padding: 'var(--ring, 1px)',
  mask: 'linear-gradient(black 0 0) content-box exclude, linear-gradient(black 0 0)',
  WebkitMask: 'linear-gradient(black 0 0) content-box, linear-gradient(black 0 0)',
  WebkitMaskComposite: 'xor',
}

function PrintPicture({ print, kind, alt }: { print: Print; kind: 'desktop' | 'mobile'; alt: string }) {
  return (
    <picture>
      <source
        srcSet={`${print.webpSmall} ${print.smallWidth}w, ${print.webp} ${print.width}w`}
        sizes={kind === 'desktop' ? '(min-width: 768px) 68vw, 96vw' : '(min-width: 768px) 20vw, 84vw'}
        type="image/webp"
      />
      <img
        src={print.png}
        alt={alt}
        width={print.width}
        height={print.height}
        loading="lazy"
        decoding="async"
        className="block size-full object-cover object-top"
      />
    </picture>
  )
}

interface LayerProps {
  project: Project
  kind: 'desktop' | 'mobile'
  playable: boolean
  /** Escurece o pé do print, onde o nome fica por cima (composição vitrine). */
  scrim?: boolean
  /** Tela por dentro aberta neste projeto (painel, app, api), por cima do print. */
  view?: ProjectView | null
  layerRef: (el: HTMLDivElement | null) => void
  videoRef: (el: HTMLVideoElement | null) => void
}

/** Uma camada do frame: o print, ou o vídeo quando a mídia do projeto é vídeo e este frame é o que toca. */
function Layer({ project, kind, playable, scrim = false, view = null, layerRef, videoRef }: LayerProps) {
  const label = `${project.name} no ${kind === 'desktop' ? 'desktop' : 'celular'}`
  const print = project.prints[kind]
  const video = project.videos[kind]
  return (
    <div ref={layerRef} className="absolute inset-0 opacity-0" style={{ containerType: 'inline-size' }}>
      {project.media === 'video' && playable ? (
        <video
          ref={videoRef}
          muted
          loop
          playsInline
          preload="none"
          poster={video.poster}
          width={video.width}
          height={video.height}
          aria-label={label}
          className="block size-full object-cover object-top"
        />
      ) : project.media === 'video' ? (
        <img
          src={video.poster}
          alt={label}
          width={video.width}
          height={video.height}
          loading="lazy"
          decoding="async"
          className="block size-full object-cover object-top"
        />
      ) : (
        <PrintPicture print={print} kind={kind} alt={label} />
      )}
      {view && (
        <div className="absolute inset-0 z-[1] bg-surface">
          {view.api ? (
            <ApiShot shot={view.api} phone={kind === 'mobile'} />
          ) : view.prints ? (
            <PrintPicture print={view.prints[kind]} kind={kind} alt={`${project.name}, ${view.label}, no ${kind === 'desktop' ? 'desktop' : 'celular'}`} />
          ) : null}
        </div>
      )}
      {scrim && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 z-[2] h-[78%]"
          // Escuro de verdade onde o texto fica (os 45% de baixo) e só depois some: em print claro (Capi) um
          // degradê linear deixava o nome e a descrição brancos em cima de fundo creme, ilegíveis.
          style={{ backgroundImage: 'linear-gradient(to top, var(--scrim) 0%, var(--scrim) 45%, transparent 100%)' }}
        />
      )}
    </div>
  )
}

type ListKey = 'deskLayers' | 'mobLayers' | 'names' | 'nameTracks' | 'texts' | 'glints'

/**
 * Seção 03. Um palco da altura da tela entre duas faixas de cor. Quando ele chega no topo, o scroll
 * trava e cada gesto troca de projeto (ver useProjectsStage). Cada projeto tem sua composição; os frames
 * viajam entre elas, o nome em contorno desliza atrás, a cor troca numa varredura diagonal.
 */
export function Projects() {
  const stageRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const wipeRef = useRef<HTMLDivElement>(null)
  const glowRef = useRef<HTMLDivElement>(null)
  const deskTravelRef = useRef<HTMLDivElement>(null)
  const mobTravelRef = useRef<HTMLDivElement>(null)
  const deskFloatRef = useRef<HTMLDivElement>(null)
  const mobFloatRef = useRef<HTMLDivElement>(null)
  const deskTiltRef = useRef<HTMLDivElement>(null)
  const mobTiltRef = useRef<HTMLDivElement>(null)
  const deskSkewRef = useRef<HTMLDivElement>(null)
  const deskFlipRef = useRef<HTMLDivElement>(null)
  const mobFlipRef = useRef<HTMLDivElement>(null)
  const mobSkewRef = useRef<HTMLDivElement>(null)
  const backdropRef = useRef<HTMLDivElement>(null)
  const backdropWipeRef = useRef<HTMLDivElement>(null)
  const lists = useRef<Record<ListKey, (HTMLElement | null)[]>>({
    deskLayers: [],
    mobLayers: [],
    names: [],
    nameTracks: [],
    texts: [],
    glints: [],
  })
  const videos = useRef<(HTMLVideoElement | null)[]>([])

  const policy = useVideoPolicy()
  const [current, setCurrent] = useState(0)
  const [engaged, setEngaged] = useState(false)
  const sheet = useOverlayState()
  const [sheetId, setSheetId] = useState<ProjectId | null>(null)

  // Física só no frame: inclina 2 a 3 graus seguindo o mouse, skew leve pelo scroll. Nunca no <video>.
  useTilt(deskTiltRef, { maxX: 2, maxY: 3, perspective: 1600, stiffness: 60, damping: 9 })
  useTilt(mobTiltRef, { maxX: 2, maxY: 3, perspective: 1200, stiffness: 60, damping: 9 })
  useScrollSkew(deskSkewRef, { factor: 0.08, max: 2.5, stiffness: 120, damping: 11 })
  useScrollSkew(mobSkewRef, { factor: 0.08, max: 2.5, stiffness: 120, damping: 11 })

  // Lido pelo controlador depois do commit, quando os refs já existem.
  const getEls = useCallback((): StageEls | null => {
    const l = lists.current
    const all = (a: (HTMLElement | null)[], len = projects.length) =>
      a.length === len && a.every(Boolean) ? (a as HTMLElement[]) : null
    const [stage, content, wipe, glow] = [stageRef.current, contentRef.current, wipeRef.current, glowRef.current]
    const [deskTravel, mobTravel, deskFloat, mobFloat] = [
      deskTravelRef.current,
      mobTravelRef.current,
      deskFloatRef.current,
      mobFloatRef.current,
    ]
    const deskLayers = all(l.deskLayers)
    const mobLayers = all(l.mobLayers)
    const names = all(l.names)
    const nameTracks = all(l.nameTracks)
    const texts = all(l.texts)
    const glints = all(l.glints, 2)
    if (!stage || !content || !wipe || !glow || !deskTravel || !mobTravel || !deskFloat || !mobFloat) return null
    if (!deskLayers || !mobLayers || !names || !nameTracks || !texts || !glints) return null
    return {
      stage,
      content,
      wipe,
      glow,
      deskTravel,
      mobTravel,
      deskFloat,
      mobFloat,
      glints,
      deskLayers,
      mobLayers,
      names,
      nameTracks,
      texts,
      videos: videos.current,
      backdrop: backdropRef.current,
      backdropWipe: backdropWipeRef.current,
      flips: [deskFlipRef.current, mobFlipRef.current].filter((el): el is HTMLDivElement => !!el),
    }
  }, [])

  const stageApi = useProjectsStage(getEls, {
    projects,
    desktop: policy.desktop,
    posterOnly: policy.posterOnly,
    onCurrent: setCurrent,
    onEngaged: setEngaged,
  })

  // Tela por dentro aberta (painel, app, api): de um projeto só. Trocar de projeto fecha, depois da troca.
  const [inside, setInside] = useState<{ i: number; id: string } | null>(null)
  const flipping = useRef<gsap.core.Timeline | null>(null)
  const openView = useCallback((i: number, id: string | null) => {
    const next = id ? { i, id } : null
    const flips = [deskFlipRef.current, mobFlipRef.current].filter((el): el is HTMLDivElement => !!el)
    flipping.current?.progress(1).kill()
    if (prefersReducedMotion() || !flips.length) {
      setInside(next)
      return
    }
    // O frame gira até ficar de lado, troca a tela sem ninguém ver e volta girando do outro lado, com mola.
    gsap.set(flips, { transformPerspective: 1400, transformOrigin: '50% 50%' })
    flipping.current = gsap
      .timeline({ onComplete: () => void (flipping.current = null) })
      .to(flips, { rotationY: -86, scale: 0.92, duration: 0.24, ease: 'power2.in', stagger: 0.05 })
      .add(() => flushSync(() => setInside(next)))
      .fromTo(flips, { rotationY: 86, scale: 0.92 }, { rotationY: 0, scale: 1, duration: 0.8, ease: 'back.out(1.6)', stagger: 0.07 })
  }, [])
  useEffect(() => {
    if (!inside || inside.i === current) return
    const t = window.setTimeout(() => setInside(null), 1000)
    return () => window.clearTimeout(t)
  }, [current, inside])
  const viewOf = (p: Project, i: number) => (inside?.i === i ? (p.views.find((v) => v.id === inside.id) ?? null) : null)

  const { show } = sheet
  const openers = useMemo(
    () =>
      Object.fromEntries(
        projects.map((p) => [
          p.id,
          () => {
            setSheetId(p.id)
            show()
          },
        ]),
      ) as Record<ProjectId, () => void>,
    [show],
  )

  const setAt = (key: ListKey, i: number) => (el: HTMLElement | null) => {
    lists.current[key][i] = el
  }
  const plays = (p: Project, kind: 'desktop' | 'mobile') => heroOf(p.layout, policy.desktop) === kind
  const setVideo = (p: Project, i: number, kind: 'desktop' | 'mobile') => (el: HTMLVideoElement | null) => {
    if (plays(p, kind)) videos.current[i] = el
  }

  const frameAccent: AccentStyle = { '--accent': projects[current].accent }
  const first = projects[0].background
  const last = projects[projects.length - 1].background

  const frame = (kind: 'desktop' | 'mobile') => {
    const desk = kind === 'desktop'
    const radius = desk ? 'rounded-[6px]' : 'rounded-[14px] md:rounded-[16px]'
    return (
      <div ref={desk ? deskTravelRef : mobTravelRef} className="absolute top-0 left-0 will-change-transform" style={frameAccent}>
        <div ref={desk ? deskFloatRef : mobFloatRef} className="size-full will-change-transform">
          <div ref={desk ? deskTiltRef : mobTiltRef} className="size-full will-change-transform">
            <div ref={desk ? deskSkewRef : mobSkewRef} className="relative size-full will-change-transform">
              <div ref={desk ? deskFlipRef : mobFlipRef} className="relative size-full will-change-transform">
                <div className={`${frameBox} ${radius}`}>
                  {projects.map((p, i) => (
                    <Layer
                      key={p.id}
                      project={p}
                      kind={kind}
                      playable={plays(p, kind)}
                      view={viewOf(p, i)}
                      scrim={TEXT_LAYOUT[p.layout].overlay[policy.desktop ? 'desktop' : 'mobile'] && desk === policy.desktop}
                      layerRef={setAt(desk ? 'deskLayers' : 'mobLayers', i)}
                      videoRef={setVideo(p, i, kind)}
                    />
                  ))}
                </div>
                <div aria-hidden className={`pointer-events-none absolute overflow-hidden ${radius}`} style={ringMask}>
                  <div
                    ref={setAt('glints', desk ? 0 : 1)}
                    className="absolute inset-y-0 left-0 w-1/3 will-change-transform"
                    style={{ backgroundImage: 'var(--glint)' }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <section id="projetos" data-section className="relative isolate overflow-x-clip">
      <h2 className="sr-only">Projetos</h2>
      <SectionChrome id="projetos" side="left" />
      <ProjectRail current={current} total={projects.length} visible={engaged} />

      {/* Faixa de cor entrando no primeiro projeto */}
      <div aria-hidden className="relative -z-20 h-[30svh]" style={{ backgroundImage: `linear-gradient(to bottom, var(--c-bg), ${first})` }} />

      {/*
        Só no celular: fundo fixo na cor do palco, com a mesma varredura, que aparece enquanto ele está preso e cobre
        o resto da tela (no iOS, com a barra recolhida, a tela passa dos 100svh do palco). Fica atrás do palco.
      */}
      {!policy.desktop && (
        <div
          ref={backdropRef}
          data-stage-backdrop
          aria-hidden
          className="pointer-events-none fixed inset-0 overflow-hidden"
          style={{ opacity: 0, backgroundColor: first }}
        >
          <div className="absolute top-1/2 left-1/2 size-[300vmax] -translate-x-1/2 -translate-y-1/2 rotate-[35deg]">
            <div ref={backdropWipeRef} className="size-full will-change-transform" />
          </div>
        </div>
      )}

      <div ref={stageRef} data-projects-stage className="relative h-svh overflow-hidden" style={{ backgroundColor: first }}>
        {/* Varredura diagonal: a cor do próximo projeto cobre a tela. */}
        <div
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-1/2 size-[300vmax] -translate-x-1/2 -translate-y-1/2 rotate-[35deg]"
        >
          <div ref={wipeRef} className="size-full will-change-transform" />
        </div>

        {/* Invisível até o palco ser montado (quando chega a uma tela de distância). */}
        <div ref={contentRef} className="absolute inset-0" style={{ visibility: 'hidden' }}>
          <GridBackdrop />
          {/* Luz na cor de acento atrás do frame */}
          <div
            ref={glowRef}
            aria-hidden
            className="pointer-events-none absolute top-0 left-0 will-change-transform"
          >
            <div
              className="size-[90vmax] -translate-x-1/2 -translate-y-1/2 md:size-[70vmax]"
              style={{ backgroundImage: 'radial-gradient(circle, color-mix(in srgb, var(--glow) 24%, transparent), transparent 62%)' }}
            />
          </div>

          {/* Nome em contorno, gigante, atrás do frame: desliza sozinho e acelera com o scroll */}
          {projects.map((p, i) => (
            <div
              key={p.id}
              ref={setAt('names', i)}
              aria-hidden
              className={`pointer-events-none absolute left-0 w-full -translate-y-1/2 opacity-0 ${TEXT_LAYOUT[p.layout].name}`}
            >
              <div
                ref={setAt('nameTracks', i)}
                className="flex w-max font-display text-[22svh] leading-none whitespace-nowrap uppercase will-change-transform md:text-[30svh]"
                style={{ color: 'transparent', WebkitTextStroke: `1px ${p.accent}` }}
              >
                {[0, 1, 2, 3].map((k) => (
                  <span key={k} className="pr-[0.3em]">
                    {p.name}
                  </span>
                ))}
              </div>
            </div>
          ))}

          {frame('desktop')}
          {frame('mobile')}

          {projects.map((p, i) => {
            const layout = TEXT_LAYOUT[p.layout]
            const style: AccentStyle = { '--accent': p.accent }
            const device = policy.desktop ? 'desktop' : 'mobile'
            return (
              <div key={p.id} style={style}>
                <Plaque
                  project={p}
                  onSheet={openers[p.id]}
                  active={inside?.i === i ? inside.id : null}
                  onView={(id) => openView(i, id)}
                  overlay={layout.overlay[device]}
                  shadow={layout.shadow[device]}
                  center={layout.center && !layout.overlay[device]}
                  onMotion={p.media === 'video' && policy.posterOnly ? () => stageApi.current.playManually(i) : undefined}
                  blockRef={setAt('texts', i)}
                  className={`absolute z-10 ${layout.className}`}
                />
              </div>
            )
          })}
        </div>
      </div>

      {/* Faixa de cor saindo do último projeto */}
      <div aria-hidden className="relative -z-20 h-[30svh]" style={{ backgroundImage: `linear-gradient(to bottom, ${last}, var(--c-bg))` }} />

      <TechSheet project={sheetId ? projectById(sheetId) : null} open={sheet.open} onClose={sheet.hide} />
    </section>
  )
}
