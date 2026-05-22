import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { CheckCircle, Clock, ChevronRight, ChevronLeft, X } from 'lucide-react'
import { useStore } from '../store/useStore'
import { Layout } from '../components/Layout'
import { SwipeCard } from '../components/SwipeCard'
import { timeUntil, betMovementStr } from '../utils/odds'
import { AdBanner } from '../components/AdBanner'
import confetti from 'canvas-confetti'

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
  const anonVotedEvents = useStore(s => s.anonVotedEvents)
  const events = useStore(s => s.events)
  const companies = useStore(s => s.companies)
  const getEffectiveStatus = useStore(s => s.getEffectiveStatus)
  const placeBet = useStore(s => s.placeBet)
  const placeAnonymousVote = useStore(s => s.placeAnonymousVote)
  const removeBet = useStore(s => s.removeBet)
  const removeAnonymousVote = useStore(s => s.removeAnonymousVote)
  const favoriteCompanyIds = useStore(s => s.favoriteCompanyIds)
  const companyLastVisit = useStore(s => s.companyLastVisit)
  const [tab, setTab] = useState<'active' | 'completed'>('active')
  const [swipeFlash, setSwipeFlash] = useState<{ id: string; side: 'yes' | 'no' } | null>(null)
  const [toast, setToast] = useState('')
  const [anonCoins, setAnonCoins] = useState(() => {
    const stored = localStorage.getItem('anonCoins')
    return stored ? parseInt(stored) : 50
  })
  const [anonCoinsSpent, setAnonCoinsSpent] = useState(() => {
    const stored = localStorage.getItem('anonCoinsSpent')
    return stored ? parseInt(stored) : 0
  })
  const navigate = useNavigate()

  useEffect(() => {
    localStorage.setItem('anonCoins', anonCoins.toString())
  }, [anonCoins])

  useEffect(() => {
    localStorage.setItem('anonCoinsSpent', anonCoinsSpent.toString())
  }, [anonCoinsSpent])

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 5000) }

  const handleCancelBet = (eventId: string, isGuest: boolean) => {
    if (isGuest) {
      const vote = anonVotedEvents[eventId]
      if (vote) {
        const amount = vote.count * 10
        setAnonCoinsSpent(prev => Math.max(0, prev - amount))
        removeAnonymousVote(eventId)
      }
    } else {
      removeBet(eventId)
    }
  }

  const handleSwipeBet = (eventId: string, side: 'yes' | 'no') => {
    const event = events.find(e => e.id === eventId)
    const movement = event ? betMovementStr(event.yesPool, event.noPool, side, 10) : ''
    const betAmount = 10
    const confettiColor = side === 'yes' ? '#22c55e' : '#d1206a'

    if (currentUser) {
      if (placeBet(eventId, side, betAmount)) {
        setSwipeFlash({ id: eventId, side })
        setTimeout(() => setSwipeFlash(null), 600)
        confetti({ particleCount: betAmount, spread: 45, shapes: ['square'], scalar: 2, colors: [confettiColor], gravity: 0.5, ticks: 360 })
        showToast(`You bet ${side === 'yes' ? 'YES' : 'NO'} with ${betAmount} coins!`)
      } else {
        showToast('Not enough coins or 100-coin limit reached')
      }
    } else {
      if (Math.max(0, anonCoins - anonCoinsSpent) >= betAmount) {
        if (placeAnonymousVote(eventId, side)) {
          setAnonCoinsSpent(prev => prev + betAmount)
          setSwipeFlash({ id: eventId, side })
          setTimeout(() => setSwipeFlash(null), 600)
          confetti({ particleCount: betAmount, spread: 45, shapes: ['square'], scalar: 2, colors: [confettiColor], gravity: 0.5, ticks: 360 })
          showToast(`You bet ${side === 'yes' ? 'YES' : 'NO'} with ${betAmount} coins!`)
        } else {
          showToast('Prediction is no longer active')
        }
      } else {
        showToast('Not enough coins')
      }
    }
  }

  const myBets = currentUser ? bets.filter(b => b.userId === currentUser.id) : []

  // For pre-login users, convert anonVotedEvents to bet-like objects
  // Amount is calculated as count * 10 (since each vote is 10 coins)
  const anonBets = currentUser ? [] : Object.entries(anonVotedEvents).map(([eventId, data]) => ({
    id: eventId,
    eventId,
    userId: '',
    amount: data.count * 10,
    side: data.lastSide as 'yes' | 'no',
    createdAt: new Date().toISOString()
  }))

  const combinedBets = currentUser ? myBets : anonBets
  const allItems = combinedBets
    .map(bet => {
      const event = events.find(e => e.id === bet.eventId)
      if (!event) return null
      const status = getEffectiveStatus(event)
      return { event, status, bet }
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)

  // Within each tab, YES bets first, then NO bets
  const betSideOrder = (side: 'yes' | 'no') => side === 'yes' ? 0 : 1

  const activeItems = allItems
    .filter(x => x.status === 'active')
    .sort((a, b) => betSideOrder(a.bet.side) - betSideOrder(b.bet.side))

  const completedItems = allItems
    .filter(x => x.status !== 'active')
    .sort((a, b) => {
      const sideDiff = betSideOrder(a.bet.side) - betSideOrder(b.bet.side)
      if (sideDiff !== 0) return sideDiff
      return new Date(b.bet.createdAt).getTime() - new Date(a.bet.createdAt).getTime()
    })

  // Group by company, preserving bet-side order
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

  // Get suggested bets from same companies, favorites, or viewed companies
  const userBetCompanyIds = new Set(combinedBets.map(b => events.find(e => e.id === b.eventId)?.companyId).filter(Boolean))
  const suggestedCompanyIds = new Set([
    ...userBetCompanyIds,
    ...favoriteCompanyIds,
    ...Object.keys(companyLastVisit),
  ])

  const suggestedEvents = events
    .filter(e => {
      const status = getEffectiveStatus(e)
      const hasUserBet = combinedBets.some(b => b.eventId === e.id)
      const inSuggestedCompany = suggestedCompanyIds.has(e.companyId)
      return status === 'active' && !hasUserBet && inSuggestedCompany
    })
    .sort((a, b) => (b.yesPool + b.noPool) - (a.yesPool + a.noPool))
    .slice(0, 10)

  const suggestedByCompany = groupByCompany(
    suggestedEvents.map(event => ({
      event,
      status: 'active' as const,
      bet: { amount: 0, side: 'yes' as const, id: '', eventId: '', userId: '', createdAt: '' }
    }))
  )

  let cardIndex = 0

  return (
    <Layout>
      <div className="flex items-center gap-2 mb-4">
        <button onClick={() => navigate('/')} className="flex items-center text-gray-400 dark:text-slate-400 hover:text-gray-600 dark:hover:text-slate-200 transition-colors flex-shrink-0 p-1">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h1 className="text-lg font-bold text-gray-900 dark:text-white">My Bets</h1>
      </div>

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
                {items.map(({ event, status, bet }) => {
                  const { dominant, pct } = barProps(event.yesPool, event.noPool)
                  const won = status === 'resolved' && event.outcome === bet.side
                  const lost = status === 'resolved' && event.outcome !== null && event.outcome !== bet.side
                  const flash = swipeFlash?.id === event.id
                  const isFirstCard = cardIndex === 0
                  cardIndex++

                  const isActive = status === 'active'
                  const BetTag = isActive ? (
                    <button
                      onClick={(ev) => { ev.stopPropagation(); handleCancelBet(event.id, !currentUser) }}
                      className={`inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full transition-opacity hover:opacity-75 ${bet.side === 'yes' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}
                    >
                      {bet.side === 'yes' ? 'YES' : 'NO'} - {bet.amount} coins
                      <X className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-full ${bet.side === 'yes' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                      {bet.side === 'yes' ? 'YES' : 'NO'} - {bet.amount} coins
                    </span>
                  )

                  if (tab === 'completed') {
                    return (
                      <div key={event.id}>
                        <div
                          onClick={() => navigate(`/event/${event.id}`)}
                          className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-3.5 hover:border-violet-300 dark:hover:border-violet-700 hover:shadow-sm transition-all cursor-pointer"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className={bet.side === 'no' ? 'flex justify-end flex-1' : ''}>
                              {BetTag}
                            </div>
                            <span className="text-xs font-medium">
                              {won && <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5"><CheckCircle className="w-3 h-3" /> Won</span>}
                              {lost && <span className="text-rose-500 dark:text-rose-400">Lost</span>}
                              {status === 'expired' && <span className="text-amber-600 dark:text-amber-400">Expired</span>}
                            </span>
                          </div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white leading-snug line-clamp-2 mb-2">{event.title}</p>
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
                      </div>
                    )
                  }

                  return (
                    <div key={event.id}>
                      <SwipeCard
                        onSwipeYes={() => handleSwipeBet(event.id, 'yes')}
                        onSwipeNo={() => handleSwipeBet(event.id, 'no')}
                        demoActive={false}
                        onClick={() => navigate(`/event/${event.id}`)}
                        cardClassName={`bg-white dark:bg-slate-800 border rounded-xl px-4 py-3.5 shadow-sm [@media(hover:hover)]:hover:shadow-md select-none transition-shadow
                          ${flash && swipeFlash?.side === 'yes' ? 'border-emerald-400 dark:border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' :
                            flash && swipeFlash?.side === 'no' ? 'border-rose-400 dark:border-rose-500 bg-rose-50 dark:bg-rose-900/20' :
                            'border-violet-200 dark:border-violet-800'}`}
                      >
                        <div className={`mb-2 ${bet.side === 'no' ? 'flex justify-end' : ''}`}>
                          {BetTag}
                        </div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white leading-snug line-clamp-2 mb-2">{event.title}</p>
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
                    </div>
                  )
                })}
              </div>
            </section>
          ))}
        </div>
      )}
      {totalShown > 0 && <AdBanner />}

      {/* Suggested bets */}
      {tab === 'active' && suggestedByCompany.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Suggested for you</h2>
          <div className="space-y-6">
            {suggestedByCompany.map(({ companyName, slug, items }) => (
              <section key={slug}>
                <Link
                  to={`/${slug}`}
                  className="flex items-center gap-1 mb-2.5 group w-fit"
                >
                  <span className="text-sm font-semibold text-gray-700 dark:text-slate-300 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">{companyName}</span>
                  <ChevronRight className="w-3.5 h-3.5 text-gray-400 dark:text-slate-600 group-hover:text-violet-500 transition-colors" />
                </Link>

                <div className="space-y-2.5">
                  {items.map(({ event }) => {
                    const { dominant, pct } = barProps(event.yesPool, event.noPool)
                    const flash = swipeFlash?.id === event.id

                    return (
                      <div key={event.id}>
                        <SwipeCard
                          onSwipeYes={() => handleSwipeBet(event.id, 'yes')}
                          onSwipeNo={() => handleSwipeBet(event.id, 'no')}
                          demoActive={false}
                          onClick={() => navigate(`/event/${event.id}`)}
                          cardClassName={`bg-white dark:bg-slate-800 border rounded-xl px-4 py-3.5 shadow-sm [@media(hover:hover)]:hover:shadow-md select-none transition-shadow
                            ${flash && swipeFlash?.side === 'yes' ? 'border-emerald-400 dark:border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' :
                              flash && swipeFlash?.side === 'no' ? 'border-rose-400 dark:border-rose-500 bg-rose-50 dark:bg-rose-900/20' :
                              'border-violet-200 dark:border-violet-800'}`}
                        >
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <p className="text-sm font-medium text-gray-900 dark:text-white leading-snug line-clamp-2 flex-1">{event.title}</p>
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
                      </div>
                    )
                  })}
                </div>
              </section>
            ))}
          </div>
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
