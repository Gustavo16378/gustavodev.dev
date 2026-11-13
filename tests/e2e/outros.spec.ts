import { expect, test } from '@playwright/test'
import { abrir, arrastarDeLado, isPhone } from './gestos'

test('a faixa de outros projetos arrasta, pelo dedo ou pelo mouse, e as setas andam', async ({ page }, info) => {
  const phone = isPhone(info)
  const erros = await abrir(page)
  const cdp = await page.context().newCDPSession(page)
  await page.evaluate(() => {
    const el = document.getElementById('outros')!
    window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 20)
  })
  await page.waitForTimeout(3000) // espera a espiada de dica terminar
  const titulo = () => page.locator('#outros h3').first().textContent()
  const primeiro = await titulo()

  const card = await page.locator('#outros [data-card="0"]').boundingBox()
  await arrastarDeLado(page, cdp, phone, Math.round(card!.y + card!.height / 2), -240)
  await expect.poll(titulo, { message: 'o arrasto troca o projeto do meio' }).not.toBe(primeiro)
  const depoisDoArrasto = await titulo()

  // Setas: no celular são as de baixo da faixa, no desktop as do título.
  const proximo = page.locator('#outros button[aria-label="próximo projeto"]').filter({ visible: true }).first()
  await proximo.click()
  await expect.poll(titulo, { message: 'a seta anda um projeto' }).not.toBe(depoisDoArrasto)
  expect(erros).toEqual([])
})
