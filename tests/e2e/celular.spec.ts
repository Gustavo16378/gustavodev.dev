import { expect, test } from '@playwright/test'
import { abrir, chegarNoPalco, gesto, isPhone, palco } from './gestos'

const SEL = '[data-projects-stage]'

// "As telinhas ficaram tão pequenas que não dá pra ver": cada projeto no celular tem que ocupar boa parte da tela.
test('no celular, o print de cada projeto ocupa boa parte da tela', async ({ page }, info) => {
  test.skip(!isPhone(info), 'só no celular')
  await abrir(page)
  const cdp = await page.context().newCDPSession(page)
  const p = palco(page, SEL)
  const total = Number(await page.locator(SEL).getAttribute('data-steps'))
  await chegarNoPalco(page, cdp, true, SEL)
  const tela = page.viewportSize()!
  for (let i = 0; i < total; i++) {
    if (i > 0) {
      await page.waitForTimeout(1300)
      await gesto(page, cdp, true, 1)
      await expect.poll(() => p.passo()).toBe(i)
      await page.waitForTimeout(1200)
    }
    // O maior frame visível (o que tem opacidade 1).
    const area = await page.locator(SEL).evaluate((stage) => {
      const frames = [...stage.querySelectorAll<HTMLElement>('.will-change-transform.absolute.top-0.left-0')]
      return Math.max(
        ...frames
          .filter((f) => Number(getComputedStyle(f).opacity) > 0.9)
          .map((f) => {
            const r = f.getBoundingClientRect()
            return r.width * r.height
          }),
      )
    })
    expect(area / (tela.width * tela.height), `projeto ${i + 1}`).toBeGreaterThan(0.22)
  }
})
