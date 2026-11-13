// Controle de um Chrome real pelo Chrome DevTools Protocol, sem dependências (Node 24 tem WebSocket).
import { writeFileSync } from 'node:fs'

/** Auxiliares injetados em toda página: achar campos pelo rótulo, clicar por texto etc. */
const HELPERS = `
window.__t = {
  field(text) {
    const l = [...document.querySelectorAll('label')].find((x) => x.textContent.trim() === text);
    return l && (l.control || document.getElementById(l.htmlFor));
  },
  setValue(el, value) {
    const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : el instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, value);
    el.dispatchEvent(new Event(el instanceof HTMLSelectElement ? 'change' : 'input', { bubbles: true }));
  },
  set(text, value) {
    const el = this.field(text);
    if (!el) throw new Error('campo não encontrado: ' + text);
    this.setValue(el, value);
  },
  click(text) {
    const el = [...document.querySelectorAll('button,a')].find((x) => x.textContent.trim() === text || x.getAttribute('aria-label') === text);
    if (!el) throw new Error('botão/link não encontrado: ' + text);
    el.click();
  },
};`

export async function connect({ debugPort, site, outDir }) {
  const log = []
  let failures = 0
  const exceptions = []
  const check = (name, ok, detail = '') => {
    log.push(`${ok ? 'OK   ' : 'FALHA'} ${name}${detail ? ` -> ${detail}` : ''}`)
    if (!ok) failures += 1
    return ok
  }

  const targets = await (await fetch(`http://127.0.0.1:${debugPort}/json`)).json()
  const page = targets.find((target) => target.type === 'page')
  const ws = new WebSocket(page.webSocketDebuggerUrl)
  await new Promise((resolve) => (ws.onopen = resolve))
  let nextId = 0
  const pending = new Map()
  ws.onmessage = (event) => {
    const message = JSON.parse(event.data)
    if (message.id && pending.has(message.id)) {
      const { resolve, reject } = pending.get(message.id)
      pending.delete(message.id)
      message.error ? reject(new Error(message.error.message)) : resolve(message.result)
    } else if (message.method === 'Runtime.exceptionThrown') {
      exceptions.push(message.params.exceptionDetails.text)
    }
  }
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const id = ++nextId
      pending.set(id, { resolve, reject })
      ws.send(JSON.stringify({ id, method, params }))
    })
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

  const t = {
    site, check, send, sleep, log,
    get failures() { return failures },
    exceptions,
    async run(expression) {
      const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })
      if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? 'erro na página')
      return result.result.value
    },
    async waitFor(expression, what, timeout = 15000) {
      const started = Date.now()
      while (Date.now() - started < timeout) {
        try {
          if (await t.run(expression)) return true
        } catch {
          /* navegando */
        }
        await sleep(150)
      }
      check(`esperava: ${what}`, false, 'tempo esgotado')
      return false
    },
    text: () => t.run('document.body.innerText'),
    path: () => t.run('location.pathname + location.search'),
    async goto(url) {
      await send('Page.navigate', { url: url.startsWith('http') ? url : `${site}${url}` })
      await t.waitFor('document.readyState === "complete"', `carregar ${url}`)
      await sleep(400)
    },
    click: (label) => t.run(`__t.click(${JSON.stringify(label)})`),
    set: (label, value) => t.run(`__t.set(${JSON.stringify(label)}, ${JSON.stringify(value)})`),
    submit: () => t.run('document.querySelector("main form button[type=submit]").click()'),
    /** Clique num elemento achado por seletor CSS. */
    clickSelector: (selector) => t.run(`document.querySelector(${JSON.stringify(selector)}).click()`),
    async shot(name, width = 1280) {
      const { contentSize } = await send('Page.getLayoutMetrics')
      const { data } = await send('Page.captureScreenshot', {
        format: 'png',
        captureBeyondViewport: true,
        clip: { x: 0, y: 0, width, height: Math.min(Math.ceil(contentSize.height), 3200), scale: 1 },
      })
      writeFileSync(`${outDir}/${name}.png`, Buffer.from(data, 'base64'))
    },
    async viewport(width, height = 900, mobile = false) {
      await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: mobile ? 2 : 1, mobile })
    },
    async fresh() {
      await send('Network.clearBrowserCookies')
    },
    close: () => ws.close(),
  }

  await send('Page.enable')
  await send('Runtime.enable')
  await send('Network.enable')
  await send('Page.addScriptToEvaluateOnNewDocument', { source: HELPERS })
  await t.viewport(1280)
  await t.fresh()
  return t
}
