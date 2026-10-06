// A minimal headless Chrome driver over the DevTools protocol (Node 22's
// built-in WebSocket, no Puppeteer). Headless, so no window ever opens.
//
//   const chrome = await launch()           // CHROME=/path/to/chrome to override
//   await chrome.send('Page.navigate', { url })
//   await chrome.close()

import { spawn } from 'node:child_process'
import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const CANDIDATES = ['/usr/bin/google-chrome-stable', '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser']

export async function launch({ executable = process.env.CHROME } = {}) {
  const exe = executable ?? CANDIDATES.find(p => existsSync(p))
  if (!exe) throw new Error('no Chrome found; set CHROME=/path/to/chrome')
  const profile = mkdtempSync(join(tmpdir(), 'kittex-demo-chrome-'))
  const child = spawn(exe, [
    '--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`,
    '--no-first-run', '--no-default-browser-check', '--hide-scrollbars', '--mute-audio',
    '--allow-file-access-from-files', '--font-render-hinting=none', '--force-color-profile=srgb',
    'about:blank',
  ], { stdio: ['ignore', 'ignore', 'pipe'] })
  const browserUrl = await new Promise((resolve, reject) => {
    let err = ''
    child.stderr.on('data', d => {
      err += d
      const m = /DevTools listening on (ws:\/\/\S+)/.exec(err)
      if (m) resolve(m[1])
    })
    child.on('exit', code => reject(new Error(`Chrome exited (${code}): ${err.slice(-500)}`)))
  })
  const port = new URL(browserUrl).port
  let page
  for (let i = 0; i < 50 && !page; i++) {
    const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()
    page = list.find(t => t.type === 'page')
    if (!page) await new Promise(r => setTimeout(r, 100))
  }
  const ws = new WebSocket(page.webSocketDebuggerUrl)
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject })
  let next = 1
  const waiting = new Map()
  const listeners = new Map()
  ws.onmessage = ev => {
    const msg = JSON.parse(ev.data)
    if (msg.id && waiting.has(msg.id)) {
      const { resolve, reject } = waiting.get(msg.id)
      waiting.delete(msg.id)
      if (msg.error) reject(new Error(`${msg.error.message} ${msg.error.data ?? ''}`))
      else resolve(msg.result)
    } else if (msg.method) {
      for (const fn of listeners.get(msg.method) ?? []) fn(msg.params)
    }
  }
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = next++
    waiting.set(id, { resolve, reject })
    ws.send(JSON.stringify({ id, method, params }))
  })
  const once = method => new Promise(resolve => {
    const fns = listeners.get(method) ?? []
    const fn = p => { listeners.set(method, fns.filter(f => f !== fn)); resolve(p) }
    listeners.set(method, [...fns, fn])
  })
  /** Evaluates an expression in the page, awaiting a promise; returns its value. */
  const evaluate = async expression => {
    const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text)
    return r.result.value
  }
  const close = async () => {
    const exited = new Promise(resolve => child.exitCode !== null ? resolve() : child.once('exit', resolve))
    try { await send('Browser.close') } catch { /* already gone */ }
    child.kill()
    await exited
    rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 })
  }
  return { send, once, evaluate, close }
}
