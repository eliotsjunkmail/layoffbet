import { useEffect, useState } from 'react'

const REVEAL_MS = 900

// Given the list of ids that should get a one-time "reveal" animation (e.g. WARN
// notice events on their first render), returns a per-id checker that's true for
// any id present at the FIRST render, until a fixed delay after mount — then every
// id settles back to normal, non-animating rendering for the rest of the page's life.
//
// Deliberately avoids ref-mutation inside render or inside a cancellable effect:
// React StrictMode double-invokes both, and a "have I already run" ref guard would
// see itself as already-tripped on the second (surviving) invocation, silently
// cancelling the real animation before it ever plays.
export const useAnimateOnce = (revealIds: string[]) => {
  const [revealSet] = useState<Set<string>>(() => new Set(revealIds))
  const [revealDone, setRevealDone] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setRevealDone(true), REVEAL_MS)
    return () => clearTimeout(timer)
  }, [])

  return (id: string) => !revealDone && revealSet.has(id)
}
