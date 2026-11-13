import { expect, type CDPSession, type Page, type TestInfo } from '@playwright/test'

/** Celular (toque) ou desktop (roda do mouse / trackpad), pelo nome do projeto do Playwright. */
export const isPhone = (info: TestInfo) => info.project.name === 'celular'

/** Abre a página, junta os erros do console e espera o preloader sair. */
export async function abrir(page: Page) {
  const erros: string[] = []
  page.on('pageerror', (e) => erros.push(e.message))
  page.on('console', (m) => {
    if (m.type() === 'error') erros.push(m.text())
  })
  await page.goto('/', { waitUntil: 'networkidle' })
  await expect(page.locator('[data-preloader]')).toHaveCount(0, { timeout: 20_000 })
  return erros
}

/**
 * Um gesto, do jeito que o aparelho manda: no desktop, uma rajada de wheel que perde força (inércia de trackpad),
 * com a hora de cada evento a 16ms (a máquina do CI é lenta e amontoaria os eventos); no celular, um arrasto de dedo.
 */
export async function gesto(page: Page, cdp: CDPSession, phone: boolean, dir: 1 | -1) {
  if (phone) {
    const y0 = dir > 0 ? 600 : 250
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 195, y: y0 }] })
    for (let k = 1; k <= 6; k++) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 195, y: y0 - dir * k * 40 }] })
      await page.waitForTimeout(16)
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    return
  }
  let v = 60 * dir
  let ts = Date.now() / 1000
  for (let k = 0; k < 30 && Math.abs(v) > 1; k++) {
    await cdp.send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: 700, y: 450, deltaX: 0, deltaY: v, timestamp: ts })
    ts += 0.016
    v *= 0.85
  }
}

/** Arrasto horizontal (faixa de outros projetos): dedo no celular, mouse no desktop. */
export async function arrastarDeLado(page: Page, cdp: CDPSession, phone: boolean, y: number, dx: number) {
  const x0 = phone ? 300 : 1100
  if (phone) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x0, y }] })
    for (let k = 1; k <= 10; k++) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x0 + (dx * k) / 10, y: y + k * 0.5 }] })
      await page.waitForTimeout(16)
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    return
  }
  await page.mouse.move(x0, y)
  await page.mouse.down()
  for (let k = 1; k <= 10; k++) {
    await page.mouse.move(x0 + (dx * k) / 10, y)
    await page.waitForTimeout(16)
  }
  await page.mouse.up()
}

export interface Palco {
  passo: () => Promise<number>
  preso: () => Promise<boolean>
  topo: () => Promise<number>
}

export const palco = (page: Page, sel: string): Palco => ({
  passo: () => page.locator(sel).evaluate((el) => Number((el as HTMLElement).dataset.step ?? -1)),
  preso: () => page.locator(sel).evaluate((el) => !!(el as HTMLElement).dataset.engaged),
  topo: () => page.locator(sel).evaluate((el) => el.getBoundingClientRect().top),
})

/** Rola até perto do palco (sem gesto) e faz gestos até ele prender. Devolve quantos gestos levou. */
export async function chegarNoPalco(page: Page, cdp: CDPSession, phone: boolean, sel: string) {
  const p = palco(page, sel)
  const top = await p.topo()
  await page.evaluate((d) => window.scrollBy(0, d), top - (phone ? 300 : 400))
  await page.waitForTimeout(1200)
  let n = 0
  while (!(await p.preso()) && n < 12) {
    await gesto(page, cdp, phone, 1)
    await page.waitForTimeout(450)
    n++
  }
  return n
}
