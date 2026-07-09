import { useEffect, useRef, useState } from 'react'

// The YES/NO odds bar on an event card. When `animate` is true (right as a swipe-bet
// gets confirmed by the server), it fills from 0 up to the current value instead of
// snapping straight to it.
export const ProbabilityBar = ({ pct, dominant, animate }: { pct: number; dominant: 'yes' | 'no'; animate?: boolean }) => {
  const [displayPct, setDisplayPct] = useState(animate ? 0 : pct)
  const [transitioning, setTransitioning] = useState(false)
  const rafRefs = useRef<number[]>([])

  useEffect(() => {
    rafRefs.current.forEach(cancelAnimationFrame)
    rafRefs.current = []

    if (!animate) {
      setTransitioning(false)
      setDisplayPct(pct)
      return
    }

    // Snap to 0 with no transition first, then — once the browser has actually
    // painted that frame — turn the transition on and set the real target width.
    // Doing both in one step would transition the 0-reset too, which cancels out
    // against the reveal and reads as no animation at all.
    setTransitioning(false)
    setDisplayPct(0)
    const raf1 = requestAnimationFrame(() => {
      const raf2 = requestAnimationFrame(() => {
        setTransitioning(true)
        setDisplayPct(pct)
      })
      rafRefs.current.push(raf2)
    })
    rafRefs.current.push(raf1)

    return () => {
      rafRefs.current.forEach(cancelAnimationFrame)
      rafRefs.current = []
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animate])

  useEffect(() => {
    if (!animate) setDisplayPct(pct)
  }, [pct, animate])

  return (
    <div className="relative h-1.5 rounded-full bg-gray-100 dark:bg-slate-700 overflow-hidden mb-1.5">
      <div
        className={`absolute h-full rounded-full ${dominant === 'yes' ? 'left-0 bg-emerald-500' : 'right-0 bg-rose-500'}`}
        style={{ width: `${displayPct}%`, transition: transitioning ? 'width 900ms cubic-bezier(0.22, 0.61, 0.36, 1)' : 'none' }}
      />
    </div>
  )
}
