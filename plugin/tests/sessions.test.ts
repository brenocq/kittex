// A new session in the same process (/clear, /resume of another conversation
// from inside one): the host's $.state is the session's, so kittex.env reads
// empty there while session.start does not run again. Measured on 2.1.293:
// before this was handled, the next request carried no kittex section and
// replies' math went out as raw TeX.

import { describe, expect } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'
import type { On } from 'claude-code'

import { init, measureDisplay } from '../hooks/core.js'
import { DIAGRAM_INSTRUCTIONS, MATH_INSTRUCTIONS, PREVIEW_PAD, renderEnvFor, SECTION_ID } from '../hooks/math.ts'
import { CELL, COLUMNS, COMPOSE, KITTY, kittyEnv, startSession, test } from './support.ts'

const TEX = 'e^{i\\pi} + 1 = 0'

/** The host's state as a new session holds it: kittex.env unset (until kittex writes it again). */
function newSessions(on: On): () => void {
  let fresh = false
  on('state.get', ($, e, next) => (fresh && e.plugin === 'kittex' && e.key === 'env' ? { value: { value: undefined, version: 0 } } : next(e)))
  on('state.set', ($, e, next) => {
    if (e.plugin === 'kittex' && e.key === 'env') fresh = false
    return next(e)
  })
  return () => {
    fresh = true
  }
}

/** TeX's two commands answering, so the diagram line is in the instructions. */
const withTex = (argv: readonly string[]) => ((argv[0] === 'latex' || argv[0] === 'dvisvgm') && argv[1] === '--version' ? { exitCode: 0, stdout: `${argv[0]} 1.0\n` } : undefined)

/** A policy plugin above kittex that drops its sections (cc-plugin-sec-default's effect). */
const policy = {
  name: 'policy',
  tier: 'prepend' as const,
  register(on: On) {
    on('prompt.compose', async ($, e, next) => {
      const composed = await next({ ...e, promptModel: e.promptModel ?? 'claude', tools: e.tools ?? [], outputStyle: e.outputStyle ?? null, traits: e.traits ?? [] })
      return { sections: composed.sections.filter(section => !section.id.startsWith('kittex:')) }
    })
  },
}

async function stream($: Engine, id: string, flushes: readonly string[]): Promise<string> {
  const shown: string[] = []
  for (const [index, delta] of flushes.entries()) {
    const result = await $.classic.MessageDisplay({ turn_id: 't', message_id: id, index, final: index === flushes.length - 1, delta })
    shown.push(result.displayContent ?? delta)
  }
  return shown.join('')
}

function mountReply($: Engine, text: string) {
  return $.ui.mount({ plugin: 'kittex', surface: 'terminal', component: 'AssistantMessage', props: { text, isFirstOfReply: true }, viewport: { columns: COLUMNS, rows: 50, isFullscreen: false } })
}

describe('a new session in the same process', () => {
  for (const source of ['clear', 'resume'] as const) {
    test(`after ${source === 'clear' ? '/clear' : '/resume'}, the next request still carries the section, with its diagram line`, async ($, on) => {
      const switchSession = newSessions(on)
      on('classic.SessionStart', () => ({}))
      await startSession($, on, KITTY, 'dark', CELL, withTex)
      switchSession()
      await $.classic.SessionStart({ source })
      const { sections } = await $.prompt.compose(COMPOSE)
      expect(sections.find(one => one.id === SECTION_ID)?.text).toBe(`${MATH_INSTRUCTIONS} ${DIAGRAM_INSTRUCTIONS}`)
    })
  }

  test('whichever hook comes first: a request composed before any other hook of the new session', async ($, on) => {
    const switchSession = newSessions(on)
    await startSession($, on)
    switchSession()
    const { sections } = await $.prompt.compose(COMPOSE)
    expect(sections.find(one => one.id === SECTION_ID)?.text).toBe(MATH_INSTRUCTIONS)
  })

  test('a reply streamed after /clear is previewed and lands as an image', async ($, on) => {
    const switchSession = newSessions(on)
    on('classic.SessionStart', () => ({}))
    await startSession($, on)
    await init()
    switchSession()
    await $.classic.SessionStart({ source: 'clear' })
    const landed = await stream($, 'm1', ["Euler's identity:\n", '$$\n', `${TEX}\n`, '$$\n', 'is beautiful.'])
    expect(landed).not.toContain('$$')
    expect(landed).toContain(PREVIEW_PAD)
    const ui = await mountReply($, landed)
    expect(await ui.find({ type: 'Image' })).toMatchObject({ props: { rows: measureDisplay(TEX, renderEnvFor(kittyEnv(), COLUMNS)).rows, alt: TEX } })
  })

  test('a block drawn first thing in the new session (before any hook could store the env) is an image too', async ($, on) => {
    const switchSession = newSessions(on)
    await startSession($, on)
    await init()
    switchSession()
    const ui = await mountReply($, `Euler's identity:\n\n$$${TEX}$$\n\nis beautiful.`)
    expect(await ui.find({ type: 'Image' })).toMatchObject({ props: { alt: TEX } })
  })

  test('where a policy drops the section, the first prompt after /clear carries the instructions, diagram line included', { plugins: [policy] }, async ($, on) => {
    const switchSession = newSessions(on)
    on('prompt.submit', ($, e) => ({ text: e.text, context: e.context }))
    on('classic.SessionStart', () => ({}))
    await startSession($, on, KITTY, 'dark', CELL, withTex)
    const submit = (text: string) => $.prompt.submit({ text, wait: false, origin: { kind: 'composer' } })
    const all = `${MATH_INSTRUCTIONS} ${DIAGRAM_INSTRUCTIONS}`
    expect((await submit('first')).context).toEqual([all])
    switchSession()
    await $.classic.SessionStart({ source: 'clear' })
    expect((await submit('after clear')).context).toEqual([all])
    expect((await submit('again')).context ?? []).toEqual([])
  })
})
