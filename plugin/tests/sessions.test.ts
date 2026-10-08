// A new session in the same process (/clear, /resume of another conversation
// from inside one): the host's $.state is the session's, so kittex.env reads
// empty there while session.start does not run again. Measured on 2.1.293:
// before this was handled, the next request carried no kittex section and
// replies' math went out as raw TeX.

import { describe, expect } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'
import type { On } from 'claude-code'

import { init, measureDisplay } from '../hooks/core.js'
import { DIAGRAM_INSTRUCTIONS, INSTRUCTED_LIMIT, instructionsKey, instructionsNeeded, MATH_INSTRUCTIONS, PREVIEW_PAD, recordInstructed, renderEnvFor, SECTION_ID, UPDATED_INSTRUCTIONS } from '../hooks/math.ts'
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

/**
 * The host beneath kittex for the instructions' bookkeeping: the session's
 * id and whether its conversation has messages yet, and kittex's $.store.
 */
function host(on: On, start: { session?: string; messages?: number; store?: Record<string, unknown>; drop?: boolean } = {}) {
  const world = { session: start.session ?? 'one', messages: start.messages ?? 0, store: new Map(Object.entries(start.store ?? {})) }
  on('session.id', () => ({ value: world.session }))
  on('session.messages', () => ({ value: Array.from({ length: world.messages }, () => ({ role: 'user', text: 'earlier', toolUses: [] })) }) as never)
  on('store.get', ($, e) => ({ value: world.store.get(e.key) }))
  on('store.set', ($, e) => {
    world.store.set(e.key, e.value)
    return { value: undefined }
  })
  on('prompt.submit', ($, e) => (start.drop ? { drop: 'blocked by a settings hook' } : { text: e.text, context: e.context }))
  on('classic.SessionStart', () => ({}))
  return world
}

const submit = ($: Engine, text: string) => $.prompt.submit({ text, wait: false, origin: { kind: 'composer' } }).then(entered => entered.context ?? [])

/** A plugin above kittex that fills the facts a test's prompt.compose call leaves out (the engine fills them from the session). */
const facts = {
  name: 'facts',
  tier: 'prepend' as const,
  register(on: On) {
    on('prompt.compose', ($, e, next) => next({ ...e, promptModel: e.promptModel ?? 'claude', tools: e.tools ?? [], outputStyle: e.outputStyle ?? null, traits: e.traits ?? [] }))
  },
}

describe("a conversation whose system prompt holds older instructions, or none", () => {
  const ALL = `${MATH_INSTRUCTIONS} ${DIAGRAM_INSTRUCTIONS}`

  test('a new conversation is composed with them: no context, and it is recorded', { plugins: [facts] }, async ($, on) => {
    const world = host(on)
    await startSession($, on)
    expect(await submit($, 'first')).toEqual([])
    expect(world.store.get('instructed')).toEqual({ one: instructionsKey(MATH_INSTRUCTIONS) })
    world.messages = 2
    expect(await submit($, 'second')).toEqual([])
  })

  test('resumed from a kittex that never recorded it (or a session without kittex): the first prompt carries them, once', { plugins: [facts] }, async ($, on) => {
    host(on, { messages: 4 })
    await startSession($, on, KITTY, 'dark', CELL, withTex)
    expect(await submit($, 'first')).toEqual([`${UPDATED_INSTRUCTIONS} ${ALL}`])
    expect(await submit($, 'second')).toEqual([])
  })

  test('resumed with the same instructions recorded: nothing to add', { plugins: [facts] }, async ($, on) => {
    host(on, { messages: 4, store: { instructed: { one: instructionsKey(ALL) } } })
    await startSession($, on, KITTY, 'dark', CELL, withTex)
    expect(await submit($, 'first')).toEqual([])
  })

  test('recorded with older ones (kittex upgraded or reloaded, TeX found since): the next prompt brings them up to date', { plugins: [facts] }, async ($, on) => {
    const world = host(on, { messages: 4, store: { instructed: { one: instructionsKey(MATH_INSTRUCTIONS) } } })
    await startSession($, on, KITTY, 'dark', CELL, withTex)
    expect(await submit($, 'first')).toEqual([`${UPDATED_INSTRUCTIONS} ${ALL}`])
    expect((world.store.get('instructed') as Record<string, string>).one).toBe(instructionsKey(ALL))
    expect(await submit($, 'second')).toEqual([])
  })

  test('after /clear or compaction the system prompt is composed anew: no context, even where the conversation had older ones', { plugins: [facts] }, async ($, on) => {
    const world = host(on, { messages: 4, store: { instructed: { one: 'older' } } })
    await startSession($, on)
    await $.classic.SessionStart({ source: 'compact' })
    expect(await submit($, 'after compaction')).toEqual([])
    world.session = 'two'
    await $.classic.SessionStart({ source: 'clear' })
    world.messages = 0
    expect(await submit($, 'after clear')).toEqual([])
    expect(world.store.get('instructed')).toEqual({ one: instructionsKey(MATH_INSTRUCTIONS), two: instructionsKey(MATH_INSTRUCTIONS) })
  })

  test('another conversation resumed from inside the session: its own record decides', { plugins: [facts] }, async ($, on) => {
    const world = host(on)
    await startSession($, on)
    expect(await submit($, 'first')).toEqual([])
    world.session = 'other'
    world.messages = 6
    await $.classic.SessionStart({ source: 'resume' })
    expect(await submit($, 'in the resumed one')).toEqual([`${UPDATED_INSTRUCTIONS} ${MATH_INSTRUCTIONS}`])
  })

  test('a prompt that does not enter records nothing', { plugins: [facts] }, async ($, on) => {
    const world = host(on, { messages: 4, drop: true })
    await startSession($, on)
    await submit($, 'dropped').catch(() => [])
    expect(world.store.get('instructed')).toBeUndefined()
  })

  test('the record: newest last, bounded, keyed by the text', () => {
    expect(instructionsKey(MATH_INSTRUCTIONS)).toMatch(/^[0-9a-f]{8}$/)
    expect(instructionsKey(MATH_INSTRUCTIONS)).not.toBe(instructionsKey(`${MATH_INSTRUCTIONS} ${DIAGRAM_INSTRUCTIONS}`))
    let record = {}
    for (let i = 0; i < INSTRUCTED_LIMIT + 5; i++) record = recordInstructed(record, `s${i}`, 'k')
    expect(Object.keys(record)).toHaveLength(INSTRUCTED_LIMIT)
    expect(Object.keys(record)[0]).toBe('s5')
    expect(Object.keys(recordInstructed(record, 's5', 'k2')).at(-1)).toBe('s5')
    expect(instructionsNeeded({ fresh: true, byContext: false, held: undefined, key: 'k' })).toBe(false)
    expect(instructionsNeeded({ fresh: true, byContext: true, held: 'k', key: 'k' })).toBe(true)
    expect(instructionsNeeded({ fresh: false, byContext: false, held: 'j', key: 'k' })).toBe(true)
    expect(instructionsNeeded({ fresh: false, byContext: true, held: 'k', key: 'k' })).toBe(false)
  })
})
