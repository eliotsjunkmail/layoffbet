import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { CheckCircle, Clock, Pin, ChevronRight } from 'lucide-react'
import { useStore } from '../store/useStore'
import { Layout } from '../components/Layout'
import { SwipeCard } from '../components/SwipeCard'
import { timeUntil, betMovementStr } from '../utils/odds'

const barProps = (yesPool: number, noPool: number) => {
  const total = yesPool + noPool
  if (total === 0) return { dominant: 'yes' as const, pct: 50 }
  const yesPct = Math.round((yesPool / total) * 100)
  if (yesPct >= 50) return { dominant: 'yes' as const, pct: yesPct }
  return { dominant: 'no' as const, pct: 100 - yesPct }
}

export const Bets = () => {
  const currentUser = useStore(s => s.currentUser)
  const bets = useStore(s => s.bets)
  const events = useStore(s => s.events)
  const companies = useStore(s => s.companies)
  const getEffectiveStatus = useStore(s => s.getEffectiveStatus)
  const placeBet = useStore(s => s.placeBet)
  const pinnedEventIds = useStore(s => s.pinnedEventIds)
  const togglePinnedEvent = useStore(s => s.togglePinnedEvent)
  const [tab, setTab] = useState<'active' | 'completed'>('active')
  const [swipeFlash, setSwipeFlash] = useState<{ id: string; side: 'yes' | 'no' } | null>(null)
  const [toast, setToast] = useState('')
  const navigate = useNavigate()

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2000) }

  const handleSwipeBet = (eventId: string, side: 'yes' | 'no') => {
    const event = events.find(e => e.id === eventId)
    const movement = event ? betMovementStr(event.yesPool, event.noPool, side, 10) : ''
    if (placeBet(eventId, side, 10)) {
      setSwipeFlash({ id: eventId, side })
      setTimeout(() => setSwipeFlash(null), 600)
      showToast(`${side === 'yes' ? '✓ YES' : '✕ NO'} · 10 coins · ${movement}`)
    } else {
      showToast('Already bet or not enough coins')
    }
  }

  const myBets = bets.filter(b => b.userId === currentUser?.id)

  // Union of bet events + pinned events
  const allEventIds = Array.from(new Set([
    ...myBets.map(b => b.eventId),
    ...pinnedEventIds,
  ]))

  const allItems = allEventIds
    .map(eventId => {
      const event = events.find(e => e.id === eventId)
      if (!event) return null
      const status = getEffectiveStatus(event)
      const bet = myBets.find(b => b.eventId === eventId)
      const isPinned = pinnedEventIds.includes(eventId)
      return { event, status, bet, isPinned }
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)

  const activeItems = allItems.filter(x => x.status === 'active')
  const completedItems = allItems.filter(x => x.status !== 'active')
    .sort((a, b) => {
      const aTime = a.bet?.createdAt ?? a.event.createdAt
      const bTime = b.bet?.createdAt ?? b.event.createdAt
      return new Date(bTime).getTime() - new Date(aTime).getTime()
    })

  // Group by company, preserving insertion order
  const groupByCompany = (items: typeof allItems) => {
    const map = new Map<string, { companyName: string; slug: string; items: typeof allItems }>()
    items.forEach(item => {
      const cid = item.event.companyId
      if (!map.has(cid)) {
        const company = companies.find(c => c.id === cid)
        map.set(cid, { companyName: item.event.companyName, slug: company?.slug ?? cid, items: [] })
      }
      map.get(cid)!.items.push(item)
    })
    return Array.from(map.values())
  }

  const shown = tab === 'active' ? groupByCompany(activeItems) : groupByCompany(completedItems)
  const totalShown = tab === 'active' ? activeItems.length : completedItems.length

  // Global card index for demo (first card across all companies)
  let cardIndex = 0

  const SubHeader = ({ side }: { side: 'yes' | 'no' | 'pinned' }) => (
    <div className="flex items-center gap-2 mb-2">
      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${side === 'yes' ? 'bg-emerald-500' : side === 'no' ? 'bg-rose-500' : 'bg-violet-400'}`} />
      <span className={`text-xs font-bold tracking-wide ${side === 'yes' ? 'text-emerald-600 dark:text-emerald-400' : side === 'no' ? 'text-rose-600 dark:text-rose-400' : 'text-violet-500 dark:text-violet-400'}`}>
        {side === 'yes' ? '✓ YES' : side === 'no' ? '✕ NO' : 'Watching'}
      </span>
      <div className={`flex-1 h-px ${side === 'yes' ? 'bg-emerald-100 dark:bg-emerald-900/40' : side === 'no' ? 'bg-rose-100 dark:bg-rose-900/40' : 'bg-violet-100 dark:bg-violet-900/20'}`} />
    </div>
  )

  return (
    <Layout>
      <h1 className="text-lg font-bold text-gray-900 dark:text-white mb-4">My Bets</h1>

      <div className="flex bg-gray-100 dark:bg-slate-800/60 rounded-xl p-1 mb-5 gap-1">
        {([
          { id: 'active' as const, label: 'Active', count: activeItems.length },
          { id: 'completed' as const, label: 'Completed', count: completedItems.length },
        ]).map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-lg transition-all ${tab === t.id ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow' : 'text-gray-400 dark:text-slate-400 hover:text-gray-600 dark:hover:text-slate-200'}`}
          >
            {t.label}
            {t.count > 0 && (
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${tab === t.id ? 'bg-violet-100 dark:bg-violet-900/50 text-violet-600 dark:text-violet-400' : 'bg-gray-200 dark:bg-slate-700 text-gray-500 dark:text-slate-400'}`}>{t.count}</span>
            )}
          </button>
        ))}
      </div>

      {totalShown === 0 ? (
        <div className="text-center py-16">
          <div className="text-4xl mb-3">{tab === 'active' ? '🎲' : '📋'}</div>
          <p className="text-gray-500 dark:text-slate-400 text-sm mb-3">
            {tab === 'active' ? 'No active bets or pinned predictions.' : 'No completed bets yet.'}
          </p>
          {tab === 'active' && (
            <button onClick={() => navigate('/')} className="text-violet-600 dark:text-violet-400 text-sm hover:underline">Browse predictions →</button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {shown.map(({ companyName, slug, items }) => (
            <section key={slug}>
              {/* Company header */}
              <Link
                to={`/${slug}`}
                className="flex items-center gap-1 mb-2.5 group w-fit"
              >
                <span className="text-sm font-semibold text-gray-700 dark:text-slate-300 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">{companyName}</span>
                <ChevronRight className="w-3.5 h-3.5 text-gray-400 dark:text-slate-600 group-hover:text-violet-500 transition-colors" />
              </Link>

              <div className="space-y-2.5">
                {(() => {
                  const yesBets = items.filter(x => x.bet?.side === 'yes')
                  const noBets = items.filter(x => x.bet?.side === 'no')
                  const pinnedOnly = items.filter(x => !x.bet)

                  const subGroups: { side: 'yes' | 'no' | 'pinned'; list: typeof items }[] = []
                  if (yesBets.length) subGroups.push({ side: 'yes', list: yesBets })
                  if (noBets.length) subGroups.push({ side: 'no', list: noBets })
                  if (pinnedOnly.length) subGroups.push({ side: 'pinned', list: pinnedOnly })

                  return subGroups.map(({ side, list }) => (
                    <div key={side}>
                      <SubHeader side={side} />
                      <div className="space-y-2.5">
                        {list.map(({ event, status, bet, isPinned }) => {
                          const { dominant, pct } = barProps(event.yesPool, event.noPool)
                          const won = status === 'resolved' && event.outcome === bet?.side
                          const lost = status === 'resolved' && event.outcome !== null && bet && event.outcome !== bet.side
                          const flash = swipeFlash?.id === event.id
                          const isFirstCard = cardIndex === 0
                          cardIndex++

                          if (tab === 'completed') {
                            return (
                              <div
                                key={event.id}
                                onClick={() => navigate(`/event/${event.id}`)}
                                className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-3.5 hover:border-violet-300 dark:hover:border-violet-700 hover:shadow-sm transition-all cursor-pointer"
                              >
                                <div className="flex items-center justify-between mb-1.5">
                                  <div className="flex items-center gap-1.5">
                                    {isPinned && <Pin className="w-3 h-3 text-violet-400 fill-violet-400" />}
                                    <span className="text-xs font-medium">
                                      {won && <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5"><CheckCircle className="w-3 h-3" /> Won</span>}
                                      {lost && <span className="text-rose-500 dark:text-rose-400">Lost</span>}
                                      {status === 'expired' && <span className="text-amber-600 dark:text-amber-400">Expired</span>}
                                      {!bet && <span className="text-gray-400 dark:text-slate-500">Pinned</span>}
                                    </span>
                                  </div>
                                  {bet && (
                                    <span className="text-xs text-gray-400 dark:text-slate-500">{bet.amount} coins</span>
                                  )}
                                </div>
                                <p className="text-sm font-medium text-gray-900 dark:text-white leading-snug line-clamp-1 mb-2">{event.title}</p>
                                <div className="relative h-1.5 rounded-full bg-gray-100 dark:bg-slate-700 overflow-hidden mb-1.5">
                                  <div
                                    className={`absolute h-full rounded-full ${dominant === 'yes' ? 'left-0 bg-emerald-500' : 'right-0 bg-rose-500'}`}
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                                <div className="flex justify-between text-xs">
                                  {dominant === 'yes' ? <span className="text-emerald-600 dark:text-emerald-400 font-semibold">YES {pct}%</span> : <span className="text-gray-300 dark:text-slate-700">·</span>}
                                  <span className="text-gray-400 dark:text-slate-500">{event.yesPool + event.noPool} coins</span>
                                  {dominant === 'no' ? <span className="text-rose-600 dark:text-rose-400 font-semibold">NO {pct}%</span> : <span className="text-gray-300 dark:text-slate-700">·</span>}
                                </div>
                                {status === 'resolved' && event.outcome && bet && (
                                  <div className={`mt-2.5 text-xs text-center font-medium py-1.5 rounded-lg ${won ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400' : 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400'}`}>
                                    Resolved {event.outcome.toUpperCase()} {won ? '— you won! 🎉' : '— better luck next time'}
                                  </div>
                                )}
                              </div>
                            )
                          }

                          return (
                            <SwipeCard
                              key={event.id}
                              onSwipeYes={() => handleSwipeBet(event.id, 'yes')}
                              onSwipeNo={() => handleSwipeBet(event.id, 'no')}
                              demoActive={isFirstCard}
                              onClick={() => navigate(`/event/${event.id}`)}
                              cardClassName={`bg-white dark:bg-slate-800 border rounded-xl px-4 py-3.5 shadow-sm hover:shadow-md select-none transition-colors
                                ${flash && swipeFlash?.side === 'yes' ? 'border-emerald-400 dark:border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' :
                                  flash && swipeFlash?.side === 'no' ? 'border-rose-400 dark:border-rose-500 bg-rose-50 dark:bg-rose-900/20' :
                                  'border-gray-200 dark:border-slate-600 hover:border-violet-400 dark:hover:border-violet-600'}`}
                            >
                              <div className="flex items-start justify-between gap-2 mb-2">
                                <p className="text-sm font-medium text-gray-900 dark:text-white leading-snug line-clamp-1 flex-1">{event.title}</p>
                                {!bet && (
                                  <button
                                    onClick={ev => { ev.stopPropagation(); togglePinnedEvent(event.id) }}
                                    className="text-violet-500 dark:text-violet-400 p-0.5 flex-shrink-0"
                                  >
                                    <Pin className="w-3.5 h-3.5 fill-violet-500 dark:fill-violet-400" />
                                  </button>
                                )}
                              </div>
                              <div className="relative h-1.5 rounded-full bg-gray-100 dark:bg-slate-700 overflow-hidden mb-1.5">
                                <div
                                  className={`absolute h-full rounded-full ${dominant === 'yes' ? 'left-0 bg-emerald-500' : 'right-0 bg-rose-500'}`}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <div className="flex justify-between text-xs">
                                {dominant === 'yes' ? <span className="text-emerald-600 dark:text-emerald-400 font-semibold">YES {pct}%</span> : <span className="text-gray-300 dark:text-slate-700">·</span>}
                                <span className="text-gray-400 dark:text-slate-500 flex items-center gap-0.5"><Clock className="w-3 h-3" />{timeUntil(event.expiresAt)}</span>
                                {dominant === 'no' ? <span className="text-rose-600 dark:text-rose-400 font-semibold">NO {pct}%</span> : <span className="text-gray-300 dark:text-slate-700">·</span>}
                              </div>
                            </SwipeCard>
                          )
                        })}
                      </div>
                    </div>
                  ))
                })()}
              </div>
            </section>
          ))}
        </div>
      )}

      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-gray-800 dark:bg-slate-700 text-white px-5 py-2.5 rounded-full text-sm font-medium shadow-lg z-50 pointer-events-none">
          {toast}
        </div>
      )}
    </Layout>
  )
}
