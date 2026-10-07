// The order resumed blocks are typeset in (schedule.ts): the newest first,
// once the rest of a wave has arrived; nothing stalls without a clock.

import { describe, expect } from 'claude-code/testing'

import { GATHER_HOPS, newestFirst } from '../hooks/schedule.ts'
import { test } from './support.ts'

/** A round trip: a few promise turns, as a hop to the engine and back would take. */
const hop = async () => {
  for (let i = 0; i < 3; i++) await Promise.resolve()
}

describe('newest first', () => {
  test('a wave is typeset newest first once it has arrived', async () => {
    const turns = newestFirst()
    const order: number[] = []
    const work = async (n: number, delay: number) => {
      for (let i = 0; i < delay; i++) await Promise.resolve()
      const release = await turns.take(hop)
      order.push(n)
      release()
    }
    // Blocks 0..5 arrive one after another, as the engine asks oldest first.
    await Promise.all([0, 1, 2, 3, 4, 5].map(n => work(n, n)))
    expect(order[0]).toBe(5)
    expect(order).toHaveLength(6)
    expect(new Set(order).size).toBe(6)
    expect(GATHER_HOPS).toBeGreaterThan(0)
  })

  test('one at a time; a turn released twice frees one place; no gather, no wait', async () => {
    const turns = newestFirst()
    const first = await turns.take()
    let second = false
    const next = turns.take().then(release => {
      second = true
      return release
    })
    await hop()
    expect(second).toBe(false)
    expect(turns.waiting).toBe(1)
    first()
    first()
    ;(await next)()
    expect(second).toBe(true)
    expect(turns.waiting).toBe(0)
  })
})
