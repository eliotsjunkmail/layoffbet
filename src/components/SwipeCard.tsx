import { useRef, useState, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Building2, Clock, MessageSquare, ChevronRight } from 'lucide-react'
import type { Event } from '../types'
import { getProbability, timeUntil } from '../utils/odds'

interface SwipeCardProps {
  event: Event
  onSwipe: (side: 'yes' | 'no') => void
  betAmount: number
  index: number
  commentCount: number
}

const THRESHOLD = 80

export const SwipeCard = ({ event, onSwipe, betAmount, index, commentCount }: SwipeCardProps) => {
  const [deltaX, setDeltaX] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [animOut, setAnimOut] = useState<'yes' | 'no' | null>(null)
  const startX = useRef(0)
  const navigate = useNavigate()
  const prob = getProbability(event.yesPool, event.noPool)

  const triggerSwipe = useCallback(
    (side: 'yes' | 'no') => {
      setAnimOut(side)
      setTimeout(() => {
        onSwipe(side)
        setAnimOut(null)
        setDeltaX(0)
      }, 280)
    },
    [onSwipe]
  )

  const onStart = (x: number) => {
    if (index !== 0) return
    startX.current = x
    setIsDragging(true)
  }

  const onMove = useCallback((x: number) => {
    if (!isDragging) return
    setDeltaX(x - startX.current)
  }, [isDragging])

  const onEnd = useCallback(() => {
    if (!isDragging) return
    setIsDragging(false)
    if (deltaX > THRESHOLD) triggerSwipe('yes')
    else if (deltaX < -THRESHOLD) triggerSwipe('no')
    else setDeltaX(0)
  }, [isDragging, deltaX, triggerSwipe])

  useEffect(() => {
    if (!isDragging) return
    const mm = (e: MouseEvent) => onMove(e.clientX)
    const mu = () => onEnd()
    document.addEventListener('mousemove', mm)
    document.addEventListener('mouseup', mu)
    return () => {
      document.removeEventListener('mousemove', mm)
      document.removeEventListener('mouseup', mu)
    }
  }, [isDragging, onMove, onEnd])

  const rotation = deltaX * 0.05
  const yesOpacity = Math.min(Math.max(deltaX / THRESHOLD, 0), 1)
  const noOpacity = Math.min(Math.max(-deltaX / THRESHOLD, 0), 1)
  const translateX = animOut === 'yes' ? 400 : animOut === 'no' ? -400 : deltaX
  const translateY = index * 10
  const scale = 1 - index * 0.04

  return (
    <div
      className="absolute inset-0 cursor-grab active:cursor-grabbing select-none"
      style={{
        transform: `translateX(${translateX}px) translateY(${translateY}px) rotate(${index === 0 ? rotation : 0}deg) scale(${scale})`,
        transition: isDragging ? 'none' : animOut ? 'transform 0.28s ease-out, opacity 0.28s ease-out' : 'transform 0.3s ease',
        opacity: animOut ? 0 : 1,
        zIndex: 10 - index,
      }}
      onMouseDown={e => { e.preventDefault(); onStart(e.clientX) }}
      onTouchStart={e => onStart(e.touches[0].clientX)}
      onTouchMove={e => { if (isDragging) setDeltaX(e.touches[0].clientX - startX.current) }}
      onTouchEnd={onEnd}
    >
      <div className="h-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl overflow-hidden flex flex-col shadow-lg dark:shadow-none">
        {/* YES overlay */}
        <div
          className="absolute inset-0 rounded-2xl bg-emerald-500/10 border-2 border-emerald-500 flex items-start justify-start p-5 z-10 pointer-events-none"
          style={{ opacity: yesOpacity }}
        >
          <span className="text-emerald-600 dark:text-emerald-400 font-black text-3xl tracking-widest border-2 border-emerald-500 px-3 py-1 rounded-lg rotate-[-15deg]">
            YES
          </span>
        </div>

        {/* NO overlay */}
        <div
          className="absolute inset-0 rounded-2xl bg-rose-500/10 border-2 border-rose-500 flex items-start justify-end p-5 z-10 pointer-events-none"
          style={{ opacity: noOpacity }}
        >
          <span className="text-rose-600 dark:text-rose-400 font-black text-3xl tracking-widest border-2 border-rose-500 px-3 py-1 rounded-lg rotate-[15deg]">
            NO
          </span>
        </div>

        <div className="px-5 pt-5 pb-3">
          <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-slate-400 mb-3">
            <Building2 className="w-3.5 h-3.5" />
            <span>{event.companyName}</span>
            <span className="ml-auto flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {timeUntil(event.expiresAt)}
            </span>
          </div>
          <h2 className="text-gray-900 dark:text-white font-semibold text-lg leading-snug">{event.title}</h2>
        </div>

        <div className="px-5 flex-1 overflow-hidden">
          <p className="text-gray-500 dark:text-slate-400 text-sm leading-relaxed line-clamp-4">{event.description}</p>
        </div>

        <div className="px-5 pt-4">
          <div className="flex justify-between text-xs font-medium mb-1.5">
            <span className="text-emerald-600 dark:text-emerald-400">YES {prob.yes}%</span>
            <span className="text-rose-600 dark:text-rose-400">NO {prob.no}%</span>
          </div>
          <div className="h-2 rounded-full bg-gray-100 dark:bg-slate-700 overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all"
              style={{ width: `${prob.yes}%` }}
            />
          </div>
        </div>

        <div className="px-5 pb-5 pt-3 flex items-center justify-between text-xs text-gray-400 dark:text-slate-500">
          <div className="flex items-center gap-1">
            <MessageSquare className="w-3.5 h-3.5" />
            <span>{commentCount}</span>
          </div>
          <div>{event.yesPool + event.noPool} coins wagered</div>
          <button
            className="flex items-center gap-1 text-violet-600 dark:text-violet-400 hover:text-violet-500 transition-colors"
            onMouseDown={e => e.stopPropagation()}
            onClick={() => navigate(`/event/${event.id}`)}
          >
            Details <ChevronRight className="w-3 h-3" />
          </button>
        </div>

        <div className="bg-gray-50 dark:bg-slate-900/80 px-5 py-3 text-center text-xs text-gray-400 dark:text-slate-500 border-t border-gray-100 dark:border-slate-700">
          Betting <span className="text-violet-600 dark:text-violet-300 font-semibold">{betAmount} coins</span> · Swipe right = YES · Swipe left = NO
        </div>
      </div>
    </div>
  )
}
