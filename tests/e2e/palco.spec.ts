import { expect, test } from '@playwright/test'
import { abrir, chegarNoPalco, gesto, isPhone, palco } from './gestos'

// Os dois palcos em passos do site: a seção 02 (camadas) e a 03 (projetos).
const PALCOS = [
  { nome: 'seção 02', sel: '[data-layers-stage]' },
  { nome: 'projetos', sel: '[data-projects-stage]' },
]

for (const { nome, sel } of PALCOS) {
  test.describe(`palco: ${nome}`, () => {
    test('prende, anda um passo por gesto e solta com um gesto só no fim', async ({ page }, info) => {
      const phone = isPhone(info)
      const erros = await abrir(page)
      const cdp = await page.context().newCDPSession(page)
      const p = palco(page, sel)
      const total = Number(await page.locator(sel).getAttribute('data-steps'))
      expect(total).toBeGreaterThan(1)

      await chegarNoPalco(page, cdp, phone, sel)
      expect(await p.preso(), 'o palco prende quando chega nele').toBe(true)
      expect(await p.passo()).toBe(0)

      // Um gesto, um passo, com calma entre eles, até o último.
      for (let k = 1; k < total; k++) {
        await page.waitForTimeout(1300)
        await gesto(page, cdp, phone, 1)
        await expect.poll(() => p.passo(), { message: `gesto ${k} anda um passo` }).toBe(k)
        expect(await p.preso()).toBe(true)
      }

      // Gesto logo depois da última troca: era aqui que precisava arrastar duas vezes.
      await page.waitForTimeout(phone ? 250 : 500)
      await gesto(page, cdp, phone, 1)
      await expect.poll(() => p.preso(), { message: 'um gesto basta pra sair do último passo' }).toBe(false)
      await expect.poll(() => p.topo(), { message: 'a página seguiu pra baixo' }).toBeLessThan(-50)
      expect(erros).toEqual([])
    })

    test('no celular, dois arrastos rápidos andam dois passos', async ({ page }, info) => {
      test.skip(!isPhone(info), 'só no celular')
      await abrir(page)
      const cdp = await page.context().newCDPSession(page)
      const p = palco(page, sel)
      await chegarNoPalco(page, cdp, true, sel)
      await page.waitForTimeout(1300)
      await gesto(page, cdp, true, 1)
      await page.waitForTimeout(150)
      await gesto(page, cdp, true, 1)
      await expect.poll(() => p.passo(), { timeout: 5000 }).toBe(2)
    })

    test('um gesto longo de trackpad não pula dois passos', async ({ page }, info) => {
      test.skip(isPhone(info), 'só no desktop')
      await abrir(page)
      const cdp = await page.context().newCDPSession(page)
      const p = palco(page, sel)
      await chegarNoPalco(page, cdp, false, sel)
      await page.waitForTimeout(1300)
      await gesto(page, cdp, false, 1)
      await page.waitForTimeout(2000)
      expect(await p.passo()).toBe(1)
    })
  })
}
