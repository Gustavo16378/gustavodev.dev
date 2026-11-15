export type ProjectId = 'stewer' | 'arte-de-amar' | 'capi' | 'torra' | 'cleane'

/**
 * Composição do projeto no palco (ver projectLayout.ts):
 * frame-direita (texto à esquerda), frame-esquerda (texto à direita), vitrine (frame gigante, nome por cima),
 * celular (o celular é o protagonista, desktop atrás inclinado) e metade (frame e texto meio a meio).
 */
export type LayoutKind = 'frame-direita' | 'frame-esquerda' | 'vitrine' | 'celular' | 'metade'

export interface SiteVideo {
  /** Opcional: sem ele o navegador usa o MP4. */
  webm?: string
  mp4: string
  poster: string
  width: number
  height: number
}

export interface Print {
  webp: string
  /** Mesma imagem em largura menor, pro srcset. */
  webpSmall: string
  smallWidth: number
  png: string
  width: number
  height: number
}

/**
 * O que aparece dentro dos frames: print (imagem) ou video (o site rodando).
 * A infraestrutura de vídeo (carregar perto, um tocando por vez, fallback, só poster em conexão lenta) está pronta;
 * pra ligar, troque aqui ou em um projeto só.
 */
export type Media = 'print' | 'video'
export const DEFAULT_MEDIA: Media = 'print'

/** Uma requisição mostrada como terminal dentro do frame (tela "api"). */
export interface ApiShot {
  /** Linha de cima: o que foi pedido e o que voltou. */
  request: string
  status: string
  /** Corpo, linha a linha (JSON ou lista de rotas). */
  lines: string[]
}

/** Outra tela do mesmo projeto, que o visitante abre se quiser (painel, app, API). */
export interface ProjectView {
  id: string
  label: string
  /** Uma linha do que se vê. */
  caption: string
  prints?: { desktop: Print; mobile: Print }
  api?: ApiShot
}

export interface ProjectSheet {
  /** Duas ou três linhas. */
  architecture: string
  decisions: [string, string, string]
  repo: { label: string; url: string }
  /** Aviso ao lado do link (ex.: código privado). */
  repoNote?: string
}

export interface Project {
  id: ProjectId
  name: string
  year: number
  kind: 'cliente' | 'conceito próprio' | 'projeto em grupo' | 'hackathon'
  layout: LayoutKind
  /** Linha de contexto: cidade e quando foi entregue. */
  city: string
  delivered: string
  url: string
  /** Uma linha do que é. */
  line: string
  stack: string[]
  /** Cor de acento do ambiente (CSS var de tokens.css). */
  accent: string
  /** Fundo do ambiente (CSS var de tokens.css). */
  background: string
  media: Media
  /** Prints do site (public/prints/). */
  prints: { desktop: Print; mobile: Print }
  /** O site rodando, gravado em desktop e mobile (public/videos/). */
  videos: { desktop: SiteVideo; mobile: SiteVideo }
  sheet: ProjectSheet
  /** Nome da tela principal no seletor "por dentro" (site ou app). */
  mainLabel: string
  /** Telas por dentro, além da principal. Vazio: o seletor não aparece. */
  views: ProjectView[]
}

const video = (id: string, kind: 'desktop' | 'mobile', width: number, height: number, webm: boolean): SiteVideo => ({
  webm: webm ? `/videos/${id}-${kind}.webm` : undefined,
  mp4: `/videos/${id}-${kind}.mp4`,
  poster: `/videos/${id}-${kind}-poster.jpg`,
  width,
  height,
})

// Os WebM mobile atuais decodificam com as primeiras linhas verdes; o mobile usa só o MP4 até serem reexportados.
const videos = (id: string): Project['videos'] => ({
  desktop: video(id, 'desktop', 1280, 800, true),
  mobile: video(id, 'mobile', 390, 844, false),
})

/** Prints do palco. `hi`: capturados em alta (2400x1500 e 960x2078), pra telas densas e celulares grandes. */
const prints = (id: string, hi = false): Project['prints'] => {
  const [dw, dh, ds, mw, mh, ms] = hi ? [2400, 1500, 1200, 960, 2078, 480] : [1600, 1000, 800, 480, 1039, 240]
  return {
    desktop: {
      webp: `/prints/${id}-desktop.webp`,
      webpSmall: `/prints/${id}-desktop-${ds}.webp`,
      smallWidth: ds,
      png: `/prints/${id}-desktop.png`,
      width: dw,
      height: dh,
    },
    mobile: {
      webp: `/prints/${id}-mobile.webp`,
      webpSmall: `/prints/${id}-mobile-${ms}.webp`,
      smallWidth: ms,
      png: `/prints/${id}-mobile.png`,
      width: mw,
      height: mh,
    },
  }
}

/** Prints de uma tela por dentro (public/prints/dentro/), sempre em alta e só em WebP. */
const inside = (id: string, view: string): ProjectView['prints'] => {
  const one = (kind: 'desktop' | 'mobile', w: number, h: number, small: number): Print => ({
    webp: `/prints/dentro/${id}-${view}-${kind}.webp`,
    webpSmall: `/prints/dentro/${id}-${view}-${kind}-${small}.webp`,
    smallWidth: small,
    png: `/prints/dentro/${id}-${view}-${kind}.webp`,
    width: w,
    height: h,
  })
  return { desktop: one('desktop', 2400, 1500, 1200), mobile: one('mobile', 960, 2078, 480) }
}

const github = { label: 'github', url: 'https://github.com/Gustavo16378' }

// Ordem da seção 03: dourado, âmbar, verde, laranja, sálvia (cores vizinhas nunca parecidas). Capi e TORRA usam
// a mesma composição (celular), com o Arte de Amar entre os dois.
export const projects: Project[] = [
  {
    id: 'stewer',
    name: 'Stewer Gabriel',
    year: 2026,
    kind: 'cliente',
    layout: 'frame-direita',
    city: 'Palmas, TO',
    delivered: 'site em 2025, app em 2026',
    url: 'https://stewergabriel.com',
    line: 'Site com painel e app de agendamento do visagista Stewer Gabriel.',
    stack: ['react', 'quarkus', 'postgresql', 'react native', 'cloudflare'],
    accent: 'var(--c-stewer)',
    background: 'var(--c-stewer-bg)',
    media: DEFAULT_MEDIA,
    prints: prints('stewer'),
    videos: videos('stewer'),
    sheet: {
      architecture:
        'Duas partes no mesmo domínio. O site, em React, tem painel em /admin pra o Stewer mudar o conteúdo sozinho, com Cloudflare Pages Functions e D1. O agendamento é um sistema à parte: API em Quarkus com PostgreSQL e JWT, publicada no Render com banco no Neon, e o app em React Native com Expo, que também roda no navegador em agenda.stewergabriel.com.',
      decisions: [
        'Agendamento fora do site, num sistema próprio: o site continua leve e o sistema cresce sem depender dele.',
        'Tudo em plano gratuito: o ping que mantém a API acordada não toca no banco, então o Neon dorme quando ninguém usa.',
        'Memória da JVM medida com carga, não chutada: a API roda com folga nos 512 MB do plano gratuito do Render.',
      ],
      repo: { label: 'github', url: 'https://github.com/Gustavo16378/stewer-agenda-api' },
      repoNote: 'API e app são públicos',
    },
    mainLabel: 'site',
    views: [
      { id: 'app', label: 'app', caption: 'App de agendamento: o dia, a semana, clientes e financeiro (dados de exemplo).', prints: inside('stewer', 'app') },
      { id: 'painel', label: 'painel', caption: 'Painel do site: o Stewer troca fotos, textos e serviços sem mexer em código.', prints: inside('stewer', 'painel') },
      {
        id: 'api',
        label: 'api',
        caption: 'As rotas da API em Quarkus, lidas do código.',
        api: {
          request: 'stewer-agenda-api · Quarkus · 66 rotas',
          status: 'OpenAPI',
          lines: [
            "# JWT com papéis CLIENTE, PROFISSIONAL e ADMIN",
            "POST   /auth/login",
            "POST   /auth/registrar",
            "GET    /profissionais/{id}/horarios-livres",
            "POST   /agendamentos",
            "GET    /agendamentos/agenda",
            "GET    /agendamentos/agenda/periodo",
            "PATCH  /agendamentos/{id}/horario",
            "PATCH  /agendamentos/{id}/status",
            "GET    /clientes/aniversariantes",
            "GET    /clientes/sumidos",
            "PUT    /clientes/{id}/ficha",
            "POST   /clientes/{id}/anotacoes",
            "GET    /relatorios/financeiro",
            "GET    /auditoria",
            "GET    /ping",
            "# … e mais 51 rotas",
          ],
        },
      },
    ],
  },
  {
    id: 'capi',
    name: 'Capi',
    year: 2026,
    kind: 'hackathon',
    layout: 'celular',
    city: 'Palmas, TO',
    delivered: '2º lugar no HackaRun 2026',
    url: 'https://tyranitar-capim-dourado.pages.dev',
    line: 'App do Capim Dourado Shopping que liga a busca no celular à loja física, com uma assistente de IA.',
    stack: ['react', 'typescript', 'pages functions', 'cloudflare d1', 'gsap'],
    accent: 'var(--c-capi)',
    background: 'var(--c-capi-bg)',
    media: DEFAULT_MEDIA,
    prints: prints('capi', true),
    videos: videos('capi'),
    sheet: {
      architecture:
        'PWA em React e TypeScript feito no HackaRun 2026, no tema da jornada de compra digital e física do shopping. A Capi, assistente de IA, acha o produto nas lojas a partir de texto, foto ou link, e o cliente reserva e retira na loja. Tem mapa interativo do shopping, carteira com níveis de fidelidade, painel do lojista e painel do shopping, com API em Cloudflare Pages Functions e D1. Equipe Tyranitar: eu, Gustavo Ferreira Lima, Kauã Afra Pereira Brito e Diogo da Silva Freitas, com orientação de Haroldo Soares e Paulo Rafael. Fiquei no design e no desenvolvimento. Ficamos em 2º lugar entre 46 equipes.',
      decisions: [
        'A arquitetura do site da ONG reaproveitada (Pages Functions e D1) pra ter tudo no ar em três dias.',
        'Design system com animações em GSAP aplicado no front, que foi a tecnologia sorteada pra equipe.',
        'Contas de demonstração de cliente, lojista e shopping, pra quem avalia testar os três lados sem cadastro.',
      ],
      repo: { label: 'github', url: 'https://github.com/Gustavo16378/capi-capim-dourado' },
    },
    mainLabel: 'app',
    views: [
      { id: 'ia', label: 'capi', caption: 'A Capi procura no shopping o produto de uma foto.', prints: inside('capi', 'ia') },
      { id: 'lojista', label: 'lojista', caption: 'Painel da loja: reservas, produtos, cupons e desempenho.', prints: inside('capi', 'lojista') },
      { id: 'shopping', label: 'shopping', caption: 'Painel do shopping: lojas, campanhas e demanda.', prints: inside('capi', 'shopping') },
    ],
  },
  {
    id: 'arte-de-amar',
    name: 'Arte de Amar',
    year: 2026,
    kind: 'projeto em grupo',
    layout: 'frame-esquerda',
    city: 'Palmas, TO',
    delivered: 'entregue em 2026',
    url: 'https://arte-de-amar-site.pages.dev',
    line: 'Site e painel da ONG Arte de Amar, que atende crianças e famílias em Palmas desde 2015.',
    stack: ['react', 'gsap', 'pages functions', 'cloudflare d1'],
    accent: 'var(--c-arte)',
    background: 'var(--c-arte-bg)',
    media: DEFAULT_MEDIA,
    prints: prints('arte-de-amar', true),
    videos: videos('arte-de-amar'),
    sheet: {
      architecture:
        'One page em React, Vite e GSAP, com um fio verde contínuo que acompanha a rolagem. O conteúdo vem de uma API em Cloudflare Pages Functions com banco D1, e a diretoria troca fotos, projetos e textos pelo painel em /admin, sem depender de programador. Projeto em grupo de cinco pessoas, em que fiquei com o desenvolvimento.',
      decisions: [
        'Custo zero, porque é uma ONG: site, API, banco e painel no plano gratuito da Cloudflare, só o domínio é pago.',
        'Painel próprio em vez de um CMS pronto: só os campos que a diretoria usa, sem nada pra aprender além disso.',
        'Fotos da ONG desde 2015 otimizadas e carregadas sob demanda, pra a página abrir rápido no celular.',
      ],
      repo: { label: 'github', url: 'https://github.com/Gustavo16378/arte-de-amar' },
    },
    mainLabel: 'site',
    views: [
      { id: 'painel', label: 'painel', caption: 'Painel da diretoria: projetos, fotos, linha do tempo e voluntários (dados de exemplo).', prints: inside('arte-de-amar', 'painel') },
      {
        id: 'api',
        label: 'api',
        caption: 'O que o site recebe da API em produção.',
        api: {
          request: 'GET /api/conteudo',
          status: '200 · json',
          lines: [
            "{",
            "  \"projetos\": [",
            "    {",
            "      \"nome\": \"Dia das Crianças\",",
            "      \"publico\": \"Crianças de 2 a 12 anos\",",
            "      \"status\": \"Em andamento\",",
            "      \"foto\": { \"src\": \"/api/midias/26\" }",
            "    },",
            "    … mais 5 projetos",
            "  ],",
            "  \"marcos\": [ … 8 marcos, de 2015 a hoje ],",
            "  \"membros\": [ … 4 da diretoria ],",
            "  \"numeros\": [ … ],",
            "  \"textos\": { … }",
            "}",
          ],
        },
      },
    ],
  },
  {
    id: 'torra',
    name: 'TORRA',
    year: 2026,
    kind: 'conceito próprio',
    layout: 'celular',
    city: 'Palmas, TO',
    delivered: 'feito em 2026',
    url: 'https://torra-cafe.pages.dev',
    line: 'Cafeteria de torra própria: site, cardápio com pedido pelo WhatsApp e a base do Coado.',
    stack: ['react', 'typescript', 'tailwind', 'leaflet', 'cloudflare pages'],
    accent: 'var(--c-torra)',
    background: 'var(--c-torra-bg)',
    media: DEFAULT_MEDIA,
    prints: prints('torra'),
    videos: videos('torra'),
    sheet: {
      architecture:
        'Começou como site, em React e TypeScript com Tailwind, com mapa em Leaflet e fotos em tela cheia com movimento lento de câmera. Depois ganhou o cardápio digital (cardapio-torra.pages.dev), com carrinho e pedido que chega pronto no WhatsApp da loja. O cardápio virou a base do Coado, um SaaS de cardápio para várias cafeterias, com pedido na mesa por QR Code, em desenvolvimento.',
      decisions: [
        'O cardápio é a peça de demonstração pra cafeterias: cada uma recebe uma versão com a identidade dela, não um molde.',
        'Animações só em transform e opacity, pra o movimento das fotos e o grão da imagem não pesarem no celular.',
        'Cores da marca em tokens, sem cor solta no código.',
      ],
      repo: github,
      repoNote: 'o Coado ainda é privado',
    },
    mainLabel: 'site',
    views: [
      { id: 'cardapio', label: 'cardápio', caption: 'Cardápio com carrinho e pedido que chega pronto no WhatsApp.', prints: inside('torra', 'cardapio') },
    ],
  },
  {
    id: 'cleane',
    name: 'Cleane Barbosa',
    year: 2025,
    kind: 'cliente',
    layout: 'metade',
    city: 'Palmas, TO',
    delivered: 'entregue em 2025',
    url: 'https://cleanebarbosa.com.br',
    line: 'Site da psicanalista e terapeuta EFT Cleane Barbosa.',
    stack: ['react', 'typescript', 'tailwind', 'cloudflare pages'],
    accent: 'var(--c-cleane)',
    background: 'var(--c-cleane-bg)',
    media: DEFAULT_MEDIA,
    prints: prints('cleane'),
    videos: videos('cleane'),
    sheet: {
      architecture:
        'Site institucional em React e TypeScript com Tailwind, publicado no Cloudflare Pages com domínio próprio (cleanebarbosa.com.br).',
      decisions: [
        'Visual calmo e pouco movimento: quem procura terapia quer confiança, não efeito.',
        'Contato direto pelo WhatsApp em todas as seções, sem formulário no caminho.',
        'Site estático, rápido de abrir e sem servidor pra manter.',
      ],
      repo: github,
      repoNote: 'código privado, projeto de cliente',
    },
    mainLabel: 'site',
    views: [],
  },
]

export const projectById = (id: ProjectId): Project => {
  const p = projects.find((x) => x.id === id)
  if (!p) throw new Error(`projeto ${id} não existe`)
  return p
}

/** Print de um projeto da lista (public/prints-outros/), com versões menores pro srcset. */
export interface OtherPrint {
  webp: string
  png: string
  /** Largura -> arquivo, pro srcset. */
  sizes: [number, string][]
  width: number
  height: number
}

/** Outros projetos no ar (seção 04). Sem print, a miniatura mostra as iniciais. */
export interface OtherProject {
  id: string
  name: string
  kind: 'cliente' | 'projeto em grupo' | 'conceito próprio' | 'projeto acadêmico'
  year: number
  /** O que é, em poucas palavras (linha fechada). */
  line: string
  /** Dois ou três parágrafos (linha aberta). Placeholders com a intenção certa. */
  about: string[]
  /** Vazio quando ainda não sei a stack. */
  stack: string[]
  url?: string
  repo?: string
  prints?: { desktop: OtherPrint; mobile: OtherPrint }
}

const otherPrints = (id: string): OtherProject['prints'] => ({
  desktop: {
    webp: `/prints-outros/${id}-desktop.webp`,
    png: `/prints-outros/${id}-desktop.png`,
    sizes: [
      [320, `/prints-outros/${id}-desktop-320.webp`],
      [800, `/prints-outros/${id}-desktop-800.webp`],
      [1600, `/prints-outros/${id}-desktop.webp`],
    ],
    width: 1600,
    height: 1000,
  },
  mobile: {
    webp: `/prints-outros/${id}-mobile.webp`,
    png: `/prints-outros/${id}-mobile.png`,
    sizes: [
      [240, `/prints-outros/${id}-mobile-240.webp`],
      [480, `/prints-outros/${id}-mobile.webp`],
    ],
    width: 480,
    height: 1039,
  },
})

// Ordem da lista: os dois conceitos com mais design primeiro (o Monte Vinhedo aberto), depois clientes e faculdade.
export const otherProjects: OtherProject[] = [
  {
    id: 'monte-vinhedo',
    name: 'Monte Vinhedo',
    kind: 'conceito próprio',
    year: 2026,
    line: 'vinícola boutique de vinhos de altitude',
    about: [
      'Site conceitual de uma vinícola boutique de vinhos de altitude. One page em React com animações em GSAP presas à rolagem pelo ScrollTrigger: avançam e voltam junto com a leitura. Paleta curta em vinho e rosé, com cara de rótulo, e imagens em WebP carregadas sob demanda pra as seções pesadas não travarem o celular.',
    ],
    stack: ['react', 'gsap', 'cloudflare pages'],
    url: 'https://monte-vinhedo.pages.dev',
    prints: otherPrints('monte-vinhedo'),
  },
  {
    id: 'autoria',
    name: 'AUTORIA.',
    kind: 'conceito próprio',
    year: 2026,
    line: 'concessionária com fotos tratadas por um pipeline automático',
    about: [
      'Concessionária conceitual. Antes de entrar no site, as fotos passam por um pipeline: o Playwright coleta as imagens e o rembg remove o fundo de cada carro, então o estoque é atualizado sem abrir editor de foto e o layout controla a composição de cada tela.',
    ],
    stack: ['react', 'typescript', 'playwright', 'rembg'],
    url: 'https://autoria-6kz.pages.dev',
    prints: otherPrints('autoria'),
  },
  {
    id: 'tina-aires',
    name: 'Tina Aires',
    kind: 'cliente',
    year: 2025,
    line: 'site de neuropsicopedagoga, com SEO técnico completo',
    about: [
      'Site institucional da Tina Aires, neuropsicopedagoga em Porto Nacional, TO. O foco foi ser encontrado: robots.txt, sitemap, dados estruturados em JSON-LD e o domínio verificado no Search Console. Feito em React, leve no celular.',
    ],
    stack: ['react'],
    url: 'https://tinaaires.com.br',
    prints: otherPrints('tina-aires'),
  },
  {
    id: 'suelen',
    name: 'Suelen Pratas e Perfumaria',
    kind: 'cliente',
    year: 2025,
    line: 'loja de semijoias em prata 925 e perfumaria',
    about: [
      'Catálogo da Suelen Pratas e Perfumaria. Visual claro e editorial, com as peças em primeiro plano. Cada produto leva a conversa direto pro WhatsApp, onde a loja já vende.',
    ],
    stack: ['react'],
    url: 'https://suelen.pages.dev',
    prints: otherPrints('suelen'),
  },
  {
    id: 'automato-celular',
    name: 'Retomada (autômato celular)',
    kind: 'projeto em grupo',
    year: 2026,
    line: 'simulação 2D de um acidente nuclear e da natureza retomando a cidade',
    about: [
      'Autômato celular em que a contaminação de um acidente nuclear se espalha pela cidade e, com o tempo, a vegetação retoma o espaço. Projeto em grupo: fiquei com o código, o grupo com o relatório e a apresentação. O motor é TypeScript puro, sem DOM, com a grade em Uint8Array e buffer duplo, testado com Vitest. A tela em Canvas tem controles de execução e cenário (acidente, sarcófago, vento), estatísticas ao vivo e exportação em CSV e PNG.',
    ],
    stack: ['typescript', 'vite', 'canvas', 'vitest'],
    url: 'https://retomada-automato-celular.pages.dev',
    prints: otherPrints('automato-celular'),
  },
  {
    id: 'fincontrol',
    name: 'FinControl',
    kind: 'projeto em grupo',
    year: 2026,
    line: 'sistema de controle financeiro',
    about: [
      'Sistema de controle financeiro, projeto em dupla. Back-end em Java com Quarkus, organizado em camadas (resource, service, repository), perfis de acesso por papel e erros no padrão Problem Details; front-end em Angular.',
    ],
    stack: ['java', 'quarkus', 'angular'],
    // Sem link no ar: só o botão de código (o back-end; o front fica em fincontrol-web).
    repo: 'https://github.com/Gustavo16378/fincontrol-api',
  },
  {
    id: 'ecommerce-cafe',
    name: 'Ecommerce Café',
    kind: 'projeto acadêmico',
    year: 2026,
    line: 'API de e-commerce de café em Java com Quarkus',
    about: [
      'API de uma loja de cafés, feita na faculdade. Java com Quarkus e Panache, organizada em camadas (resource, service, repository, mapper e DTOs), perfis ADMIN e USER com @RolesAllowed e erros no padrão Problem Details (RFC 7807).',
    ],
    stack: ['java', 'quarkus', 'postgresql'],
    repo: 'https://github.com/Gustavo16378/ecommerce-cafe-api',
  },
]
