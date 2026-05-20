import { useState, useMemo, useRef, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Search, TrendingUp, Eye, ArrowRight, Star, X, Send, ThumbsUp, Check, ChevronRight } from 'lucide-react'
import { SwipeCard } from '../components/SwipeCard'
import { useStore } from '../store/useStore'
import { Layout } from '../components/Layout'
import { CompanyLogo } from '../components/CompanyLogo'
import { AdBanner } from '../components/AdBanner'
import { getProbability, betMovementStr } from '../utils/odds'

const INDUSTRIES = ['All', 'Tech', 'Software', 'AI & Machine Learning', 'Finance', 'Healthcare', 'Retail', 'Media & Entertainment', 'Energy', 'Consulting', 'Logistics', 'Food & Beverage', 'Manufacturing']

const fmtViews = (n: number) => {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}K`
  return String(n)
}

const barProps = (yesPool: number, noPool: number) => {
  const total = yesPool + noPool
  if (total === 0) return { dominant: 'yes' as const, pct: 50 }
  const yesPct = Math.round((yesPool / total) * 100)
  if (yesPct >= 50) return { dominant: 'yes' as const, pct: yesPct }
  return { dominant: 'no' as const, pct: 100 - yesPct }
}

export const Home = () => {
  const companies = useStore(s => s.companies)
  const events = useStore(s => s.events)
  const getEffectiveStatus = useStore(s => s.getEffectiveStatus)
  const currentUser = useStore(s => s.currentUser)
  const favoriteCompanyIds = useStore(s => s.favoriteCompanyIds)
  const toggleFavoriteCompany = useStore(s => s.toggleFavoriteCompany)
  const placeBet = useStore(s => s.placeBet)
  const placeAnonymousVote = useStore(s => s.placeAnonymousVote)
  const anonVotedEvents = useStore(s => s.anonVotedEvents)
  const bets = useStore(s => s.bets)
  const comments = useStore(s => s.comments)
  const addComment = useStore(s => s.addComment)
  const upvoteComment = useStore(s => s.upvoteComment)
  const upvotedCommentIds = useStore(s => s.upvotedCommentIds)
  const companyLastVisit = useStore(s => s.companyLastVisit)
  const navigate = useNavigate()
  const location = useLocation()

  const [query, setQuery] = useState('')
  const [industry, setIndustry] = useState('All')
  const [showDropdown, setShowDropdown] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)

  const [swipeFlash, setSwipeFlash] = useState<{ id: string; side: 'yes' | 'no' } | null>(null)
  const [toast, setToast] = useState('')
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({})
  const [focusedInput, setFocusedInput] = useState<string | null>(null)
  const [dismissedLoginBanner, setDismissedLoginBanner] = useState(false)
  const [showComments, setShowComments] = useState(() => {
    const stored = localStorage.getItem('showComments')
    return stored ? JSON.parse(stored) : true
  })
  const [coinsAddedThisSession, setCoinsAddedThisSession] = useState(0)
  const updateCoins = useStore(s => s.updateCoins)

  useEffect(() => {
    localStorage.setItem('showComments', JSON.stringify(showComments))
  }, [showComments])

  const handleAddComment = (eventId: string) => {
    const text = commentInputs[eventId]?.trim()
    if (!text) return
    addComment(eventId, text)
    setCommentInputs(prev => ({ ...prev, [eventId]: '' }))
    setFocusedInput(null)
  }

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 4000) }

  const userStats = useMemo(() => {
    if (!currentUser) return null
    const userBets = bets.filter(b => b.userId === currentUser.id)
    const activeBetCount = userBets.filter(b => {
      const event = events.find(e => e.id === b.eventId)
      return event && getEffectiveStatus(event) === 'active'
    }).length
    const totalBetAmount = userBets.reduce((sum, b) => sum + b.amount, 0)
    return {
      coins: currentUser.coins,
      totalBets: userBets.length,
      activeBets: activeBetCount,
      totalBetAmount,
    }
  }, [currentUser, bets, events, getEffectiveStatus])

  const favorites = companies.filter(c => favoriteCompanyIds.includes(c.id))
  const hasFavorites = favorites.length > 0

  const activeEventsByCompany = useMemo(() => {
    const map: Record<string, number> = {}
    events.forEach(e => {
      if (getEffectiveStatus(e) === 'active') map[e.companyId] = (map[e.companyId] ?? 0) + 1
    })
    return map
  }, [events, getEffectiveStatus])

  const topEventByCompany = useMemo(() => {
    const map: Record<string, typeof events[0]> = {}
    events.forEach(e => {
      if (getEffectiveStatus(e) !== 'active') return
      const existing = map[e.companyId]
      if (!existing || (e.yesPool + e.noPool) > (existing.yesPool + existing.noPool)) map[e.companyId] = e
    })
    return map
  }, [events, getEffectiveStatus])

  const sentimentByCompany = useMemo(() => {
    const map: Record<string, number> = {}
    const pools: Record<string, { yes: number; no: number }> = {}
    events.forEach(e => {
      if (getEffectiveStatus(e) !== 'active') return
      if (!pools[e.companyId]) pools[e.companyId] = { yes: 0, no: 0 }
      pools[e.companyId].yes += e.yesPool
      pools[e.companyId].no += e.noPool
    })
    Object.entries(pools).forEach(([id, { yes, no }]) => {
      map[id] = Math.round((yes / (yes + no)) * 100)
    })
    return map
  }, [events, getEffectiveStatus])

  const typeaheadResults = useMemo(() => {
    if (!query.trim()) return []
    const q = query.toLowerCase()
    return companies
      .filter(c => c.name.toLowerCase().includes(q) || c.industry.toLowerCase().includes(q))
      .sort((a, b) => b.viewCount - a.viewCount)
      .slice(0, 6)
  }, [companies, query])

  const filtered = useMemo(() => {
    return companies
      .filter(c => industry === 'All' || c.industry === industry)
      .sort((a, b) => b.viewCount - a.viewCount)
  }, [companies, industry])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Clear search whenever the home page is navigated to (e.g. logo click)
  useEffect(() => {
    setQuery('')
    setShowDropdown(false)
  }, [location.key])

  // Add coins every 10 seconds (max 100 coins per session)
  useEffect(() => {
    if (!currentUser || coinsAddedThisSession >= 100) return

    const interval = setInterval(() => {
      setCoinsAddedThisSession(prev => {
        if (prev >= 100) return prev
        updateCoins(1)
        return prev + 1
      })
    }, 10000)

    return () => clearInterval(interval)
  }, [currentUser, coinsAddedThisSession, updateCoins])

  const handleStar = (e: React.MouseEvent, companyId: string) => {
    e.preventDefault()
    e.stopPropagation()
    toggleFavoriteCompany(companyId)
  }

  const handleSwipeBet = (eventId: string, side: 'yes' | 'no') => {
    const event = events.find(e => e.id === eventId)
    const movement = event ? betMovementStr(event.yesPool, event.noPool, side, 10) : ''
    if (currentUser) {
      if (placeBet(eventId, side, 10)) {
        setSwipeFlash({ id: eventId, side })
        setTimeout(() => setSwipeFlash(null), 600)
        showToast(`${side === 'yes' ? '✓ YES' : '✕ NO'} · 10 coins · ${movement}`)
      } else {
        showToast('Not enough coins or 100-coin limit reached')
      }
    } else {
      if (placeAnonymousVote(eventId, side)) {
        setSwipeFlash({ id: eventId, side })
        setTimeout(() => setSwipeFlash(null), 600)
        showToast(`${side === 'yes' ? '✓ YES' : '✕ NO'} · ${movement}`)
      } else {
        showToast('10 bets reached — sign in to keep going')
      }
    }
  }

  return (
    <>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes fadeOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }
        .comments-enter {
          animation: fadeIn 0.3s ease-out;
        }
        .comments-exit {
          animation: fadeOut 0.3s ease-in;
        }
      `}</style>
      <Layout fullWidth>
      <div className="max-w-2xl mx-auto px-4">
        {/* User Stats (logged in) or Coins for anonymous */}
        {currentUser && userStats && (
          <div className="pt-3 pb-3 -mx-4 px-4 mb-0">
            <div className="grid grid-cols-3 gap-3">
              <button onClick={() => navigate('/bets')} className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg sm:rounded-xl p-2.5 sm:p-4 text-center shadow-sm hover:shadow-md transition-shadow cursor-pointer relative flex flex-col">
                <div className="text-xs text-gray-500 dark:text-slate-400 uppercase font-medium mb-1 sm:mb-2">Coins</div>
                <div className="text-2xl sm:text-3xl font-bold text-purple-600 dark:text-purple-400 relative inline-block flex-1 flex items-center justify-center">
                  {userStats.coins}
                </div>
                <div className="text-xs text-gray-400 dark:text-slate-500 mt-0.5 sm:mt-1">remaining</div>
              </button>
              {currentUser && userStats && (
                <>
                  <button onClick={() => navigate('/bets')} className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg sm:rounded-xl p-2.5 sm:p-4 text-center shadow-sm hover:shadow-md transition-shadow cursor-pointer flex flex-col">
                    <div className="text-xs text-gray-500 dark:text-slate-400 uppercase font-medium mb-1 sm:mb-2">My Bets</div>
                    <div className="text-2xl sm:text-3xl font-bold text-purple-600 dark:text-purple-400 flex-1 flex items-center justify-center">{userStats.totalBets}</div>
                    <div className="text-xs text-gray-400 dark:text-slate-500 mt-0.5 sm:mt-1">{userStats.activeBets} active</div>
                  </button>
                  <button onClick={() => navigate('/bets')} className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg sm:rounded-xl p-2.5 sm:p-4 text-center shadow-sm hover:shadow-md transition-shadow cursor-pointer flex flex-col">
                    <div className="text-xs text-gray-500 dark:text-slate-400 uppercase font-medium mb-1 sm:mb-2">Wagered</div>
                    <div className="text-2xl sm:text-3xl font-bold text-purple-600 dark:text-purple-400 flex-1 flex items-center justify-center">{userStats.totalBetAmount}</div>
                    <div className="text-xs text-gray-400 dark:text-slate-500 mt-0.5 sm:mt-1">coins</div>
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* Hero */}
        <div className={`${(currentUser || hasFavorites) ? 'pt-2 pb-2' : 'pt-6 pb-4'} text-center`}>
          {/* Title + subtitle: always on desktop, hidden on mobile once logged in or has favorites */}
          <div className={`${(currentUser || hasFavorites) ? 'hidden sm:block' : 'block'} mb-3`}>
            <h1 className="text-xl sm:text-4xl font-extrabold text-gray-900 dark:text-white leading-tight mb-3">
              <span className="sm:hidden">What's really happening at work</span>
              <span className="hidden sm:block">Find out what's really<br />happening at your company</span>
            </h1>
            <p className="text-gray-500 dark:text-slate-400 text-sm sm:text-base max-w-sm mx-auto whitespace-nowrap overflow-hidden text-ellipsis sm:whitespace-normal sm:overflow-visible">
              Anonymous prediction markets for the workplace
              <span className="hidden sm:inline"> — track signals, bet on outcomes</span>
            </p>
          </div>

          {/* Search with typeahead - only show if no favorites */}
          {!hasFavorites && (
          <div ref={searchRef} className="relative max-w-md mx-auto mb-2">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-slate-500 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={e => { setQuery(e.target.value); setShowDropdown(true) }}
              onFocus={() => query && setShowDropdown(true)}
              placeholder="Search for a company..."
              className="w-full bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-2xl pl-12 pr-10 py-3.5 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all shadow-sm text-sm"
            />
            {query && (
              <button onClick={() => { setQuery(''); setShowDropdown(false) }} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 transition-colors">
                <X className="w-4 h-4" />
              </button>
            )}

            {/* Dropdown */}
            {showDropdown && typeaheadResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl shadow-xl z-30 overflow-hidden">
                <SearchResultsList results={typeaheadResults} favoriteCompanyIds={favoriteCompanyIds} activeEventsByCompany={activeEventsByCompany} sentimentByCompany={sentimentByCompany} onSelect={c => { setShowDropdown(false); setQuery(''); navigate(`/${c.slug}`) }} onStar={(e, c) => { handleStar(e, c); setShowDropdown(false); setQuery('') }} onSeeAll={() => { setShowDropdown(false); navigate('/search') }} />
              </div>
            )}
            {showDropdown && query && typeaheadResults.length === 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl shadow-xl z-30 px-4 py-5 text-sm text-gray-400 dark:text-slate-500 text-center">
                No companies found for "{query}"
              </div>
            )}
          </div>
          )}

          {!currentUser && (
            <p className="text-xs text-gray-400 dark:text-slate-500">
              Swipe left or right to bet — no sign-in needed.
            </p>
          )}
        </div>

        {/* Favorite company sections */}
        {hasFavorites && favorites.map((c, cIdx) => {
          const betOrder = (eventId: string) => {
            if (!currentUser) return 2
            const b = bets.find(bet => bet.eventId === eventId && bet.userId === currentUser.id)
            if (!b) return 2
            return b.side === 'yes' ? 0 : 1
          }
          const activeEvents = events
            .filter(e => e.companyId === c.id && getEffectiveStatus(e) === 'active')
            .sort((a, b) => {
              const diff = betOrder(a.id) - betOrder(b.id)
              if (diff !== 0) return diff
              return (b.yesPool + b.noPool) - (a.yesPool + a.noPool)
            })
          return (
            <section key={c.id} className={`mb-2 ${cIdx > 0 ? 'pt-2 border-t border-gray-200 dark:border-slate-800' : 'pt-1'}`}>
              <div className="flex items-center justify-between mb-3">
                <Link to={`/${c.slug}`} className="flex items-center gap-2 group min-w-0">
                  <span className="text-base font-bold text-gray-900 dark:text-white group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">{c.name}</span>
                  <ChevronRight className="w-4 h-4 text-gray-400 dark:text-slate-600 group-hover:text-violet-500 transition-colors flex-shrink-0" />
                </Link>
                {hasFavorites && (
                  <button
                    onClick={() => setShowComments(!showComments)}
                    className={`flex items-center gap-2.5 text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
                      showComments
                        ? 'bg-violet-50 dark:bg-violet-900/30 border-violet-200 dark:border-violet-800 text-violet-600 dark:text-violet-400'
                        : 'bg-gray-100 dark:bg-slate-700 border-gray-200 dark:border-slate-600 text-gray-600 dark:text-slate-300'
                    }`}
                  >
                    <span>Show Comments</span>
                    <div className={`w-5 h-3 rounded-full transition-colors relative flex items-center ${
                      showComments
                        ? 'bg-violet-600 dark:bg-violet-400'
                        : 'bg-gray-400 dark:bg-slate-600'
                    }`}>
                      <div className={`w-2.5 h-2.5 rounded-full bg-white transition-transform ${
                        showComments ? 'translate-x-2.5' : 'translate-x-0.5'
                      }`} />
                    </div>
                  </button>
                )}
              </div>
              {activeEvents.length > 0 ? (
                <div className="space-y-2.5">
                  {activeEvents.map((e, eIdx) => {
                    const { dominant, pct } = barProps(e.yesPool, e.noPool)
                    const flash = swipeFlash?.id === e.id
                    const anonVote = anonVotedEvents[e.id]
                    const anonCount = anonVote?.count ?? 0
                    const exhausted = !currentUser && anonCount >= 10
                    const userBet = currentUser ? bets.find(b => b.eventId === e.id && b.userId === currentUser.id) : undefined
                    const eventComments = comments.filter(c => c.eventId === e.id)
                    return (
                      <div key={e.id}>
                        <SwipeCard
                          onSwipeYes={() => handleSwipeBet(e.id, 'yes')}
                          onSwipeNo={() => handleSwipeBet(e.id, 'no')}
                          disabled={exhausted}
                          onClick={() => navigate(`/event/${e.id}`)}
                          demoActive={cIdx === 0 && eIdx === 0}
                          cardClassName={`bg-white dark:bg-slate-800 border rounded-xl px-4 py-3.5 shadow-sm [@media(hover:hover)]:hover:shadow-md select-none transition-shadow
                            ${flash && swipeFlash?.side === 'yes' ? 'border-emerald-400 dark:border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' :
                              flash && swipeFlash?.side === 'no' ? 'border-rose-400 dark:border-rose-500 bg-rose-50 dark:bg-rose-900/20' :
                              'border-violet-200 dark:border-violet-800'}`}
                        >
                          {userBet && (
                            <div className="mb-2">
                              <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${userBet.side === 'yes' ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' : 'bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400'}`}>
                                You bet {userBet.amount} coins {userBet.side === 'yes' ? 'YES' : 'NO'}
                              </span>
                            </div>
                          )}
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <p className="text-sm font-medium text-gray-900 dark:text-white leading-snug line-clamp-2 flex-1">{e.title}</p>
                            {companyLastVisit[c.id] && e.createdAt > companyLastVisit[c.id] && (
                              <span className="flex-shrink-0 text-[10px] font-bold bg-violet-600 text-white px-1.5 py-0.5 rounded-full">NEW</span>
                            )}
                          </div>
                          <div className="relative h-1.5 rounded-full bg-gray-100 dark:bg-slate-700 overflow-hidden mb-1.5">
                            <div
                              className={`absolute h-full rounded-full ${dominant === 'yes' ? 'left-0 bg-emerald-500' : 'right-0 bg-rose-500'}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <div className="flex justify-between text-xs">
                            {dominant === 'yes'
                              ? <span className="text-emerald-600 dark:text-emerald-400 font-semibold">YES {pct}%</span>
                              : <span className="text-gray-300 dark:text-slate-700 font-semibold">·</span>
                            }
                            <span className="text-gray-400 dark:text-slate-500">{e.yesPool + e.noPool} coins</span>
                            {dominant === 'no'
                              ? <span className="text-rose-600 dark:text-rose-400 font-semibold">NO {pct}%</span>
                              : <span className="text-gray-300 dark:text-slate-700 font-semibold">·</span>
                            }
                          </div>
                        </SwipeCard>
                        {showComments && (
                        <div className="mt-1.5 ml-2 space-y-1.5 comments-enter" onClick={ev => ev.stopPropagation()}>
                          {[...eventComments].sort((a, b) => (b.upvotes ?? 0) - (a.upvotes ?? 0)).map(cmt => {
                            const hasUpvoted = upvotedCommentIds.includes(cmt.id)
                            return (
                              <div key={cmt.id} className="bg-gray-100 dark:bg-slate-700/60 rounded-xl rounded-tl-sm px-3 py-2 flex items-start gap-2">
                                <p className="text-xs text-gray-600 dark:text-slate-300 leading-relaxed flex-1">{cmt.content}</p>
                                <button
                                  onClick={() => upvoteComment(cmt.id)}
                                  className={`flex items-center gap-1 flex-shrink-0 mt-0.5 transition-colors ${hasUpvoted ? 'text-violet-600 dark:text-violet-400' : 'text-gray-300 dark:text-slate-600 hover:text-violet-500'}`}
                                >
                                  <ThumbsUp className="w-3 h-3" />
                                  {(cmt.upvotes ?? 0) > 0 && <span className="text-[10px] font-medium">{cmt.upvotes}</span>}
                                </button>
                              </div>
                            )
                          })}
                          <div className="flex gap-1.5 pt-0.5">
                            <input
                              value={commentInputs[e.id] ?? ''}
                              onChange={ev => setCommentInputs(prev => ({ ...prev, [e.id]: ev.target.value }))}
                              onKeyDown={ev => { if (ev.key === 'Enter') handleAddComment(e.id) }}
                              onFocus={() => setFocusedInput(e.id)}
                              onBlur={() => setTimeout(() => setFocusedInput(f => f === e.id ? null : f), 150)}
                              placeholder="Add a comment..."
                              className="flex-1 text-xs bg-gray-100 dark:bg-slate-700/60 rounded-xl px-3 py-2 text-gray-700 dark:text-slate-300 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-violet-400 dark:focus:ring-violet-500"
                            />
                            {focusedInput === e.id && (
                              <button
                                onMouseDown={ev => ev.preventDefault()}
                                onClick={() => handleAddComment(e.id)}
                                className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-violet-600 hover:bg-violet-500 text-white rounded-xl transition-colors"
                              >
                                <Send className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-xl px-4 py-4 text-center shadow-sm">
                  <p className="text-sm text-gray-400 dark:text-slate-500">No active predictions for {c.name}</p>
                  <Link to="/create" className="text-xs text-violet-600 dark:text-violet-400 hover:underline mt-1 inline-block">Create one →</Link>
                </div>
              )}
              {cIdx === 0 && <AdBanner />}
            </section>
          )
        })}

        {hasFavorites && <div className="mb-2" />}

        {/* Industry filter + Browse — hidden once user has favorites */}
        {!hasFavorites && (
          <>
            <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide">
              {INDUSTRIES.map(ind => (
                <button
                  key={ind}
                  onClick={() => setIndustry(ind)}
                  className={`flex-shrink-0 text-xs font-medium px-3 py-1.5 rounded-full border transition-all ${
                    industry === ind
                      ? 'bg-violet-600 border-violet-600 text-white'
                      : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-400 hover:border-violet-300 dark:hover:border-violet-700'
                  }`}
                >
                  {ind}
                </button>
              ))}
            </div>

            <section className="mb-4">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-4 h-4 text-gray-400 dark:text-slate-500" />
                <h2 className="text-sm font-semibold text-gray-700 dark:text-slate-300">Browse Companies</h2>
                <span className="text-xs bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-400 px-2 py-0.5 rounded-full">
                  {filtered.length}
                </span>
              </div>
              <div className="space-y-2">
                {filtered.map(c => (
                  <CompanyRow key={c.id} company={c} activeBets={activeEventsByCompany[c.id] ?? 0} topEvent={topEventByCompany[c.id]} isFav={favoriteCompanyIds.includes(c.id)} onStar={e => handleStar(e, c.id)} sentiment={sentimentByCompany[c.id]} />
                ))}
              </div>
            </section>
          </>
        )}

        {/* Login Banner for guests */}
        {!currentUser && !dismissedLoginBanner && (
          <div className="bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 rounded-2xl p-5 mb-4 flex items-start justify-between gap-4">
            <div className="flex-1 text-center sm:text-left">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Ready to bet?</h3>
              <p className="text-sm text-gray-500 dark:text-slate-400 mb-3 sm:mb-0">
                Create a free anonymous account to remember your bets and earn <strong className="text-violet-600 dark:text-violet-400">100 Coins daily</strong>.
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Link to="/login" className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white font-semibold px-4 py-2 rounded-lg transition-colors text-sm whitespace-nowrap">
                Sign In <ArrowRight className="w-4 h-4" />
              </Link>
              <button
                onClick={() => setDismissedLoginBanner(true)}
                className="p-2 text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* CTA for guests (hidden when banner shown) */}
        {!currentUser && dismissedLoginBanner && (
          <div className="bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 rounded-2xl p-5 mb-4 text-center">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Ready to bet?</h3>
            <p className="text-sm text-gray-500 dark:text-slate-400 mb-4">
              Create a free anonymous account and get <strong className="text-violet-600 dark:text-violet-400">100 Coins daily</strong> to wager on predictions.
            </p>
            <Link to="/login" className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white font-semibold px-6 py-2.5 rounded-xl transition-colors text-sm">
              Get Started — It's Free <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}
      </div>

      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-gray-800 dark:bg-slate-700 text-white px-5 py-2.5 rounded-full text-sm font-medium shadow-lg z-50 pointer-events-none">
          {toast}
        </div>
      )}
    </Layout>
    </>
  )
}

const SearchResultsList = ({
  results, favoriteCompanyIds, activeEventsByCompany, sentimentByCompany, onSelect, onStar, onSeeAll,
}: {
  results: ReturnType<typeof useStore.getState>['companies']
  favoriteCompanyIds: string[]
  activeEventsByCompany: Record<string, number>
  sentimentByCompany: Record<string, number>
  onSelect: (c: ReturnType<typeof useStore.getState>['companies'][0]) => void
  onStar: (e: React.MouseEvent, companyId: string) => void
  onSeeAll: () => void
}) => (
  <>
    {results.map(c => {
      const isFav = favoriteCompanyIds.includes(c.id)
      const activeBets = activeEventsByCompany[c.id] ?? 0
      return (
        <div
          key={c.id}
          className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-slate-800 cursor-pointer border-b border-gray-100 dark:border-slate-800 last:border-0 transition-colors"
          onClick={() => onSelect(c)}
        >
          <CompanyLogo name={c.name} id={c.id} industry={c.industry} sentiment={sentimentByCompany[c.id]} size="sm" />
          <div className="flex-1 min-w-0 text-left">
            <div className="text-sm font-medium text-gray-900 dark:text-white truncate">{c.name}</div>
            <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-slate-500">
              <span>{c.industry}</span>
              {activeBets > 0 && <span className="text-violet-600 dark:text-violet-400">{activeBets} active</span>}
            </div>
          </div>
          <button
            onClick={e => { e.stopPropagation(); onStar(e, c.id) }}
            className={`flex-shrink-0 p-1.5 rounded-lg transition-colors ${isFav ? 'text-amber-400' : 'text-gray-300 dark:text-slate-600 hover:text-amber-400'}`}
          >
            <Star className={`w-4 h-4 ${isFav ? 'fill-amber-400' : ''}`} />
          </button>
        </div>
      )
    })}
    <div
      className="px-4 py-3 text-xs text-center text-violet-600 dark:text-violet-400 hover:bg-gray-50 dark:hover:bg-slate-800 cursor-pointer transition-colors font-medium"
      onClick={onSeeAll}
    >
      See all results →
    </div>
  </>
)

const CompanyRow = ({
  company, activeBets, topEvent, isFav, onStar, sentiment,
}: {
  company: ReturnType<typeof useStore.getState>['companies'][0]
  activeBets: number
  topEvent?: ReturnType<typeof useStore.getState>['events'][0]
  isFav: boolean
  onStar: (e: React.MouseEvent) => void
  sentiment?: number
}) => {
  const prob = topEvent ? getProbability(topEvent.yesPool, topEvent.noPool) : null

  return (
    <Link
      to={`/${company.slug}`}
      className="flex items-center gap-3 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-3.5 hover:border-violet-300 dark:hover:border-violet-700 hover:shadow-sm transition-all group"
    >
      <CompanyLogo name={company.name} id={company.id} industry={company.industry} sentiment={sentiment} size="md" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-900 dark:text-white text-sm truncate">{company.name}</span>
          {activeBets > 0 && (
            <span className="text-xs bg-violet-50 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 px-1.5 py-0.5 rounded-full border border-violet-200 dark:border-violet-800 flex-shrink-0">
              {activeBets} active
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-0.5">
          <span className="text-xs text-gray-400 dark:text-slate-500">{company.industry}</span>
          <span className="flex items-center gap-1 text-xs text-gray-400 dark:text-slate-500">
            <Eye className="w-3 h-3" />{fmtViews(company.viewCount)}
          </span>
          {prob && <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">{prob.yes}% YES</span>}
        </div>
      </div>
      <button
        onClick={onStar}
        className={`flex-shrink-0 p-1.5 rounded-lg transition-colors ${isFav ? 'text-amber-400' : 'text-gray-200 dark:text-slate-700 group-hover:text-gray-300 dark:group-hover:text-slate-500 hover:text-amber-400'}`}
      >
        <Star className={`w-4 h-4 ${isFav ? 'fill-amber-400' : ''}`} />
      </button>
    </Link>
  )
}
