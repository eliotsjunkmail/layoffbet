import { useRef, useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'

interface HintConfig {
  label: string
  sublabel?: string
}

interface SwipeCardProps {
  onSwipeYes: () => void
  onSwipeNo: () => void
  disabled?: boolean
  loading?: boolean
  children: React.ReactNode
  cardClassName?: string
  onClick?: () => void
  demoActive?: boolean
  rightHint?: HintConfig
  leftHint?: HintConfig
}

const THRESHOLD = 80

export const SwipeCard = ({ onSwipeYes, onSwipeNo, disabled, loading, children, cardClassName = '', onClick, demoActive, rightHint, leftHint }: SwipeCardProps) => {
  const [dx, setDx] = useState(0)
  const [active, setActive] = useState(false)
  const startX = useRef(0)
  const startY = useRef(0)
  const dirLocked = useRef<'h' | 'v' | null>(null)
  const didSwipe = useRef(false)
  const demoCancelled = useRef(false)
  const demoRaf = useRef<number | null>(null)
  const isMouseDown = useRef(false)

  const progress = Math.min(Math.abs(dx) / THRESHOLD, 1)
  const isRight = dx > 0
  const isDisabled = disabled || loading

  useEffect(() => {
    if (!demoActive) return
    demoCancelled.current = false

    const animSeg = (from: number, to: number, dur: number) =>
      new Promise<void>(resolve => {
        const t0 = performance.now()
        const tick = (now: number) => {
          if (demoCancelled.current) return resolve()
          const t = Math.min((now - t0) / dur, 1)
          const e = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
          setDx(from + (to - from) * e)
          setActive(true)
          if (t < 1) { demoRaf.current = requestAnimationFrame(tick) } else { resolve() }
        }
        demoRaf.current = requestAnimationFrame(tick)
      })

    const pause = (ms: number) =>
      new Promise<void>(resolve => setTimeout(() => { if (!demoCancelled.current) resolve() }, ms))

    const run = async () => {
      await pause(700)
      if (demoCancelled.current) return
      await animSeg(0, 65, 900)
      await pause(400)
      await animSeg(65, 0, 600)
      await pause(300)
      await animSeg(0, -65, 900)
      await pause(400)
      await animSeg(-65, 0, 600)
      if (!demoCancelled.current) { setDx(0); setActive(false) }
    }
    run()

    return () => {
      demoCancelled.current = true
      if (demoRaf.current) cancelAnimationFrame(demoRaf.current)
    }
  }, [demoActive])

  const onTouchStart = (e: React.TouchEvent) => {
    demoCancelled.current = true
    if (demoRaf.current) cancelAnimationFrame(demoRaf.current)
    startX.current = e.touches[0].clientX
    startY.current = e.touches[0].clientY
    dirLocked.current = null
    didSwipe.current = false
    setActive(false)
  }

  const onTouchMove = (e: React.TouchEvent) => {
    if (isDisabled) return
    const newDx = e.touches[0].clientX - startX.current
    const newDy = e.touches[0].clientY - startY.current
    if (!dirLocked.current) {
      if (Math.abs(newDx) > 6 || Math.abs(newDy) > 6) {
        dirLocked.current = Math.abs(newDx) > Math.abs(newDy) ? 'h' : 'v'
      }
    }
    if (dirLocked.current === 'h') {
      e.preventDefault()
      setActive(true)
      setDx(newDx)
    }
  }

  const onTouchEnd = (e: React.TouchEvent) => {
    if (dirLocked.current !== 'h') { setDx(0); setActive(false); return }
    const finalDx = e.changedTouches[0].clientX - startX.current
    setActive(false)
    setDx(0)
    if (finalDx > THRESHOLD) { didSwipe.current = true; onSwipeYes() }
    else if (finalDx < -THRESHOLD) { didSwipe.current = true; onSwipeNo() }
  }

  const onMouseDown = (e: React.MouseEvent) => {
    if (isDisabled || e.button !== 0) return
    demoCancelled.current = true
    if (demoRaf.current) cancelAnimationFrame(demoRaf.current)
    isMouseDown.current = true
    startX.current = e.clientX
    startY.current = e.clientY
    dirLocked.current = null
    didSwipe.current = false
    setActive(false)
  }

  const onMouseMove = (e: React.MouseEvent) => {
    if (!isMouseDown.current || isDisabled) return
    const newDx = e.clientX - startX.current
    const newDy = e.clientY - startY.current
    if (!dirLocked.current) {
      if (Math.abs(newDx) > 6 || Math.abs(newDy) > 6) {
        dirLocked.current = Math.abs(newDx) > Math.abs(newDy) ? 'h' : 'v'
      }
    }
    if (dirLocked.current === 'h') {
      e.preventDefault()
      setActive(true)
      setDx(newDx)
    }
  }

  const onMouseUp = (e: React.MouseEvent) => {
    isMouseDown.current = false
    if (dirLocked.current !== 'h') { setDx(0); setActive(false); return }
    const finalDx = e.clientX - startX.current
    setActive(false)
    setDx(0)
    if (finalDx > THRESHOLD) { didSwipe.current = true; onSwipeYes() }
    else if (finalDx < -THRESHOLD) { didSwipe.current = true; onSwipeNo() }
  }

  const onMouseLeave = (e: React.MouseEvent) => {
    if (isMouseDown.current && dirLocked.current === 'h') {
      isMouseDown.current = false
      const finalDx = e.clientX - startX.current
      setActive(false)
      setDx(0)
      if (finalDx > THRESHOLD) { didSwipe.current = true; onSwipeYes() }
      else if (finalDx < -THRESHOLD) { didSwipe.current = true; onSwipeNo() }
    }
  }

  const rotation = dx * 0.035

  return (
    <div className="relative" style={{ touchAction: 'pan-y' }}>
      <div className="absolute inset-0 rounded-xl flex items-stretch overflow-hidden">
        <div
          className="w-1/2 flex items-center px-4 rounded-l-xl bg-emerald-50 dark:bg-emerald-900/40 border border-emerald-200 dark:border-emerald-700"
          style={{ opacity: isRight ? progress : 0 }}
        >
          <div>
            <div className="text-emerald-600 dark:text-emerald-400 font-black text-sm leading-none">{rightHint?.label ?? '✓ YES'}</div>
            {(rightHint?.sublabel ?? '10 coins') && (
              <div className="text-emerald-500/80 dark:text-emerald-500/70 text-xs mt-0.5">{rightHint?.sublabel ?? '10 coins'}</div>
            )}
          </div>
        </div>
        <div
          className="w-1/2 flex items-center justify-end px-4 rounded-r-xl bg-rose-50 dark:bg-rose-900/40 border border-rose-200 dark:border-rose-700"
          style={{ opacity: !isRight && dx !== 0 ? progress : 0 }}
        >
          <div className="text-right">
            <div className="text-rose-600 dark:text-rose-400 font-black text-sm leading-none">{leftHint?.label ?? '✕ NO'}</div>
            {(leftHint?.sublabel ?? '10 coins') && (
              <div className="text-rose-500/80 dark:text-rose-500/70 text-xs mt-0.5">{leftHint?.sublabel ?? '10 coins'}</div>
            )}
          </div>
        </div>
      </div>

      <div
        className={`relative ${cardClassName}`}
        style={{
          transform: `translateX(${dx}px) rotate(${rotation}deg)`,
          transition: active ? 'none' : 'transform 0.22s cubic-bezier(0.25,0.46,0.45,0.94)',
          willChange: 'transform',
          cursor: isDisabled ? 'default' : 'grab',
          WebkitTapHighlightColor: 'transparent',
        }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseLeave}
        onClick={() => { if (!didSwipe.current) onClick?.() }}
      >
        {children}
        {loading && (
          <div className="absolute inset-0 rounded-xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-[1px] flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400 dark:text-slate-500" />
          </div>
        )}
      </div>
    </div>
  )
}
