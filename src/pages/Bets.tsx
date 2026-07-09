import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { CheckCircle, Clock, ChevronRight, ChevronLeft, X, Dices } from 'lucide-react'
import { useStore } from '../store/useStore'
import { Layout } from '../components/Layout'
import { SwipeCard } from '../components/SwipeCard'
import { EmptyState } from '../components/EmptyState'
import { timeUntil, betMovementStr } from '../utils/odds'
import { AdBanner } from '../components/AdBanner'
import { useSwipePending } from '../hooks/useSwipePending'
import { api } from '../services/api'

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
  const hiddenCompanyIds = useStore(s => s.hiddenCompanyIds)
  const getEffectiveStatus = useStore(s => s.getEffectiveStatus)
  const placeBet = useStore(s => s.placeBet)
  const placeAnonymousVote = useStore(s => s.placeAnonymousVote)
  const getUserBet = useStore(s => s.getUserBet)
  const removeBet = useStore(s => s.removeBet)
  const removeAnonymousVote = useStore(s => s.removeAnonymousVote)
  const favoriteCompanyIds = useStore(s => s.favoriteCompanyIds)
  const companyLastVisit = useStore(s => s.companyLastVisit)
  const users = useStore(s => s.users)
  const { pendingEventId, startPending } = useSwipePending(bets)
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

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 15000) }

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
    const betAmount = 10

    if (currentUser) {
      const existingBet = getUserBet(eventId)
      const isReducing = !!existingBet && existingBet.side !== side
      if (placeBet(eventId, side, betAmount)) {
        const newBet = getUserBet(eventId)
        if (isReducing) {
          if (!newBet) {
            // Bet was deleted (reduced to zero)
            showToast(`Deleted your ${existingBet!.side === 'yes' ? 'YES' : 'NO'} bet`)
          } else {
            // Bet was just reduced
            showToast(`Reduced your ${existingBet!.side === 'yes' ? 'YES' : 'NO'} bet by ${betAmount} coins`)
            startPending(eventId, currentUser.id)
          }
        } else {
          showToast(`You bet ${side === 'yes' ? 'YES' : 'NO'} with ${betAmount} coins!`)
          startPending(eventId, currentUser.id)
        }
      } else {
        showToast('Not enough coins or 100-coin limit reached')
      }
    } else {
      const anonUserId = typeof window !== 'undefined' ? localStorage.getItem('lb-anon-user-id') : null
      const anonUser = anonUserId ? users.find(u => u.id === anonUserId) : users.find(u => u.isAnonymous)
      const existingVote = anonVotedEvents[eventId]
      const isReducing = !!existingVote && existingVote.lastSide !== side
      if (isReducing || Math.max(0, anonCoins - anonCoinsSpent) >= betAmount) {
        if (placeAnonymousVote(eventId, side)) {
          const newVote = anonVotedEvents[eventId]
          setAnonCoinsSpent(prev => isReducing ? Math.max(0, prev - betAmount) : prev + betAmount)
          if (isReducing) {
            if (!newVote) {
              // Vote was deleted (reduced to zero)
              showToast(`Deleted your ${existingVote!.lastSide === 'yes' ? 'YES' : 'NO'} bet`)
            } else {
              // Vote was just reduced
              showToast(`Reduced your ${existingVote!.lastSide === 'yes' ? 'YES' : 'NO'} bet by ${betAmount} coins`)
              if (anonUser) startPending(eventId, anonUser.id)
            }
          } else {
            showToast(`You bet ${side === 'yes' ? 'YES' : 'NO'} with ${betAmount} coins!`)
            if (anonUser) startPending(eventId, anonUser.id)
          }
        } else {
          showToast('Prediction is no longer active')
        }
      } else {
        showToast('Not enough coins')
      }
    }
  }

  const myBets = currentUser ? (() => {
    const betsMap = new Map<string, typeof bets[0]>()
    // Keep only the first (most recent) bet per eventId
    bets.forEach(b => {
      if (b.userId === currentUser.id && !betsMap.has(b.eventId)) {
        betsMap.set(b.eventId, b)
      }
    })
    return Array.from(betsMap.values())
  })() : []

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
      if (!event || hiddenCompanyIds.includes(event.companyId)) return null
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

  // Derived from the same deduplicated, filtered list the tabs below render, so the header
  // counts can never disagree with what's actually shown in Active/Completed.
  const userStats = currentUser ? {
    coins: currentUser.coins,
    totalBets: allItems.length,
    activeBets: activeItems.length,
    totalBetAmount: allItems.reduce((sum, x) => sum + x.bet.amount, 0),
  } : null

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

  const groupedActive = groupByCompany(activeItems)
  const groupedCompleted = groupByCompany(completedItems)

  return (
    <Layout>
      <div className="flex items-center gap-2 mb-4">
        <button onClick={() => navigate('/')} className="flex items-center text-gray-400 dark:text-slate-400 hover:text-gray-600 dark:hover:text-slate-200 transition-colors flex-shrink-0 p-1">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h1 className="text-lg font-bold text-gray-900 dark:text-white">My Bets</h1>
      </div>

      {/* User Metrics */}
      {(currentUser && userStats) || !currentUser ? (
        <div className="mb-5 -mx-4 px-4 pb-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg sm:rounded-xl p-2.5 sm:p-4 text-center shadow-sm flex flex-col">
              <div className="text-xs text-gray-500 dark:text-slate-400 uppercase font-medium mb-1 sm:mb-2">Coins</div>
              <div className="text-2xl sm:text-3xl font-bold text-blue-600 dark:text-blue-400 flex-1 flex items-center justify-center">{currentUser && userStats ? userStats.coins : Math.max(0, anonCoins - anonCoinsSpent)}</div>
              <div className="text-xs text-gray-400 dark:text-slate-500 mt-0.5 sm:mt-1">remaining</div>
            </div>
            {currentUser && userStats && (
              <>
                <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg sm:rounded-xl p-2.5 sm:p-4 text-center shadow-sm flex flex-col">
                  <div className="text-xs text-gray-500 dark:text-slate-400 uppercase font-medium mb-1 sm:mb-2">My Bets</div>
                  <div className="text-2xl sm:text-3xl font-bold text-blue-600 dark:text-blue-400 flex-1 flex items-center justify-center">{userStats.totalBets}</div>
                  <div className="text-xs text-gray-400 dark:text-slate-500 mt-0.5 sm:mt-1">{userStats.activeBets} active</div>
                </div>
                <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg sm:rounded-xl p-2.5 sm:p-4 text-center shadow-sm flex flex-col">
                  <div className="text-xs text-gray-500 dark:text-slate-400 uppercase font-medium mb-1 sm:mb-2">Wagered</div>
                  <div className="text-2xl sm:text-3xl font-bold text-blue-600 dark:text-blue-400 flex-1 flex items-center justify-center">{userStats.totalBetAmount}</div>
                  <div className="text-xs text-gray-400 dark:text-slate-500 mt-0.5 sm:mt-1">coins</div>
                </div>
              </>
            )}
            {!currentUser && (
              <>
                <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg sm:rounded-xl p-2.5 sm:p-4 text-center shadow-sm flex flex-col">
                  <div className="text-xs text-gray-500 dark:text-slate-400 uppercase font-medium mb-1 sm:mb-2">My Bets</div>
                  <div className="text-2xl sm:text-3xl font-bold text-blue-600 dark:text-blue-400 flex-1 flex items-center justify-center">{allItems.length}</div>
                  <div className="text-xs text-gray-400 dark:text-slate-500 mt-0.5 sm:mt-1">{activeItems.length} active</div>
                </div>
                <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg sm:rounded-xl p-2.5 sm:p-4 text-center shadow-sm flex flex-col">
                  <div className="text-xs text-gray-500 dark:text-slate-400 uppercase font-medium mb-1 sm:mb-2">Wagered</div>
                  <div className="text-2xl sm:text-3xl font-bold text-blue-600 dark:text-blue-400 flex-1 flex items-center justify-center">{anonCoinsSpent}</div>
                  <div className="text-xs text-gray-400 dark:text-slate-500 mt-0.5 sm:mt-1">coins</div>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}

      {allItems.length === 0 ? (
        <EmptyState
          icon={Dices}
          description="No active bets or pinned predictions."
          action={
            <button onClick={() => navigate('/')} className="text-violet-600 dark:text-violet-400 text-sm hover:underline">Browse predictions →</button>
          }
        />
      ) : (
        <>
          {activeItems.length === 0 ? (
            <EmptyState
              icon={Dices}
              description="No active bets or pinned predictions."
              action={
                <button onClick={() => navigate('/')} className="text-violet-600 dark:text-violet-400 text-sm hover:underline">Browse predictions →</button>
              }
            />
          ) : (
            <div className="space-y-6">
              {groupedActive.map(({ companyName, slug, items }) => (
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
                    {items.map(({ event, bet }) => {
                      const { dominant, pct } = barProps(event.yesPool, event.noPool)
                      const eventBetCount = bets.filter(b => b.eventId === event.id).length

                      const BetTag = (
                        <button
                          onClick={(ev) => { ev.stopPropagation(); handleCancelBet(event.id, !currentUser) }}
                          className={`inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full transition-opacity hover:opacity-75 ${bet.side === 'yes' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}
                        >
                          {bet.side === 'yes' ? 'YES' : 'NO'} - {bet.amount} coins
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )

                      return (
                        <div key={event.id}>
                          <SwipeCard
                            onSwipeYes={() => handleSwipeBet(event.id, 'yes')}
                            onSwipeNo={() => handleSwipeBet(event.id, 'no')}
                            demoActive={false}
                            loading={pendingEventId === event.id}
                            onClick={() => navigate(`/event/${event.id}`)}
                            cardClassName="bg-white dark:bg-slate-800 border border-violet-200 dark:border-violet-800 rounded-xl px-4 py-3.5 shadow-sm [@media(hover:hover)]:hover:shadow-md select-none transition-shadow"
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
                            <div className="flex justify-between items-center text-xs">
                              {dominant === 'yes'
                                ? <span className="text-emerald-600 dark:text-emerald-400 font-semibold">YES {pct}%</span>
                                : <span className="text-gray-400 dark:text-slate-500">{eventBetCount} bet{eventBetCount === 1 ? '' : 's'}</span>
                              }
                              <span className="inline-flex items-center gap-0.5 text-[11px] font-medium text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/40 px-2 py-0.5 rounded-full whitespace-nowrap"><Clock className="w-3 h-3" />{timeUntil(event.expiresAt)}</span>
                              {dominant === 'no'
                                ? <span className="text-rose-600 dark:text-rose-400 font-semibold">NO {pct}%</span>
                                : <span className="text-gray-400 dark:text-slate-500">{eventBetCount} bet{eventBetCount === 1 ? '' : 's'}</span>
                              }
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

          {/* Completed sub-section — always shown once the user has any bets, styled muted/grayed */}
          <div className="flex items-center gap-2 mt-8 mb-3">
            <h2 className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wide">Completed</h2>
            <div className="flex-1 h-px bg-gray-200 dark:bg-slate-800" />
          </div>

          {completedItems.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-slate-500">No completed bets yet.</p>
          ) : (
            <div className="space-y-6 opacity-60 grayscale-[0.3]">
              {groupedCompleted.map(({ companyName, slug, items }) => (
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

                      const BetTag = (
                        <span className={`inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-full ${bet.side === 'yes' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                          {bet.side === 'yes' ? 'YES' : 'NO'} - {bet.amount} coins
                        </span>
                      )

                      return (
                        <div key={event.id}>
                          <div
                            onClick={() => navigate(`/event/${event.id}`)}
                            className="bg-gray-50 dark:bg-slate-800/60 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-3.5 hover:border-violet-300 dark:hover:border-violet-700 hover:shadow-sm transition-all cursor-pointer"
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
                    })}
                  </div>
                </section>
              ))}
            </div>
          )}
        </>
      )}

      {allItems.length > 0 && (
        <div className="max-w-2xl mx-auto px-4 mt-12 mb-12">
          <AdBanner />
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white dark:bg-slate-100 text-gray-900 dark:text-slate-900 px-5 py-2.5 rounded-full text-sm font-medium shadow-lg z-50 pointer-events-none">
          {toast}
        </div>
      )}
    </Layout>
  )
}
