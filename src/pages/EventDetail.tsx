import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link, Navigate } from 'react-router-dom'
import { Building2, Clock, Users, ChevronLeft, Send, Trash2, CheckCircle } from 'lucide-react'
import { useStore } from '../store/useStore'
import { Layout } from '../components/Layout'
import { AuthModal } from '../components/AuthModal'
import { getProbability, formatDate, timeUntil } from '../utils/odds'

export const EventDetail = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const events = useStore(s => s.events)
  const companies = useStore(s => s.companies)
  const bets = useStore(s => s.bets)
  const comments = useStore(s => s.comments)
  const currentUser = useStore(s => s.currentUser)
  const placeBet = useStore(s => s.placeBet)
  const placeAnonymousVote = useStore(s => s.placeAnonymousVote)
  const anonVotedEvents = useStore(s => s.anonVotedEvents)
  const addComment = useStore(s => s.addComment)
  const deleteComment = useStore(s => s.deleteComment)
  const resolveEvent = useStore(s => s.resolveEvent)
  const getEffectiveStatus = useStore(s => s.getEffectiveStatus)

  const [commentText, setCommentText] = useState('')
  const [betAmount, setBetAmount] = useState(10)
  const [toast, setToast] = useState('')
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [pendingBet, setPendingBet] = useState<'yes' | 'no' | null>(null)

  const event = events.find(e => e.id === id)

  useEffect(() => {
    if (event) document.title = `${event.companyName} | Layoff Bet`
    return () => { document.title = 'Layoff Bet' }
  }, [event])

  if (!event) return <Navigate to="/" replace />

  const status = getEffectiveStatus(event)
  const prob = getProbability(event.yesPool, event.noPool)
  const eventComments = comments.filter(c => c.eventId === id).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
  const userBet = bets.find(b => b.eventId === id && b.userId === currentUser?.id)
  const totalPool = event.yesPool + event.noPool
  const isCreator = event.creatorId === currentUser?.id
  const isAdmin = currentUser?.isAdmin

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2000) }

  const anonVote = anonVotedEvents[id!]
  const anonExhausted = !currentUser && (anonVote?.count ?? 0) >= 10
  const requiresLogin = !currentUser && (betAmount === 25 || betAmount === 50)

  const handleBet = (side: 'yes' | 'no') => {
    if (!currentUser && (betAmount === 25 || betAmount === 50)) {
      setPendingBet(side)
      setShowAuthModal(true)
      return
    }
    if (!currentUser) {
      if (placeAnonymousVote(id!, side, betAmount)) {
        showToast(`Bet ${side.toUpperCase()} placed!`)
      } else {
        showToast('10 bets reached — sign in to keep going')
      }
      return
    }
    if (placeBet(id!, side, betAmount)) {
      showToast(`Bet ${side.toUpperCase()} placed!`)
    } else {
      showToast('Not enough Coins or already bet.')
    }
  }

  const handleAuthClose = () => {
    setShowAuthModal(false)
    if (pendingBet && currentUser) {
      if (placeBet(id!, pendingBet, betAmount)) {
        showToast(`Bet ${pendingBet.toUpperCase()} placed!`)
      }
      setPendingBet(null)
    }
  }

  const handleComment = (e: React.FormEvent) => {
    e.preventDefault()
    if (!commentText.trim()) return
    if (!currentUser) { setShowAuthModal(true); return }
    addComment(id!, commentText)
    setCommentText('')
  }

  const statusColors = {
    active: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
    expired: 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800',
    resolved: 'bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400 border-violet-200 dark:border-violet-800',
    archived: 'bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-400 border-gray-200 dark:border-slate-600',
  }

  return (
    <Layout>
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-gray-400 dark:text-slate-400 hover:text-gray-600 dark:hover:text-slate-200 transition-colors mb-4 text-sm">
        <ChevronLeft className="w-4 h-4" /> Back
      </button>

      <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl p-5 mb-4 shadow-sm dark:shadow-none">
        <div className="flex items-center justify-between mb-3">
          <Link to={`/${companies.find(c => c.id === event.companyId)?.slug ?? event.companyId}`} className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-slate-400 hover:text-violet-600 dark:hover:text-violet-400 transition-colors">
            <Building2 className="w-3.5 h-3.5" />
            {event.companyName}
          </Link>
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${statusColors[status]}`}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </span>
        </div>
        <h1 className="text-gray-900 dark:text-white font-bold text-xl leading-snug mb-3">{event.title}</h1>
        <p className="text-gray-500 dark:text-slate-400 text-sm leading-relaxed mb-4">{event.description}</p>
        <div className="flex items-center gap-4 text-xs text-gray-400 dark:text-slate-500">
          <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {status === 'active' ? timeUntil(event.expiresAt) : `Expired ${formatDate(event.expiresAt)}`}</span>
          <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {bets.filter(b => b.eventId === id).length} bettors</span>
        </div>
      </div>

      {/* Odds */}
      <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl p-5 mb-4 shadow-sm dark:shadow-none">
        <div className="flex justify-between items-end mb-2">
          <div>
            <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400">{prob.yes}%</div>
            <div className="text-xs text-gray-400 dark:text-slate-400">YES probability</div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-black text-rose-600 dark:text-rose-400">{prob.no}%</div>
            <div className="text-xs text-gray-400 dark:text-slate-400">NO probability</div>
          </div>
        </div>
        <div className="h-3 rounded-full bg-gray-100 dark:bg-slate-700 overflow-hidden">
          <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${prob.yes}%` }} />
        </div>
        <div className="mt-2 text-center text-xs text-gray-400 dark:text-slate-500">
          Total pool: <span className="text-gray-700 dark:text-slate-300 font-medium">{totalPool} Coins</span>
        </div>
        {status === 'resolved' && event.outcome && (
          <div className={`mt-3 flex items-center gap-2 justify-center rounded-xl py-2.5 ${event.outcome === 'yes' ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300' : 'bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300'}`}>
            <CheckCircle className="w-4 h-4" />
            <span className="font-semibold text-sm">Resolved: {event.outcome.toUpperCase()}</span>
          </div>
        )}
      </div>

      {/* Betting */}
      {status === 'active' && (
        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl p-5 mb-4 shadow-sm dark:shadow-none">
          {userBet ? (
            <div className={`flex items-center gap-2 justify-center rounded-xl py-3 ${userBet.side === 'yes' ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300' : 'bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300'}`}>
              <CheckCircle className="w-4 h-4" />
              <span className="font-semibold text-sm">You bet {userBet.side.toUpperCase()} with {userBet.amount} Coins</span>
            </div>
          ) : (
            <>
              <div className="text-sm font-medium text-gray-700 dark:text-slate-300 mb-3">Place your bet</div>
              <div className="flex gap-2 mb-3">
                {[5, 10, 25, 50].map(amt => {
                  const guestOnly = !currentUser && (amt === 25 || amt === 50)
                  return (
                    <button
                      key={amt}
                      onClick={() => setBetAmount(amt)}
                      className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all relative ${betAmount === amt ? 'bg-violet-600 text-white' : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-600'}`}
                    >
                      {amt}
                      {guestOnly && <span className="absolute -top-1 -right-1 w-3 h-3 bg-amber-400 rounded-full" title="Requires sign-in" />}
                    </button>
                  )
                })}
              </div>

              {requiresLogin ? (
                <div className="rounded-2xl bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 px-4 py-5 text-center">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Sign in to bet {betAmount} coins</p>
                  <p className="text-xs text-gray-500 dark:text-slate-400 mb-4">Free accounts get <span className="font-medium text-violet-600 dark:text-violet-400">100 coins daily</span> to wager on predictions</p>
                  <button
                    onClick={() => setShowAuthModal(true)}
                    className="bg-violet-600 hover:bg-violet-500 text-white px-6 py-2.5 rounded-xl text-sm font-semibold transition-colors"
                  >
                    Sign in — It's Free
                  </button>
                </div>
              ) : (
                <div className="flex gap-3">
                  <button
                    onClick={() => handleBet('no')}
                    disabled={anonExhausted}
                    className="flex-1 py-3 bg-rose-50 dark:bg-rose-900/20 hover:bg-rose-100 dark:hover:bg-rose-900/40 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 font-bold rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    ✕ NO
                  </button>
                  <button
                    onClick={() => handleBet('yes')}
                    disabled={anonExhausted}
                    className="flex-1 py-3 bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 font-bold rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    ✓ YES
                  </button>
                </div>
              )}
              {anonExhausted && (
                <p className="text-center text-xs text-gray-400 dark:text-slate-500 mt-2">
                  10 bets reached — <button onClick={() => setShowAuthModal(true)} className="text-violet-600 dark:text-violet-400 hover:underline">sign in</button> to keep going
                </p>
              )}
            </>
          )}
        </div>
      )}

      {/* Admin / Creator resolve */}
      {(isAdmin || isCreator) && (status === 'active' || status === 'expired') && (
        <div className="bg-violet-50 dark:bg-slate-800 border border-violet-200 dark:border-violet-800/50 rounded-2xl p-5 mb-4">
          <div className="text-sm font-medium text-violet-700 dark:text-violet-300 mb-3">
            {isAdmin ? 'Admin: Resolve Event' : 'Resolve Your Event'}
          </div>
          <div className="flex gap-3">
            <button onClick={() => { resolveEvent(id!, 'no'); showToast('Resolved as NO') }} className="flex-1 py-2.5 bg-rose-50 dark:bg-rose-900/30 hover:bg-rose-100 dark:hover:bg-rose-900/50 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 font-semibold rounded-xl transition-all text-sm">
              Resolve NO
            </button>
            <button onClick={() => { resolveEvent(id!, 'yes'); showToast('Resolved as YES') }} className="flex-1 py-2.5 bg-emerald-50 dark:bg-emerald-900/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 font-semibold rounded-xl transition-all text-sm">
              Resolve YES
            </button>
          </div>
        </div>
      )}

      {/* Comments */}
      <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl p-5 shadow-sm dark:shadow-none">
        <div className="text-sm font-medium text-gray-700 dark:text-slate-300 mb-4">Discussion ({eventComments.length})</div>
        <div className="space-y-3 mb-4 max-h-72 overflow-y-auto">
          {eventComments.length === 0 && (
            <p className="text-gray-400 dark:text-slate-500 text-sm text-center py-4">No comments yet. Be the first.</p>
          )}
          {eventComments.map(c => (
            <div key={c.id} className="bg-gray-50 dark:bg-slate-900 rounded-xl p-3 group">
              <p className="text-sm text-gray-700 dark:text-slate-200 leading-relaxed">{c.content}</p>
              <div className="flex items-center justify-between mt-1.5">
                <span className="text-xs text-gray-400 dark:text-slate-600">{new Date(c.createdAt).toLocaleString()}</span>
                {isAdmin && (
                  <button onClick={() => deleteComment(c.id)} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-rose-500 transition-all">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
        <form onSubmit={handleComment} className="flex gap-2">
          <input
            type="text"
            value={commentText}
            onChange={e => setCommentText(e.target.value)}
            placeholder={currentUser ? "Add an anonymous comment..." : "Sign in to comment..."}
            maxLength={280}
            className="flex-1 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-600 focus:outline-none focus:border-violet-500 transition-colors"
          />
          <button type="submit" disabled={!commentText.trim()} className="p-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl transition-colors">
            <Send className="w-4 h-4 text-white" />
          </button>
        </form>
      </div>

      {showAuthModal && <AuthModal onClose={handleAuthClose} prompt="Sign in or create a free account to place your bet." />}
      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-gray-800 dark:bg-slate-700 text-white px-5 py-2.5 rounded-full text-sm font-medium shadow-lg z-50">
          {toast}
        </div>
      )}
    </Layout>
  )
}
