// The fullscreen registration's `onScreen` matcher: a streamed block is
// hooked once the engine reports where it is on screen (a range, or null for
// a block laid out off screen), never on its first render (none reported).
// A RegExp over the value as a string, so the engine logs no warning for the
// renders it doesn't select (an object matcher, `[{}, null]`, made it warn
// that `{}` can never match a null, on every resume).

import { describe, expect } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'

import { init } from '../hooks/core.js'
import { COLUMNS, startSession, test } from './support.ts'

async function stream($: Engine, text: string, id: string): Promise<string> {
  const lines = text.split(/(?<=\n)/)
  let shown = ''
  for (const [index, delta] of lines.entries()) {
    const result = await $.classic.MessageDisplay({ turn_id: 't', message_id: id, index, final: index === lines.length - 1, delta })
    shown += result.displayContent ?? delta
  }
  return shown
}

function mount($: Engine, text: string, onScreen: unknown, key: 'absent' | 'present' = 'present') {
  return $.ui.mount({
    plugin: 'kittex',
    surface: 'terminal',
    component: 'AssistantMessage',
    props: { text, isFirstOfReply: true, ...(key === 'present' ? { onScreen } : {}) } as never,
    viewport: { columns: COLUMNS, rows: 50, isFullscreen: true },
  })
}

describe('onScreen matcher', () => {
  test('a streamed block is kittex\'s once onScreen is a range or null; the engine\'s while there is none', async ($, on) => {
    await startSession($, on)
    await init()
    const shown = await stream($, 'Let $x$ be:\n\n$$\ne^{i\\pi} + 1 = 0\n$$\n', 'm1')
    const engine = { type: 'Text', children: [shown] }
    expect(await (await mount($, shown, undefined, 'absent')).drawn()).toEqual(engine)
    expect(await (await mount($, shown, undefined)).drawn()).toEqual(engine)
    for (const onScreen of [{ first: 0, last: 5, of: 6 }, null]) {
      const drawn = await (await mount($, shown, onScreen)).drawn()
      expect(drawn).not.toEqual(engine)
      expect(JSON.stringify(drawn)).toContain('"type":"Image"')
    }
  })

  test('LaTeX as written off screen is drawn by kittex too (the source matcher), with nothing for the fullscreen one to warn about', async ($, on) => {
    await startSession($, on)
    const text = 'Plain $$x^2$$ text'
    const drawn = await (await mount($, text, null)).drawn()
    expect(drawn).not.toEqual({ type: 'Text', children: [text] })
  })
})
