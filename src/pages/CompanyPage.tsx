import { useState, useEffect, useRef, useMemo } from 'react'
import { useParams, Link, useNavigate, Navigate } from 'react-router-dom'
import { ChevronLeft, PlusCircle, Eye, Star, Share2, Check, Send, ThumbsUp } from 'lucide-react'
import { useStore } from '../store/useStore'
import { Layout } from '../components/Layout'
import { CompanyLogo } from '../components/CompanyLogo'
import { SwipeCard } from '../components/SwipeCard'
import { getProbability, timeUntil, formatDate, betMovementStr } from '../utils/odds'
import { AdBanner } from '../components/AdBanner'

const barProps = (yesPool: number, noPool: number) => {
  const total = yesPool + noPool
  if (total === 0) return { dominant: 'yes' as const, pct: 50 }
  const yesPct = Math.round((yesPool / total) * 100)
  if (yesPct >= 50) return { dominant: 'yes' as const, pct: yesPct }
  return { dominant: 'no' as const, pct: 100 - yesPct }
}

const fmtViews = (n: number) => {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}K`
  return String(n)
}

export const CompanyPage = () => {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const companies = useStore(s => s.companies)
  const events = useStore(s => s.events)
  const getEffectiveStatus = useStore(s => s.getEffectiveStatus)
  const currentUser = useStore(s => s.currentUser)
  const favoriteCompanyIds = useStore(s => s.favoriteCompanyIds)
  const toggleFavoriteCompany = useStore(s => s.toggleFavoriteCompany)
  const bets = useStore(s => s.bets)
  const companyLastVisit = useStore(s => s.companyLastVisit)
  const markCompanyVisited = useStore(s => s.markCompanyVisited)
  const placeBet = useStore(s => s.placeBet)
  const placeAnonymousVote = useStore(s => s.placeAnonymousVote)
  const anonVotedEvents = useStore(s => s.anonVotedEvents)
  const comments = useStore(s => s.comments)
  const addComment = useStore(s => s.addComment)
  const upvoteComment = useStore(s => s.upvoteComment)
  const upvotedCommentIds = useStore(s => s.upvotedCommentIds)
  const [shareCopied, setShareCopied] = useState(false)
  const [anonCoins, setAnonCoins] = useState(() => {
    const stored = localStorage.getItem('anonCoins')
    return stored ? parseInt(stored) : 0
  })
  const [anonCoinsSpent, setAnonCoinsSpent] = useState(() => {
    const stored = localStorage.getItem('anonCoinsSpent')
    return stored ? parseInt(stored) : 0
  })
  const [swipeFlash, setSwipeFlash] = useState<{ id: string; side: 'yes' | 'no' } | null>(null)
  const [toast, setToast] = useState('')
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({})
  const [focusedInput, setFocusedInput] = useState<string | null>(null)

  const handleAddComment = (eventId: string) => {
    const text = commentInputs[eventId]?.trim()
    if (!text) return
    addComment(eventId, text)
    setCommentInputs(prev => ({ ...prev, [eventId]: '' }))
    setFocusedInput(null)
  }

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 5000) }

  const userStats = useMemo(() => {
    if (!currentUser) return null
    const userBets = bets.filter(b => b.userId === currentUser.id)
    const activeBetCount = userBets.filter(b => {
      const event = events.find(e => e.id === b.eventId)
      return event && getEffectiveStatus(event) === 'active'
    }).length
    const totalBetAmount = userBets.reduce((sum, b) => sum + b.amount, 0)
    const activeBetAmount = userBets.filter(b => {
      const event = events.find(e => e.id === b.eventId)
      return event && getEffectiveStatus(event) === 'active'
    }).reduce((sum, b) => sum + b.amount, 0)
    return {
      coins: currentUser.coins - activeBetAmount,
      totalBets: userBets.length,
      activeBets: activeBetCount,
      totalBetAmount,
    }
  }, [currentUser, bets, events, getEffectiveStatus])

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

  const company = companies.find(c => c.slug === slug)

  const prevVisitTimeRef = useRef<string | undefined>(company ? companyLastVisit[company.id] : undefined)

  useEffect(() => {
    if (company) document.title = `${company.name} | Layoff Bet`
    return () => { document.title = 'Layoff Bet' }
  }, [company])

  useEffect(() => {
    if (company) markCompanyVisited(company.id)
  }, [company?.id])

  if (!company) return <Navigate to="/" replace />

  const isFavorite = favoriteCompanyIds.includes(company.id)
  const companyEvents = events.filter(e => e.companyId === company.id)
  const betOrder = (eventId: string) => {
    if (!currentUser) return 2
    const b = bets.find(bet => bet.eventId === eventId && bet.userId === currentUser.id)
    if (!b) return 2
    return b.side === 'yes' ? 0 : 1
  }
  const active = companyEvents
    .filter(e => getEffectiveStatus(e) === 'active')
    .sort((a, b) => {
      const diff = betOrder(a.id) - betOrder(b.id)
      if (diff !== 0) return diff
      return (b.yesPool + b.noPool) - (a.yesPool + a.noPool)
    })
  const past = companyEvents.filter(e => ['expired', 'resolved', 'archived'].includes(getEffectiveStatus(e)))

  const handleShare = async () => {
    const url = window.location.href
    const shareData = {
      title: `${company.name} on Layoff Bet`,
      text: `What's really happening at ${company.name}? Insiders are betting on it.`,
      url,
    }
    if (navigator.share) {
      try { await navigator.share(shareData) } catch {}
    } else {
      await navigator.clipboard.writeText(`${shareData.text}\n${url}`)
      setShareCopied(true)
      setTimeout(() => setShareCopied(false), 2500)
    }
  }

  return (
    <Layout>
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-gray-400 dark:text-slate-400 hover:text-gray-600 dark:hover:text-slate-200 transition-colors mb-4 text-sm">
        <ChevronLeft className="w-4 h-4" /> Back
      </button>

      {/* User Metrics */}
      {(currentUser && userStats) || !currentUser ? (
        <div className="mb-5 -mx-4 px-4 pb-4">
          <div className="grid grid-cols-3 gap-3">
            <button onClick={() => currentUser && navigate('/bets')} className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg sm:rounded-xl p-2.5 sm:p-4 text-center shadow-sm hover:shadow-md transition-shadow cursor-pointer relative flex flex-col">
              <div className="text-xs text-gray-500 dark:text-slate-400 uppercase font-medium mb-1 sm:mb-2">Coins</div>
              <div className="text-2xl sm:text-3xl font-bold text-purple-600 dark:text-purple-400 flex-1 flex items-center justify-center">{currentUser && userStats ? userStats.coins : Math.max(0, anonCoins - anonCoinsSpent)}</div>
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
            {!currentUser && (
              <>
                <button onClick={() => navigate('/bets')} className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg sm:rounded-xl p-2.5 sm:p-4 text-center shadow-sm hover:shadow-md transition-shadow cursor-pointer flex flex-col">
                  <div className="text-xs text-gray-500 dark:text-slate-400 uppercase font-medium mb-1 sm:mb-2">My Bets</div>
                  <div className="text-2xl sm:text-3xl font-bold text-purple-600 dark:text-purple-400 flex-1 flex items-center justify-center">{Object.keys(anonVotedEvents).length}</div>
                  <div className="text-xs text-gray-400 dark:text-slate-500 mt-0.5 sm:mt-1">{Object.keys(anonVotedEvents).length} active</div>
                </button>
                <button onClick={() => navigate('/bets')} className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg sm:rounded-xl p-2.5 sm:p-4 text-center shadow-sm hover:shadow-md transition-shadow cursor-pointer flex flex-col">
                  <div className="text-xs text-gray-500 dark:text-slate-400 uppercase font-medium mb-1 sm:mb-2">Wagered</div>
                  <div className="text-2xl sm:text-3xl font-bold text-purple-600 dark:text-purple-400 flex-1 flex items-center justify-center">{anonCoinsSpent}</div>
                  <div className="text-xs text-gray-400 dark:text-slate-500 mt-0.5 sm:mt-1">coins</div>
                </button>
              </>
            )}
          </div>
        </div>
      ) : null}

      <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl p-4 mb-5 shadow-sm dark:shadow-none">
        <div className="flex items-start gap-3 mb-3">
          <CompanyLogo name={company.name} id={company.id} industry={company.industry} size="lg" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h1 className="text-lg font-bold text-gray-900 dark:text-white">{company.name}</h1>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={handleShare}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors text-gray-400 dark:text-slate-500 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 text-xs font-medium"
                  title="Share this company"
                >
                  {shareCopied ? <Check className="w-4 h-4 text-emerald-500" /> : <Share2 className="w-4 h-4" />}
                  <span>Share</span>
                </button>
                <button
                  onClick={() => toggleFavoriteCompany(company.id)}
                  className={`p-1.5 rounded-lg transition-colors ${isFavorite ? 'text-amber-400 bg-amber-50 dark:bg-amber-900/20' : 'text-gray-400 dark:text-slate-500 hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20'}`}
                  title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                >
                  <Star className={`w-5 h-5 ${isFavorite ? 'fill-amber-400' : ''}`} />
                </button>
              </div>
            </div>
            <div className="flex items-center gap-1 text-xs text-gray-400 dark:text-slate-500 mt-1">
              <Eye className="w-3 h-3" />
              <span>{fmtViews(company.viewCount)} views</span>
            </div>
          </div>
        </div>
        <p className="text-gray-600 dark:text-slate-300 text-sm leading-snug">{company.description}</p>
      </div>

      {/* Copied toast */}
      {shareCopied && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-gray-900 dark:bg-slate-700 text-white text-xs font-medium px-4 py-2.5 rounded-full shadow-lg flex items-center gap-2 animate-fade-in">
          <Check className="w-3.5 h-3.5 text-emerald-400" /> Link copied to clipboard
        </div>
      )}

      {active.length > 0 && (
        <section className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-slate-300">Active Predictions</h2>
            <span className="text-xs text-gray-400 dark:text-slate-500 bg-gray-100 dark:bg-slate-700 px-2 py-0.5 rounded-full">{active.length}</span>
          </div>
          <div className="space-y-3">
            {active.map((event, idx) => {
              const { dominant, pct } = barProps(event.yesPool, event.noPool)
              const flash = swipeFlash?.id === event.id
              const anonVote = anonVotedEvents[event.id]
              const anonCount = anonVote?.count ?? 0
              const exhausted = !currentUser && anonCount >= 10
              const eventComments = comments.filter(c => c.eventId === event.id)
              return (
                <div key={event.id}>
                  <SwipeCard
                    onSwipeYes={() => handleSwipeBet(event.id, 'yes')}
                    onSwipeNo={() => handleSwipeBet(event.id, 'no')}
                    disabled={exhausted}
                    onClick={() => navigate(`/event/${event.id}`)}
                    demoActive={false}
                    cardClassName={`bg-white dark:bg-slate-800 border rounded-xl p-4 shadow-sm [@media(hover:hover)]:hover:shadow-md select-none transition-shadow
                      ${flash && swipeFlash?.side === 'yes' ? 'border-emerald-400 dark:border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' :
                        flash && swipeFlash?.side === 'no' ? 'border-rose-400 dark:border-rose-500 bg-rose-50 dark:bg-rose-900/20' :
                        'border-violet-200 dark:border-violet-800'}`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <p className="text-sm text-gray-900 dark:text-white font-medium leading-snug flex-1">{event.title}</p>
                      {prevVisitTimeRef.current && event.createdAt > prevVisitTimeRef.current && (
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
                        : <span className="text-gray-300 dark:text-slate-700">·</span>
                      }
                      <span className="text-gray-400 dark:text-slate-500">{timeUntil(event.expiresAt)}</span>
                      {dominant === 'no'
                        ? <span className="text-rose-600 dark:text-rose-400 font-semibold">NO {pct}%</span>
                        : <span className="text-gray-300 dark:text-slate-700">·</span>
                      }
                    </div>
                  </SwipeCard>
                  <div className="mt-1.5 ml-2 space-y-1.5">
                    {[...eventComments].sort((a, b) => (b.upvotes ?? 0) - (a.upvotes ?? 0)).map(cmt => {
                      const hasUpvoted = upvotedCommentIds.includes(cmt.id)
                      return (
                        <div key={cmt.id} className="bg-gray-100 dark:bg-slate-700/60 rounded-xl rounded-tl-sm px-3 py-2 flex items-start gap-2">
                          <p className="text-xs text-gray-600 dark:text-slate-300 leading-relaxed flex-1">{cmt.content}</p>
                          <button
                            onClick={ev => { ev.stopPropagation(); upvoteComment(cmt.id) }}
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
                        value={commentInputs[event.id] ?? ''}
                        onChange={ev => setCommentInputs(prev => ({ ...prev, [event.id]: ev.target.value }))}
                        onKeyDown={ev => { if (ev.key === 'Enter') handleAddComment(event.id) }}
                        onFocus={() => setFocusedInput(event.id)}
                        onBlur={() => setTimeout(() => setFocusedInput(f => f === event.id ? null : f), 150)}
                        onClick={ev => ev.stopPropagation()}
                        placeholder="Add a comment..."
                        className="flex-1 text-xs bg-gray-100 dark:bg-slate-700/60 rounded-xl px-3 py-2 text-gray-700 dark:text-slate-300 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-violet-400 dark:focus:ring-violet-500"
                      />
                      {focusedInput === event.id && (
                        <button
                          onMouseDown={ev => ev.preventDefault()}
                          onClick={ev => { ev.stopPropagation(); handleAddComment(event.id) }}
                          className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-violet-600 hover:bg-violet-500 text-white rounded-xl transition-colors"
                        >
                          <Send className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
            <AdBanner />

            {/* Add prediction CTA */}
            {currentUser ? (
              <button
                onClick={() => navigate('/create', { state: { companyId: company.id } })}
                className="w-full border-2 border-dashed border-gray-200 dark:border-slate-700 hover:border-violet-400 dark:hover:border-violet-600 rounded-xl p-4 flex flex-col items-center gap-1.5 transition-colors group"
              >
                <span className="text-sm font-semibold text-gray-400 dark:text-slate-500 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                  What else is happening at {company.name}?
                </span>
                <span className="text-xs text-violet-500 dark:text-violet-400 font-medium group-hover:underline">
                  + Add a prediction
                </span>
              </button>
            ) : (
              <button
                onClick={() => navigate('/login')}
                className="w-full border-2 border-dashed border-gray-200 dark:border-slate-700 hover:border-violet-400 dark:hover:border-violet-600 rounded-xl p-4 flex flex-col items-center gap-1.5 transition-colors group"
              >
                <span className="text-sm font-semibold text-gray-400 dark:text-slate-500 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                  Know something? Sign in to add a prediction.
                </span>
                <span className="text-xs text-violet-500 dark:text-violet-400 font-medium group-hover:underline">
                  Sign in free →
                </span>
              </button>
            )}
          </div>
        </section>
      )}

      {past.length > 0 && (
        <section className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-slate-300">Past Events</h2>
            <span className="text-xs text-gray-400 dark:text-slate-500 bg-gray-100 dark:bg-slate-700 px-2 py-0.5 rounded-full">{past.length}</span>
          </div>
          <div className="space-y-3">
            {past.map(event => {
              const prob = getProbability(event.yesPool, event.noPool)
              const s = getEffectiveStatus(event)
              return (
                <Link key={event.id} to={`/event/${event.id}`} className="block bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700/50 rounded-xl p-4 hover:border-violet-300 dark:hover:border-violet-700 transition-all">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s === 'resolved' ? 'bg-violet-50 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400' : 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'}`}>
                      {s === 'resolved' && event.outcome ? `Resolved ${event.outcome.toUpperCase()}` : 'Expired'}
                    </span>
                    <span className="text-xs text-gray-400 dark:text-slate-500">{formatDate(event.expiresAt)}</span>
                  </div>
                  <p className="text-sm text-gray-700 dark:text-slate-300 leading-snug">{event.title}</p>
                  <div className="flex justify-between text-xs text-gray-400 dark:text-slate-600 mt-2">
                    <span>YES {prob.yes}%</span>
                    <span>NO {prob.no}%</span>
                  </div>
                </Link>
              )
            })}
          </div>
        </section>
      )}

      {companyEvents.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-400 dark:text-slate-500 text-sm mb-4">No predictions yet for this company.</p>
          <Link to="/create" className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors">
            <PlusCircle className="w-4 h-4" /> Create a Prediction
          </Link>
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
