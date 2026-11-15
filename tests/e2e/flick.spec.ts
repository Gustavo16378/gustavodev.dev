import { expect, test } from '@playwright/test'
import { abrir, isPhone, palco } from './gestos'

// Celular lento: um flick rápido manda poucos eventos de scroll, cada um andando mais de uma tela.
// O palco de projetos tem que prender mesmo quando um evento só passa por cima dele inteiro.
test('um flick que pula o palco inteiro num evento só ainda prende', async ({ page }, info) => {
  test.skip(!isPhone(info), 'só no celular')
  const erros = await abrir(page)
  const p = palco(page, '[data-projects-stage]')
  const top = await p.topo()
  await page.evaluate((d) => window.scrollBy(0, d), top - 250)
  await page.waitForTimeout(1200)
  await page.evaluate(() => window.scrollBy(0, 1150))
  await page.waitForTimeout(40)
  await page.evaluate(() => window.scrollBy(0, 1150))
  await expect.poll(() => p.preso(), { message: 'o palco prende' }).toBe(true)
  await expect.poll(async () => Math.abs(await p.topo()), { message: 'e a página volta pro palco' }).toBeLessThan(3)
  expect(await p.passo()).toBe(0)
  expect(erros).toEqual([])
})
