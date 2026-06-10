import { useState, useMemo, useRef, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Search, TrendingUp, Eye, ArrowRight, Star, X, Send, ThumbsUp, Check, ChevronRight } from 'lucide-react'
import confetti from 'canvas-confetti'
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

  const [toast, setToast] = useState('')
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({})
  const [focusedInput, setFocusedInput] = useState<string | null>(null)
  const [showComments, setShowComments] = useState(() => {
    const stored = localStorage.getItem('showComments')
    return stored ? JSON.parse(stored) : true
  })
  const [hidingComments, setHidingComments] = useState(false)
  const [anonCoins, setAnonCoins] = useState(() => {
    const stored = localStorage.getItem('anonCoins')
    return stored ? parseInt(stored) : 50
  })
  const [anonCoinsSpent, setAnonCoinsSpent] = useState(() => {
    const stored = localStorage.getItem('anonCoinsSpent')
    return stored ? parseInt(stored) : 0
  })
  const [coinPuff, setCoinPuff] = useState<{ id: string; x: number; y: number } | null>(null)
  const [hasPlacedFirstBet, setHasPlacedFirstBet] = useState(false)
  const lastBetTimeRef = useRef(0)  // Track last bet time to prevent duplicates
  const [showAnonBetPrompt, setShowAnonBetPrompt] = useState(false)
  const anonPromptDismissedRef = useRef(() => localStorage.getItem('lb-anon-bet-prompt-dismissed') === '1')
  const updateCoins = useStore(s => s.updateCoins)
  const addCoin = useStore(s => s.addCoin)
  const removeBet = useStore(s => s.removeBet)
  const removeAnonymousVote = useStore(s => s.removeAnonymousVote)
  const anonFavInitialized = useRef(false)

  useEffect(() => {
    if (anonFavInitialized.current) {
      console.log('[Home] anonFavInitialized already true, skipping')
      return
    }
    if (currentUser) {
      console.log('[Home] logged in user, skipping')
      return
    }
    const storedCompanyId = localStorage.getItem('lb-anon-favorite-company')
    console.log('[Home] storedCompanyId:', storedCompanyId, 'currentFavs:', favoriteCompanyIds)
    if (!storedCompanyId) {
      console.log('[Home] no stored company, skipping')
      return
    }
    if (favoriteCompanyIds.includes(storedCompanyId)) {
      console.log('[Home] company already favorited, skipping')
      return
    }

    console.log('[Home] toggling company to favorite:', storedCompanyId)
    anonFavInitialized.current = true
    toggleFavoriteCompany(storedCompanyId)
  }, [])

  useEffect(() => {
    localStorage.setItem('showComments', JSON.stringify(showComments))
  }, [showComments])

  useEffect(() => {
    localStorage.setItem('anonCoins', anonCoins.toString())
  }, [anonCoins])

  useEffect(() => {
    localStorage.setItem('anonCoinsSpent', anonCoinsSpent.toString())
  }, [anonCoinsSpent])

  const handleAddComment = (eventId: string) => {
    const text = commentInputs[eventId]?.trim()
    if (!text) return
    addComment(eventId, text)
    setCommentInputs(prev => ({ ...prev, [eventId]: '' }))
    setFocusedInput(null)
  }

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 7000) }

  // Get the user ID (for anonymous users, find their server-side ID)
  const anonUser = !currentUser ? (() => {
    const anonUserId = typeof window !== 'undefined' ? localStorage.getItem('lb-anon-user-id') : null
    const users = useStore(s => s.users)
    if (anonUserId) {
      return users.find(u => u.id === anonUserId)
    }
    return companies.length > 0 ? users.find(u => u.isAnonymous) : null
  })() : null

  const userStats = useMemo(() => {
    // For logged-in users
    if (currentUser) {
      // Include all bets (pending and synced) for the user count
      const allUserBets = bets.filter(b => b.userId === currentUser.id)
      // For active count, only count synced bets on active events
      const syncedUserBets = allUserBets.filter(b => !b.id.startsWith('pending-'))

      const activeBetCount = syncedUserBets.filter(b => {
        const event = events.find(e => e.id === b.eventId)
        return event && getEffectiveStatus(event) === 'active'
      }).length
      const totalBetAmount = syncedUserBets.reduce((sum, b) => sum + b.amount, 0)
      const activeBetAmount = syncedUserBets.filter(b => {
        const event = events.find(e => e.id === b.eventId)
        return event && getEffectiveStatus(event) === 'active'
      }).reduce((sum, b) => sum + b.amount, 0)

      console.log('[userStats] currentUser.id:', currentUser.id, 'allUserBets:', allUserBets, 'syncedUserBets:', syncedUserBets, 'totalBetAmount:', totalBetAmount)

      return {
        coins: currentUser.coins,
        totalBets: allUserBets.length,
        activeBets: activeBetCount,
        totalBetAmount,
      }
    }

    // For anonymous users, use server bets if anonymous user exists
    if (anonUser) {
      // Include all bets (pending and synced) for the user count
      const allUserBets = bets.filter(b => b.userId === anonUser.id)
      // For active count, only count synced bets on active events
      const syncedUserBets = allUserBets.filter(b => !b.id.startsWith('pending-'))

      const activeBetCount = syncedUserBets.filter(b => {
        const event = events.find(e => e.id === b.eventId)
        return event && getEffectiveStatus(event) === 'active'
      }).length
      const totalBetAmount = syncedUserBets.reduce((sum, b) => sum + b.amount, 0)

      return {
        coins: anonUser.coins,
        totalBets: allUserBets.length,
        activeBets: activeBetCount,
        totalBetAmount,
      }
    }

    return null
  }, [currentUser, anonUser, bets, events, getEffectiveStatus])

  const favorites = companies.filter(c => favoriteCompanyIds.includes(c.id)).sort((a, b) => {
    const aIdx = favoriteCompanyIds.indexOf(a.id)
    const bIdx = favoriteCompanyIds.indexOf(b.id)
    return bIdx - aIdx
  })
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
      .filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.industry.toLowerCase().includes(q) ||
        c.aliases?.some(alias => alias.toLowerCase().includes(q))
      )
      .sort((a, b) => b.viewCount - a.viewCount)
      .slice(0, 6)
  }, [companies, query])

  const filtered = useMemo(() => {
    const filtered = companies
      .filter(c => industry === 'All' || c.industry === industry)

    const meta = filtered.find(c => c.slug === 'meta')
    const bny = filtered.find(c => c.slug === 'bny')
    const rest = filtered.filter(c => c.slug !== 'meta' && c.slug !== 'bny')
      .sort((a, b) => b.viewCount - a.viewCount)

    const result = []
    if (meta) result.push(meta)
    if (bny) result.push(bny)
    result.push(...rest)

    return result
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


  const handleStar = (e: React.MouseEvent, companyId: string) => {
    e.preventDefault()
    e.stopPropagation()
    toggleFavoriteCompany(companyId)
  }

  const handleSwipeBet = (eventId: string, side: 'yes' | 'no') => {
    // Prevent duplicate bets within 500ms
    const now = Date.now()
    if (now - lastBetTimeRef.current < 500) {
      console.log('[Home] Duplicate bet prevented within 500ms')
      return
    }
    lastBetTimeRef.current = now

    const event = events.find(e => e.id === eventId)
    const betAmount = 10  // 10 coins for all users
    const confettiColor = '#d1206a'

    // Get the card element and calculate confetti origin
    const cardEl = document.querySelector(`[data-event-id="${eventId}"]`)
    let confettiOrigin = { x: 0.5, y: 0.2 }
    if (cardEl) {
      const rect = cardEl.getBoundingClientRect()
      const x = (rect.left + rect.width / 2) / window.innerWidth
      const y = (rect.top) / window.innerHeight
      confettiOrigin = { x, y: Math.max(y, 0.05) }
    }

    // Use placeBet for both logged-in and anonymous users
    if (placeBet(eventId, side, betAmount)) {
      setHasPlacedFirstBet(true)
      confetti({ particleCount: betAmount, spread: 45, origin: confettiOrigin, shapes: ['square'], scalar: 2, colors: [confettiColor], gravity: 0.5, ticks: 360 })

      // Show prompt for anonymous users to create account (only once)
      if (!currentUser && !anonPromptDismissedRef.current()) {
        setTimeout(() => setShowAnonBetPrompt(true), 500)
      }
    } else {
      if (!currentUser) {
        // For anonymous users, show if not enough coins
        if (Math.max(0, anonCoins - anonCoinsSpent) < betAmount) {
          showToast('Not enough coins')
        } else {
          showToast('Prediction is no longer active')
        }
      } else {
        showToast('Not enough coins or 100-coin limit reached')
      }
    }
  }

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
        @keyframes slideInRight {
          from { transform: translateX(-100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOutLeft {
          from { transform: translateX(0); opacity: 1; }
          to { transform: translateX(-100%); opacity: 0; }
        }
        @keyframes puff {
          0% { transform: translate(0, 0) scale(1); opacity: 1; }
          100% { transform: translate(0, -40px) scale(1.5); opacity: 0; }
        }
        .comments-enter {
          animation: slideInRight 0.3s ease-out;
        }
        .comments-exit {
          animation: slideOutLeft 0.3s ease-in;
        }
        .coin-puff {
          animation: puff 0.6s ease-out forwards;
          pointer-events: none;
        }
      `}</style>
      <Layout fullWidth>
      <div className="max-w-2xl mx-auto px-4">
        {/* User Stats (logged in) or Coins for anonymous */}
        {(currentUser && userStats) || !currentUser ? (
          <div className="pt-3 pb-0 -mx-4 px-4 mb-0">
            <div className="grid grid-cols-3 gap-3">
              <button onClick={async () => {
                if (currentUser) {
                  await addCoin()
                } else if (userStats) {
                  navigate('/bets')
                }
              }} className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg sm:rounded-xl p-2.5 sm:p-4 text-center shadow-sm hover:shadow-md transition-shadow cursor-pointer relative flex flex-col active:scale-95">
                <div className="text-xs text-gray-500 dark:text-slate-400 uppercase font-medium mb-1 sm:mb-2">Coins</div>
                <div className="text-2xl sm:text-3xl font-bold text-purple-600 dark:text-purple-400 relative inline-block flex-1 flex items-center justify-center">
                  {userStats?.coins ?? 0}
                  {coinPuff && (
                    <div className="coin-puff absolute text-2xl" style={{ left: `${coinPuff.x}%`, top: `${coinPuff.y}%` }}>
                      ✨
                    </div>
                  )}
                </div>
                <div className="text-xs text-gray-400 dark:text-slate-500 mt-0.5 sm:mt-1">{currentUser ? 'tap to add' : 'remaining'}</div>
              </button>
              <button onClick={() => navigate('/bets')} className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg sm:rounded-xl p-2.5 sm:p-4 text-center shadow-sm hover:shadow-md transition-shadow cursor-pointer flex flex-col">
                <div className="text-xs text-gray-500 dark:text-slate-400 uppercase font-medium mb-1 sm:mb-2">My Bets</div>
                <div className="text-2xl sm:text-3xl font-bold text-purple-600 dark:text-purple-400 flex-1 flex items-center justify-center">{userStats?.totalBets ?? 0}</div>
                <div className="text-xs text-gray-400 dark:text-slate-500 mt-0.5 sm:mt-1">{userStats?.activeBets ?? 0} active</div>
              </button>
              <button onClick={() => navigate(currentUser ? '/bets' : '/login')} className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg sm:rounded-xl p-2.5 sm:p-4 text-center shadow-sm hover:shadow-md transition-shadow cursor-pointer flex flex-col">
                <div className="text-xs text-gray-500 dark:text-slate-400 uppercase font-medium mb-1 sm:mb-2">Wagered</div>
                <div className="text-2xl sm:text-3xl font-bold text-purple-600 dark:text-purple-400 flex-1 flex items-center justify-center">{userStats?.totalBetAmount ?? 0}</div>
                <div className="text-xs text-gray-400 dark:text-slate-500 mt-0.5 sm:mt-1">coins</div>
              </button>
            </div>
          </div>
        ) : null}

        {/* Hero */}
        <div className={`${(currentUser || hasFavorites) ? 'pt-2 pb-2' : 'pt-6 pb-4'} text-center`}>
          {/* Title + subtitle: always on desktop, hidden on mobile once logged in or has favorites */}
          <div className={`${(currentUser || hasFavorites) ? 'hidden sm:block' : 'block'} mb-3`}>
            <h1 className="text-xl sm:text-4xl font-extrabold text-gray-900 dark:text-white leading-tight mb-3">
              What's really happening at work
            </h1>
            <p className="text-gray-500 dark:text-slate-400 text-sm sm:text-base max-w-sm mx-auto">
              Anonymous prediction markets for work
            </p>
          </div>

          {/* Search with typeahead */}
          <div ref={searchRef} className="relative max-w-md mx-auto mb-2">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-slate-500 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={e => { setQuery(e.target.value); setShowDropdown(true) }}
              onFocus={() => query && setShowDropdown(true)}
              placeholder="Search for a company..."
              className="w-full bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-2xl pl-12 pr-10 py-3.5 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all shadow-sm text-sm"
            />
            {query && (
              <button onClick={() => { setQuery(''); setShowDropdown(false) }} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 transition-colors">
                <X className="w-4 h-4" />
              </button>
            )}

            {/* Dropdown */}
            {showDropdown && typeaheadResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl shadow-xl z-30 overflow-hidden">
                <SearchResultsList results={typeaheadResults} favoriteCompanyIds={favoriteCompanyIds} activeEventsByCompany={activeEventsByCompany} sentimentByCompany={sentimentByCompany} onSelect={c => { if (!favoriteCompanyIds.includes(c.id)) toggleFavoriteCompany(c.id); setShowDropdown(false); setQuery('') }} onStar={(e, c) => { handleStar(e, c); setShowDropdown(false); setQuery('') }} onSeeAll={() => { setShowDropdown(false); navigate('/search') }} />
              </div>
            )}
            {showDropdown && query && typeaheadResults.length === 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl shadow-xl z-30 px-4 py-5 text-sm text-gray-400 dark:text-slate-500 text-center">
                No companies found for "{query}"
              </div>
            )}
          </div>

        </div>

        {/* Company sections (favorites) */}
        {favorites.map((c, cIdx) => {
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
            <section key={c.id} className={`mb-2 ${cIdx > 0 ? 'pt-6 border-t border-gray-200 dark:border-slate-800' : 'pt-6'}`}>
              <div className="flex items-center justify-between mb-3">
                <Link to={`/${c.slug}`} className="flex items-center gap-2 group min-w-0">
                  <span className="text-base font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{c.name}</span>
                  <ChevronRight className="w-4 h-4 text-gray-400 dark:text-slate-600 group-hover:text-blue-500 transition-colors flex-shrink-0" />
                </Link>
                <div className="flex items-center gap-2">
                  <button
                    onClick={e => handleStar(e, c.id)}
                    className="p-1.5 rounded-lg transition-colors flex-shrink-0 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                  >
                    <Star className={`w-6 h-6 ${favoriteCompanyIds.includes(c.id) ? 'fill-amber-400 text-amber-400' : 'text-gray-500 dark:text-slate-500 hover:text-amber-400'}`} />
                  </button>
                </div>
              </div>
              {activeEvents.length > 0 ? (
                <div className="space-y-2.5">
                  {activeEvents.map((e, eIdx) => {
                    const { dominant, pct } = barProps(e.yesPool, e.noPool)
                    const userBet = currentUser
                      ? bets.find(b => b.eventId === e.id && b.userId === currentUser.id && !b.id.startsWith('pending-'))
                      : anonUser ? bets.find(b => b.eventId === e.id && b.userId === anonUser.id && !b.id.startsWith('pending-'))
                      : undefined
                    const eventComments = comments.filter(c => c.eventId === e.id)
                    const midpoint = Math.floor(activeEvents.length / 2)
                    return (
                      <>
                        {eIdx === midpoint && cIdx === 0 && <AdBanner />}
                        <div key={e.id} data-event-id={e.id}>
                        <SwipeCard
                          onSwipeYes={() => handleSwipeBet(e.id, 'yes')}
                          onSwipeNo={() => handleSwipeBet(e.id, 'no')}
                          disabled={false}
                          onClick={() => navigate(`/event/${e.id}`)}
                          demoActive={!hasPlacedFirstBet && cIdx === 0 && eIdx === 0}
                          cardClassName={`bg-white dark:bg-slate-800 border rounded-xl px-4 py-3.5 shadow-sm [@media(hover:hover)]:hover:shadow-md select-none transition-shadow border-blue-200 dark:border-blue-800`}
                        >
                          {userBet && (
                            <div className={`mb-2 ${userBet.side === 'no' ? 'flex justify-end' : ''}`}>
                              <button
                                onClick={(ev) => { ev.stopPropagation(); handleCancelBet(e.id, !currentUser) }}
                                className={`inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full transition-opacity hover:opacity-75 ${userBet.side === 'yes' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}
                              >
                                {userBet.side === 'yes' ? 'YES' : 'NO'} - {userBet.amount} coins
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                          {!userBet && anonVotedEvents[e.id] && (
                            <div className={`mb-2 ${anonVotedEvents[e.id].lastSide === 'no' ? 'flex justify-end' : ''}`}>
                              <button
                                onClick={(ev) => { ev.stopPropagation(); handleCancelBet(e.id, true) }}
                                className={`inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full transition-opacity hover:opacity-75 ${anonVotedEvents[e.id].lastSide === 'yes' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}
                              >
                                {anonVotedEvents[e.id].lastSide === 'yes' ? 'YES' : 'NO'} - {anonVotedEvents[e.id].count * 10} coins
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <p className="text-sm font-medium text-gray-900 dark:text-white leading-snug line-clamp-2 flex-1">{e.title}</p>
                            {companyLastVisit[c.id] && e.createdAt > companyLastVisit[c.id] && (
                              <span className="flex-shrink-0 text-[10px] font-bold bg-blue-600 text-white px-1.5 py-0.5 rounded-full">NEW</span>
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
                        {(showComments || hidingComments) && (
                        <div className={`mt-1.5 ml-2 space-y-1.5 ${hidingComments ? 'comments-exit' : 'comments-enter'}`} onClick={ev => ev.stopPropagation()}>
                          {[...eventComments].sort((a, b) => (b.upvotes ?? 0) - (a.upvotes ?? 0)).map(cmt => {
                            const hasUpvoted = upvotedCommentIds.includes(cmt.id)
                            return (
                              <div key={cmt.id} className="bg-gray-100 dark:bg-slate-700/60 rounded-xl rounded-tl-sm px-3 py-2 flex items-start gap-2">
                                <p className="text-xs text-gray-600 dark:text-slate-300 leading-relaxed flex-1">{cmt.content}</p>
                                <button
                                  onClick={() => upvoteComment(cmt.id)}
                                  className={`flex items-center gap-1 flex-shrink-0 mt-0.5 transition-colors ${hasUpvoted ? 'text-blue-600 dark:text-blue-400' : 'text-gray-300 dark:text-slate-600 hover:text-blue-500'}`}
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
                              className="flex-1 text-xs bg-gray-100 dark:bg-slate-700/60 rounded-xl px-3 py-2 text-gray-700 dark:text-slate-300 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-400 dark:focus:ring-blue-500"
                            />
                            {(focusedInput === e.id || commentInputs[e.id]) && (
                              <button
                                onMouseDown={ev => ev.preventDefault()}
                                onClick={() => handleAddComment(e.id)}
                                disabled={!commentInputs[e.id]?.trim()}
                                className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <Send className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                        )}
                        </div>
                      </>
                    )
                  })}
                </div>
              ) : null}
              {/* Add prediction button */}
              <div className="bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 rounded-xl p-4 flex flex-col items-center gap-3 mt-6">
                <span className="text-sm text-gray-600 dark:text-slate-400">Know something about {c.name}?</span>
                {currentUser ? (
                  <button
                    onClick={() => navigate('/create', { state: { companyId: c.id } })}
                    className="px-3 py-1.5 rounded-lg border border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 text-sm font-medium transition-colors"
                  >
                    + New bet
                  </button>
                ) : (
                  <button
                    onClick={() => navigate('/login')}
                    className="px-3 py-1.5 rounded-lg border border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 text-sm font-medium transition-colors"
                  >
                    + New bet
                  </button>
                )}
              </div>
              {activeEvents.length === 0 && (
                <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-xl px-4 py-4 text-center shadow-sm">
                  <p className="text-sm text-gray-400 dark:text-slate-500">No active predictions for {c.name}</p>
                </div>
              )}
            </section>
          )
        })}

        {hasFavorites && <div className="mb-2" />}

        {/* Industry filter + Browse — hidden once user has favorites */}

        {/* Active bets pills — shown when no favorites */}
        {!hasFavorites && (() => {
          const companiesWithActiveBets = companies
            .filter(c => (activeEventsByCompany[c.id] ?? 0) > 0)
            .sort((a, b) => a.name.localeCompare(b.name))

          return companiesWithActiveBets.length > 0 ? (
            <div className="mb-4">
              <p className="text-xs font-semibold text-gray-600 dark:text-slate-400 uppercase tracking-wide mb-2">Companies with active bets</p>
              <div className="flex flex-wrap gap-2">
                {companiesWithActiveBets.map(c => (
                  <button
                    key={c.id}
                    onClick={() => navigate(`/${c.slug}`)}
                    className="px-3 py-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium text-sm rounded-full hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors cursor-pointer"
                  >
                    {c.name} <span className="font-semibold">({activeEventsByCompany[c.id]})</span>
                  </button>
                ))}
              </div>
            </div>
          ) : null
        })()}
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white dark:bg-slate-100 text-gray-900 dark:text-slate-900 px-5 py-2.5 rounded-full text-sm font-medium shadow-lg z-50 pointer-events-none">
          {toast}
        </div>
      )}

      {/* Anonymous user betting prompt */}
      {showAnonBetPrompt && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 flex items-end">
          <div className="w-full bg-white dark:bg-slate-900 rounded-t-2xl shadow-2xl border-t border-gray-200 dark:border-slate-800 p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Track Your Bets</h2>
            <p className="text-sm text-gray-600 dark:text-slate-400 mb-6">
              Create an account to save your betting history and track all your predictions in one place.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  localStorage.setItem('lb-anon-bet-prompt-dismissed', '1')
                  setShowAnonBetPrompt(false)
                }}
                className="flex-1 px-4 py-3 rounded-xl border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-300 font-medium hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
              >
                Not Now
              </button>
              <button
                onClick={() => {
                  localStorage.setItem('lb-anon-bet-prompt-dismissed', '1')
                  navigate('/login')
                }}
                className="flex-1 px-4 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium transition-colors"
              >
                Sign In / Register
              </button>
            </div>
          </div>
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
          <CompanyLogo name={c.name} id={c.id} industry={c.industry} color={c.color} sentiment={sentimentByCompany[c.id]} size="sm" />
          <div className="flex-1 min-w-0 text-left">
            <div className="text-sm font-medium text-gray-900 dark:text-white truncate">{c.name}</div>
            <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-slate-500">
              <span>{c.industry}</span>
              {activeBets > 0 && <span className="text-blue-600 dark:text-blue-400">{activeBets} active</span>}
            </div>
          </div>
        </div>
      )
    })}
    <div
      className="px-4 py-3 text-xs text-center text-blue-600 dark:text-blue-400 hover:bg-gray-50 dark:hover:bg-slate-800 cursor-pointer transition-colors font-medium"
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
    <div className="flex items-center gap-2">
      <Link
        to={`/${company.slug}`}
        className="flex-1 flex items-center gap-3 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-3.5 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-sm transition-all group"
      >
        <CompanyLogo name={company.name} id={company.id} industry={company.industry} color={company.color} sentiment={sentiment} size="md" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900 dark:text-white text-sm truncate">{company.name}</span>
            {activeBets > 0 && (
              <span className="text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded-full border border-blue-200 dark:border-blue-800 flex-shrink-0">
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
      </Link>
    </div>
  )
}
