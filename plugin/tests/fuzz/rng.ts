// A small seeded random source for the fuzz generator: mulberry32, so a seed
// always gives the same reply and terminal on every machine.

export class Rng {
  private state: number

  constructor(seed: number) {
    this.state = seed >>> 0 || 0x9e3779b9
  }

  /** A float in [0, 1). */
  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0
    let t = this.state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  /** An integer in [lo, hi], both included. */
  int(lo: number, hi: number): number {
    return lo + Math.floor(this.next() * (hi - lo + 1))
  }

  /** True with probability p. */
  chance(p: number): boolean {
    return this.next() < p
  }

  pick<T>(items: readonly T[]): T {
    return items[Math.floor(this.next() * items.length)]!
  }

  /** One of the items, each with its weight. */
  weighted<T>(items: readonly (readonly [number, T])[]): T {
    const total = items.reduce((sum, [w]) => sum + w, 0)
    let at = this.next() * total
    for (const [w, item] of items) {
      at -= w
      if (at < 0) return item
    }
    return items[items.length - 1]![1]
  }

  /** A seed for a sub-generator, so one part's draws don't shift another's. */
  fork(): Rng {
    return new Rng(Math.floor(this.next() * 4294967296))
  }
}
