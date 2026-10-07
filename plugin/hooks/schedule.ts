// The order landed blocks are typeset in. After --resume the engine asks for
// a drawing of every block it lays out at once (the last 18 of a 100-reply
// session in the fullscreen layout, the last 67 on the main screen), oldest
// first, and the worker typesets one at a time: the newest blocks, the ones
// on screen, came last. Here a block that has to be typeset waits its turn,
// newest first, so the bottom of the screen is final first.
//
// Pure. A turn taken while the queue is idle first lets the rest of a wave
// arrive: `gather` is a round trip the caller makes for that (register.tsx:
// a state read, a hop to the engine and back), done GATHER_HOPS times, so no
// clock is needed (a mocked or missing one would stall the queue).

/** Round trips a turn taken on an idle queue waits for the rest of its wave. */
export const GATHER_HOPS = 2

export interface Turns {
  /** Resolves when it is this caller's turn; call the release it gives once its work is done (a second call does nothing). */
  take(gather?: () => Promise<unknown>): Promise<() => void>
  /** Callers waiting (not counting the one at work). */
  readonly waiting: number
}

export function newestFirst(): Turns {
  const stack: (() => void)[] = []
  let busy = false
  let gathering = false
  const pump = () => {
    if (busy || gathering) return
    const next = stack.pop()
    if (!next) return
    busy = true
    next()
  }
  return {
    async take(gather) {
      const turn = new Promise<() => void>(resolve => {
        let released = false
        stack.push(() =>
          resolve(() => {
            if (released) return
            released = true
            busy = false
            pump()
          }),
        )
      })
      if (!busy && !gathering && gather) {
        gathering = true
        try {
          for (let hop = 0; hop < GATHER_HOPS; hop++) await gather().catch(() => undefined)
        } finally {
          gathering = false
        }
      }
      pump()
      return turn
    },
    get waiting() {
      return stack.length
    },
  }
}
