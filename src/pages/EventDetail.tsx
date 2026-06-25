import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, Link, Navigate } from 'react-router-dom'
import { Building2, Clock, Users, ChevronLeft, Send, Trash2, CheckCircle, Share2, Check, Edit2 } from 'lucide-react'
import { BetConfetti } from '../components/BetConfetti'
import { useStore } from '../store/useStore'
import { Layout } from '../components/Layout'
import { AuthModal } from '../components/AuthModal'
import { getProbability, formatDate, timeUntil, betMovementStr, makeSlug } from '../utils/odds'

export const EventDetail = () => {
  const { id, slug } = useParams<{ id?: string; slug?: string }>()
  const navigate = useNavigate()
  const events = useStore(s => s.events)
  const companies = useStore(s => s.companies)
  const bets = useStore(s => s.bets)
  const comments = useStore(s => s.comments)
  const currentUser = useStore(s => s.currentUser)
  const placeBet = useStore(s => s.placeBet)
  const removeBet = useStore(s => s.removeBet)
  const placeAnonymousVote = useStore(s => s.placeAnonymousVote)
  const removeAnonymousVote = useStore(s => s.removeAnonymousVote)
  const anonVotedEvents = useStore(s => s.anonVotedEvents)
  const addComment = useStore(s => s.addComment)
  const editComment = useStore(s => s.editComment)
  const deleteComment = useStore(s => s.deleteComment)
  const resolveEvent = useStore(s => s.resolveEvent)
  const getEffectiveStatus = useStore(s => s.getEffectiveStatus)
  const hiddenCompanyIds = useStore(s => s.hiddenCompanyIds)

  const [commentText, setCommentText] = useState('')
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null)
  const [commentError, setCommentError] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [betAmount, setBetAmount] = useState(10)
  const [toast, setToast] = useState('')
  const [showConfetti, setShowConfetti] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [pendingBet, setPendingBet] = useState<'yes' | 'no' | null>(null)
  const [shareCopied, setShareCopied] = useState(false)
  const [anonCoins, setAnonCoins] = useState(() => {
    const stored = localStorage.getItem('anonCoins')
    return stored ? parseInt(stored) : 50
  })
  const [anonCoinsSpent, setAnonCoinsSpent] = useState(() => {
    const stored = localStorage.getItem('anonCoinsSpent')
    return stored ? parseInt(stored) : 0
  })
  const recordShare = useStore(s => s.recordShare)

  useEffect(() => {
    localStorage.setItem('anonCoins', anonCoins.toString())
  }, [anonCoins])

  useEffect(() => {
    localStorage.setItem('anonCoinsSpent', anonCoinsSpent.toString())
  }, [anonCoinsSpent])

  const event = events.find(e => e.id === id)

  useEffect(() => {
    if (event) document.title = `${event.companyName} | Layoff Live`
    return () => { document.title = 'Layoff Live' }
  }, [event])

  if (!event || hiddenCompanyIds.includes(event.companyId)) return <Navigate to="/" replace />

  const status = getEffectiveStatus(event)
  const prob = getProbability(event.yesPool, event.noPool)
  const eventComments = comments.filter(c => c.eventId === id).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
  const userBet = bets.find(b => b.eventId === id && b.userId === currentUser?.id && !b.id.startsWith('pending-'))
  const totalPool = event.yesPool + event.noPool
  const isCreator = event.creatorId === currentUser?.id
  const isAdmin = currentUser?.isAdmin

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 15000) }

  const anonVote = anonVotedEvents[id!]
  const remainingGuestCoins = Math.max(0, anonCoins - anonCoinsSpent)
  const canPlaceGuestBet = !currentUser && remainingGuestCoins >= betAmount

  const handleBet = (side: 'yes' | 'no') => {
    const movement = betMovementStr(event.yesPool, event.noPool, side, betAmount)
    const confettiColor = side === 'yes' ? '#22c55e' : '#d1206a'

    if (!currentUser) {
      const isReducing = !!anonVote && anonVote.lastSide !== side
      if (!isReducing && !canPlaceGuestBet) {
        showToast('Not enough coins')
        return
      }
      if (placeAnonymousVote(id!, side, betAmount)) {
        const newVote = anonVotedEvents[id!]
        setAnonCoinsSpent(prev => isReducing ? Math.max(0, prev - betAmount) : prev + betAmount)
        if (isReducing) {
          if (!newVote) {
            // Vote was deleted (reduced to zero)
            showToast(`Deleted your ${anonVote!.lastSide === 'yes' ? 'YES' : 'NO'} bet`)
          } else {
            // Vote was just reduced
            showToast(`Reduced your ${anonVote!.lastSide === 'yes' ? 'YES' : 'NO'} bet by ${betAmount} coins`)
          }
        } else {
          setShowConfetti(true)
          showToast(`You bet ${side === 'yes' ? 'YES' : 'NO'} with ${betAmount} coins!`)
        }
      } else {
        showToast('Prediction is no longer active')
      }
      return
    }
    const isReducing = !!userBet && userBet.side !== side
    if (placeBet(id!, side, betAmount)) {
      const newBet = bets.find(b => b.eventId === id && b.userId === currentUser.id)
      if (isReducing) {
        if (!newBet) {
          // Bet was deleted (reduced to zero)
          showToast(`Deleted your ${userBet!.side === 'yes' ? 'YES' : 'NO'} bet`)
        } else {
          // Bet was just reduced
          showToast(`Reduced your ${userBet!.side === 'yes' ? 'YES' : 'NO'} bet by ${betAmount} coins`)
        }
      } else {
        setShowConfetti(true)
        showToast(`${side === 'yes' ? '✓ YES' : '✕ NO'} · ${betAmount} coins · ${movement}`)
      }
    } else {
      showToast('Not enough Coins or already bet.')
    }
  }

  const handleAuthClose = () => {
    setShowAuthModal(false)
    if (pendingBet && currentUser) {
      const movement = betMovementStr(event.yesPool, event.noPool, pendingBet, betAmount)
      if (placeBet(id!, pendingBet, betAmount)) {
        showToast(`${pendingBet === 'yes' ? '✓ YES' : '✕ NO'} · ${betAmount} coins · ${movement}`)
      }
      setPendingBet(null)
    }
  }

  const handleComment = (e: React.FormEvent) => {
    e.preventDefault()
    if (!commentText.trim()) return
    if (!currentUser) { setShowAuthModal(true); return }

    if (editingCommentId) {
      const result = editComment(editingCommentId, commentText)
      if (result.ok) {
        setCommentText('')
        setEditingCommentId(null)
        setCommentError('')
      } else {
        setCommentError(result.error || 'Error editing comment')
      }
    } else {
      const result = addComment(id!, commentText)
      if (result.ok) {
        setCommentText('')
        setCommentError('')
      } else {
        setCommentError(result.error || 'Error adding comment')
      }
    }
  }

  const handleEditComment = (comment: typeof comments[0]) => {
    setEditingCommentId(comment.id)
    setCommentText(comment.content)
    setTimeout(() => textareaRef.current?.focus(), 0)
  }

  const handleCancelEdit = () => {
    setEditingCommentId(null)
    setCommentText('')
    setCommentError('')
  }

  const handleShare = async () => {
    const company = companies.find(c => c.slug === slug || c.id === slug)
    const eventSlug = makeSlug(event.title)
    const url = company
      ? `${window.location.origin}/${company.slug}/bet/${id}/${eventSlug}`
      : `${window.location.origin}/event/${id}`
    const shareText = `"${event.title}" — ${prob.yes}% likely on Layoff Live`
    const shareData = {
      title: event.companyName,
      text: shareText,
      url,
    }
    recordShare(id!)
    if (navigator.share) {
      try { await navigator.share(shareData) } catch {}
    } else {
      await navigator.clipboard.writeText(`${shareText}\n${url}`)
      setShareCopied(true)
      setTimeout(() => setShareCopied(false), 2500)
      showToast('Copied to clipboard')
    }
  }

  const statusColors = {
    active: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
    expired: 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800',
    resolved: 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800',
    archived: 'bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-400 border-gray-200 dark:border-slate-600',
  }

  return (
    <Layout>
      {showConfetti && <BetConfetti count={20} onComplete={() => setShowConfetti(false)} />}
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-gray-400 dark:text-slate-400 hover:text-gray-600 dark:hover:text-slate-200 transition-colors mb-4 text-sm">
        <ChevronLeft className="w-4 h-4" /> Back
      </button>

      <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl p-5 mb-4 shadow-sm dark:shadow-none">
        <div className="flex items-center justify-between mb-3">
          <Link to={`/${companies.find(c => c.id === event.companyId)?.slug ?? event.companyId}`} className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
            <Building2 className="w-3.5 h-3.5" />
            {event.companyName}
          </Link>
          <div className="flex items-center gap-2">
            <button
              onClick={handleShare}
              title="Share this prediction"
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors text-gray-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-xs font-medium"
            >
              {shareCopied ? <Check className="w-4 h-4 text-emerald-500" /> : <Share2 className="w-4 h-4" />}
              <span>Share</span>
            </button>
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${statusColors[status]}`}>
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </span>
          </div>
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
            <div>
              <div className={`flex items-center gap-2 justify-center rounded-xl py-3 ${userBet.side === 'yes' ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300' : 'bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300'}`}>
                <CheckCircle className="w-4 h-4" />
                <span className="font-semibold text-sm">You bet {userBet.side.toUpperCase()} with {userBet.amount} Coins</span>
              </div>
              <button
                onClick={() => { removeBet(id!); showToast(`Bet removed · ${userBet.amount} coins refunded`) }}
                className="w-full mt-2 text-xs text-gray-400 dark:text-slate-600 hover:text-rose-500 dark:hover:text-rose-400 transition-colors text-center py-1"
              >
                Remove bet
              </button>
            </div>
          ) : (
            <>
              <div className="text-sm font-medium text-gray-700 dark:text-slate-300 mb-3">Place your bet</div>
              <div className="flex gap-2 mb-3">
                {[5, 10, 25, 50].map(amt => (
                  <button
                    key={amt}
                    onClick={() => setBetAmount(amt)}
                    disabled={!currentUser && amt > remainingGuestCoins}
                    className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${betAmount === amt ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-600'} disabled:opacity-40 disabled:cursor-not-allowed`}
                  >
                    {amt}
                  </button>
                ))}
              </div>

              {!currentUser && (
                <div className="text-xs text-gray-500 dark:text-slate-400 mb-3 text-center">
                  {remainingGuestCoins} coins remaining
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => handleBet('no')}
                  disabled={!canPlaceGuestBet && !currentUser}
                  className="flex-1 py-3 bg-rose-50 dark:bg-rose-900/20 hover:bg-rose-100 dark:hover:bg-rose-900/40 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 font-bold rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  ✕ NO
                </button>
                <button
                  onClick={() => handleBet('yes')}
                  disabled={!canPlaceGuestBet && !currentUser}
                  className="flex-1 py-3 bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 font-bold rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  ✓ YES
                </button>
              </div>
              {currentUser === null && remainingGuestCoins < betAmount && (
                <p className="text-center text-xs text-gray-400 dark:text-slate-500 mt-2">
                  Not enough coins. <button onClick={() => setShowAuthModal(true)} className="text-blue-600 dark:text-blue-400 hover:underline">Login</button> to get 100 coins daily.
                </p>
              )}
            </>
          )}
        </div>
      )}

      {/* Admin / Creator resolve */}
      {(isAdmin || isCreator) && (status === 'active' || status === 'expired') && (
        <div className="bg-blue-50 dark:bg-slate-800 border border-blue-200 dark:border-blue-800/50 rounded-2xl p-5 mb-4">
          <div className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-3">
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
        <div className="space-y-3 mb-4">
          {eventComments.length === 0 && (
            <p className="text-gray-400 dark:text-slate-500 text-sm text-center py-4">No comments yet. Be the first.</p>
          )}
          {eventComments.map(c => (
            <div key={c.id} className="bg-gray-50 dark:bg-slate-900 rounded-xl p-3 group">
              <p className="text-sm text-gray-700 dark:text-slate-200 leading-relaxed">{c.content}</p>
              <div className="flex items-center justify-between mt-1.5">
                <span className="text-xs text-gray-400 dark:text-slate-600">{new Date(c.createdAt).toLocaleString()}{c.editedAt && ' (edited)'}</span>
                {currentUser && (c.userId === currentUser.id || isAdmin) && (
                  <div className="flex gap-1">
                    <button onClick={() => handleEditComment(c)} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-blue-500 transition-all">
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => deleteComment(c.id)} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-rose-500 transition-all">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
        <form onSubmit={handleComment} className="space-y-2">
          <textarea
            ref={textareaRef}
            value={commentText}
            onChange={e => setCommentText(e.target.value)}
            onFocus={() => {
              if (textareaRef.current) {
                textareaRef.current.style.minHeight = '120px'
              }
            }}
            onBlur={() => {
              if (textareaRef.current && !commentText.trim() && !editingCommentId) {
                textareaRef.current.style.minHeight = '60px'
              }
            }}
            placeholder={currentUser ? (editingCommentId ? "Edit comment..." : "Add a comment...") : "Sign in to comment..."}
            maxLength={500}
            rows={3}
            className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-colors resize-none overflow-hidden"
            style={{ minHeight: editingCommentId ? '120px' : '60px' }}
          />
          {commentError && (
            <p className="text-xs text-rose-500">{commentError}</p>
          )}
          <div className="flex gap-2">
            <button type="submit" disabled={!commentText.trim()} className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl px-3 py-2 transition-colors flex items-center justify-center gap-2 text-white text-sm font-medium">
              <Send className="w-4 h-4" />
              {editingCommentId ? 'Update' : 'Comment'}
            </button>
            {editingCommentId && (
              <button type="button" onClick={handleCancelEdit} className="bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600 rounded-xl px-3 py-2 transition-colors text-gray-700 dark:text-slate-300 text-sm font-medium">
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      {showAuthModal && <AuthModal onClose={handleAuthClose} prompt="Sign in or create a free account to place your bet." />}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white dark:bg-slate-100 text-gray-900 dark:text-slate-900 px-5 py-2.5 rounded-full text-sm font-medium shadow-lg z-50">
          {toast}
        </div>
      )}
    </Layout>
  )
}
