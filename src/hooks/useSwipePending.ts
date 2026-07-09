import { useEffect, useRef, useState } from 'react'
import { useStore } from '../store/useStore'
import type { Bet } from '../types'

const RESOLVE_ANIMATION_MS = 900

// Tracks which event's swipe-bet card should show a loading state, so the UI can gray it
// out until the bet is confirmed instead of firing a one-off celebration animation.
export const useSwipePending = (bets: Bet[]) => {
  const [pendingEventId, setPendingEventId] = useState<string | null>(null)
  const [justResolvedEventId, setJustResolvedEventId] = useState<string | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const resolvedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const watchIdRef = useRef<string | null>(null)
  const pendingEventIdRef = useRef<string | null>(null)

  const clear = (resolvedByServer: boolean) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = null
    const eventId = pendingEventIdRef.current
    watchIdRef.current = null
    pendingEventIdRef.current = null
    setPendingEventId(null)

    if (resolvedByServer && eventId) {
      setJustResolvedEventId(eventId)
      if (resolvedTimeoutRef.current) clearTimeout(resolvedTimeoutRef.current)
      resolvedTimeoutRef.current = setTimeout(() => setJustResolvedEventId(null), RESOLVE_ANIMATION_MS)
    }
  }

  const startPending = (eventId: string, userId: string) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    // Read the freshest state directly — placeBet's set() call already ran synchronously
    // just before this, but the reactive `bets` prop here may not have re-rendered yet.
    const freshBets = useStore.getState().bets
    const bet = freshBets.find(b => b.eventId === eventId && b.userId === userId)
    setPendingEventId(eventId)
    pendingEventIdRef.current = eventId
    if (bet && bet.id.startsWith('pending-')) {
      // Real pending bet — watch for the server to swap in the confirmed id below.
      watchIdRef.current = bet.id
      timeoutRef.current = setTimeout(() => clear(false), 8000)
    } else {
      // This mutation path (stacking or side-switch) has no trackable async signal —
      // clear after a short beat so the card doesn't gray out forever.
      watchIdRef.current = null
      timeoutRef.current = setTimeout(() => clear(false), 600)
    }
  }

  useEffect(() => {
    if (!watchIdRef.current) return
    const stillPending = bets.some(b => b.id === watchIdRef.current)
    if (!stillPending) clear(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bets])

  useEffect(() => () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    if (resolvedTimeoutRef.current) clearTimeout(resolvedTimeoutRef.current)
  }, [])

  return { pendingEventId, justResolvedEventId, startPending }
}
