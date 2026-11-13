import { expect, test } from '@playwright/test'
import { abrir, chegarNoPalco, gesto, isPhone, palco } from './gestos'

const SEL = '[data-projects-stage]'

test('cada tela "por dentro" abre e aparece inteira no frame', async ({ page }, info) => {
  const phone = isPhone(info)
  await abrir(page)
  const cdp = await page.context().newCDPSession(page)
  const p = palco(page, SEL)
  const total = Number(await page.locator(SEL).getAttribute('data-steps'))
  await chegarNoPalco(page, cdp, phone, SEL)

  for (let i = 0; i < total; i++) {
    if (i > 0) {
      await page.waitForTimeout(1300)
      await gesto(page, cdp, phone, 1)
      await expect.poll(() => p.passo()).toBe(i)
      await page.waitForTimeout(900)
    }
    const grupo = page.locator(`${SEL} [role=group]`).nth(i)
    const botoes = grupo.locator('button')
    const n = await botoes.count()
    for (let b = 1; b < n; b++) {
      await botoes.nth(b).click()
      await expect(botoes.nth(b)).toHaveAttribute('aria-pressed', 'true')
      await page.waitForTimeout(1300)
      // A tela aberta: imagem de public/prints/dentro carregada, ou o terminal da API com linhas.
      const ok = await page.locator(SEL).evaluate((stage) => {
        const imgs = [...stage.querySelectorAll<HTMLImageElement>('img')].filter((im) => im.currentSrc.includes('/prints/dentro/'))
        const terminal = [...stage.querySelectorAll('pre')].some((pre) => pre.children.length > 3)
        return imgs.some((im) => im.complete && im.naturalWidth > 0) || terminal
      })
      expect(ok, `tela ${b} do projeto ${i + 1}`).toBe(true)
    }
    // Volta pra principal.
    if (n > 1) await botoes.nth(0).click()
  }
})
