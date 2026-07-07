import { useState, useEffect, useRef, useMemo } from 'react'
import { useParams, Link, useNavigate, Navigate, useLocation, useSearchParams } from 'react-router-dom'
import { PlusCircle, Star, Share2, Check, Send, X, Edit2, Trash2, ChevronLeft, TrendingUp } from 'lucide-react'
import confetti from 'canvas-confetti'
import { useStore } from '../store/useStore'
import { Layout } from '../components/Layout'
import { CompanyLogo } from '../components/CompanyLogo'
import { SwipeCard } from '../components/SwipeCard'
import { EmptyState } from '../components/EmptyState'
import { CompanyChat } from '../components/CompanyChat'
import { ChatFAB } from '../components/ChatFAB'
import { ModerationWarningModal } from '../components/ModerationWarningModal'
import { CommentVotes } from '../components/CommentVotes'
import { getProbability, timeUntil, formatDate, betMovementStr, timeAgo } from '../utils/odds'
import { checkContentModeration } from '../utils/moderation'
import { AdBanner } from '../components/AdBanner'
import { api } from '../services/api'

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
  const getUserBet = useStore(s => s.getUserBet)
  const removeBet = useStore(s => s.removeBet)
  const removeAnonymousVote = useStore(s => s.removeAnonymousVote)
  const anonVotedEvents = useStore(s => s.anonVotedEvents)
  const comments = useStore(s => s.comments)
  const addComment = useStore(s => s.addComment)
  const editComment = useStore(s => s.editComment)
  const deleteComment = useStore(s => s.deleteComment)
  const chatMessages = useStore(s => s.chatMessages)
  const deleteEvent = useStore(s => s.deleteEvent)
  const updateEvent = useStore(s => s.updateEvent)
  const [shareCopied, setShareCopied] = useState(false)
  const [anonCoins, setAnonCoins] = useState(() => {
    const stored = localStorage.getItem('anonCoins')
    return stored ? parseInt(stored) : 50
  })
  const [anonCoinsSpent, setAnonCoinsSpent] = useState(() => {
    const stored = localStorage.getItem('anonCoinsSpent')
    return stored ? parseInt(stored) : 0
  })
  const [swipeFlash, setSwipeFlash] = useState<{ id: string; side: 'yes' | 'no' } | null>(null)
  const [toast, setToast] = useState('')
  const [toastExiting, setToastExiting] = useState(false)
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({})
  const [focusedInput, setFocusedInput] = useState<string | null>(null)
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null)
  const [commentErrors, setCommentErrors] = useState<Record<string, string>>({})
  const [moderationWarning, setModerationWarning] = useState<{ eventId: string; reason: string; text: string } | null>(null)
  const [chatOpen, setChatOpen] = useState(false)
  const [newMessageCount, setNewMessageCount] = useState(0)
  const [shouldShake, setShouldShake] = useState(false)
  const [expandDescription, setExpandDescription] = useState(false)
  const [editingEventId, setEditingEventId] = useState<string | null>(null)
  const [editEventTitle, setEditEventTitle] = useState('')
  const [editEventDesc, setEditEventDesc] = useState('')
  const [chatDisplayName, setChatDisplayName] = useState('')
  const [chatExpiresAt, setChatExpiresAt] = useState<string | null>(null)
  const prevMessageCountRef = useRef(0)
  const prevNewMessagesRef = useRef(0)
  const myUserIdRef = useRef(currentUser?.id || `anon-${Date.now()}`)
  const shakeTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const scrollTargetRef = useRef<HTMLDivElement>(null)
  const { state } = useLocation() as { state?: { newEventId?: string; showToast?: boolean } | null }
  const [searchParams, setSearchParams] = useSearchParams()

  const company = companies.find(c => c.slug === slug)

  // Open chat directly when arriving via a shared chat link
  useEffect(() => {
    if (company && searchParams.get('chat') === 'open') {
      setChatOpen(true)
      searchParams.delete('chat')
      setSearchParams(searchParams, { replace: true })
    }
  }, [company?.id])

  const reloadChatSettings = (id: string, name: string) => {
    api.getChatSettings(id, name)
      .then(settings => {
        if (settings.displayName) setChatDisplayName(settings.displayName)
        setChatExpiresAt(settings.expiresAt || null)
      })
      .catch(() => {})
  }

  // Load chat display name when company changes
  useEffect(() => {
    if (company) reloadChatSettings(company.id, company.name)
  }, [company?.id])

  // Reload chat display name when chat closes (picks up changes made in chat)
  useEffect(() => {
    if (!chatOpen && company) reloadChatSettings(company.id, company.name)
  }, [chatOpen, company?.id])

  // Handle scrolling to newly created event
  useEffect(() => {
    if (state?.newEventId && scrollTargetRef.current) {
      setTimeout(() => {
        scrollTargetRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 100)
      if (state?.showToast) {
        setToast('Prediction created!')
        setTimeout(() => setToast(''), 2000)
      }
    }
  }, [state?.newEventId])

  useEffect(() => {
    localStorage.setItem('anonCoins', anonCoins.toString())
  }, [anonCoins])

  useEffect(() => {
    localStorage.setItem('anonCoinsSpent', anonCoinsSpent.toString())
  }, [anonCoinsSpent])

  // Initialize message count on first load
  useEffect(() => {
    if (company && !chatOpen && prevMessageCountRef.current === 0) {
      const companyMessages = chatMessages.filter(m => m.companyId === company.id)
      if (companyMessages.length > 0) {
        // On first load, count existing messages from others as new
        const messagesFromOther = companyMessages.filter(m => m.userId !== myUserIdRef.current)
        if (messagesFromOther.length > 0) {
          setNewMessageCount(messagesFromOther.length)
          prevNewMessagesRef.current = messagesFromOther.length
          prevMessageCountRef.current = companyMessages.length
        }
      }
    }
  }, [company, chatOpen, chatMessages])

  // Detect new messages while chat is minimized
  useEffect(() => {
    if (!company) return
    const companyMessages = chatMessages.filter(m => m.companyId === company.id)
    const totalMessageCount = companyMessages.length

    if (!chatOpen && totalMessageCount > prevMessageCountRef.current) {
      // Check if the new messages are from someone else
      const newMessages = companyMessages.slice(prevMessageCountRef.current)
      const messagesFromOther = newMessages.filter(m => m.userId !== myUserIdRef.current)

      if (messagesFromOther.length > 0) {
        const newCount = prevNewMessagesRef.current + messagesFromOther.length
        setNewMessageCount(newCount)
        prevNewMessagesRef.current = newCount

        // Trigger shake for the first batch of new messages
        if (prevNewMessagesRef.current === messagesFromOther.length) {
          setShouldShake(true)
          navigator.vibrate?.(15)
          setTimeout(() => setShouldShake(false), 600) // Duration of shake animation

          // Set up interval to shake every 20 seconds
          if (shakeTimerRef.current) clearInterval(shakeTimerRef.current)
          shakeTimerRef.current = setInterval(() => {
            setShouldShake(true)
            navigator.vibrate?.(15)
            setTimeout(() => setShouldShake(false), 600)
          }, 20000)
        }
      }
    }

    prevMessageCountRef.current = totalMessageCount
  }, [company, chatMessages, chatOpen])

  // Clear notification and timer when chat opens
  useEffect(() => {
    if (chatOpen) {
      setNewMessageCount(0)
      prevNewMessagesRef.current = 0
      setShouldShake(false)
      if (shakeTimerRef.current) {
        clearInterval(shakeTimerRef.current)
        shakeTimerRef.current = null
      }
    }
  }, [chatOpen])

  const handleAddComment = (eventId: string) => {
    if (!currentUser) return
    const text = commentInputs[eventId]?.trim()
    if (!text) return

    if (editingCommentId) {
      const result = editComment(editingCommentId, text)
      if (result.ok) {
        setCommentInputs(prev => ({ ...prev, [eventId]: '' }))
        setEditingCommentId(null)
        setCommentErrors(prev => ({ ...prev, [eventId]: '' }))
      } else {
        setCommentErrors(prev => ({ ...prev, [eventId]: result.error || 'Error' }))
      }
      return
    }

    const moderation = checkContentModeration(text)
    if (moderation) {
      setModerationWarning({ eventId, reason: moderation.reason, text })
      return
    }
    submitComment(eventId, text)
  }

  const submitComment = (eventId: string, text: string) => {
    const result = addComment(eventId, text)
    if (result.ok) {
      setCommentInputs(prev => ({ ...prev, [eventId]: '' }))
      setFocusedInput(null)
      setCommentErrors(prev => ({ ...prev, [eventId]: '' }))
      if (result.pending) showToast('Submitted for admin review.')
    } else {
      setCommentErrors(prev => ({ ...prev, [eventId]: result.error || 'Error' }))
    }
  }

  const handleEditComment = (comment: typeof comments[0], eventId: string) => {
    setEditingCommentId(comment.id)
    setCommentInputs(prev => ({ ...prev, [eventId]: comment.content }))
    setFocusedInput(eventId)
  }

  const handleCancelEdit = (eventId: string) => {
    setEditingCommentId(null)
    setCommentInputs(prev => ({ ...prev, [eventId]: '' }))
    setCommentErrors(prev => ({ ...prev, [eventId]: '' }))
  }

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

  const handleEditEvent = (event: typeof events[0]) => {
    setEditingEventId(event.id)
    setEditEventTitle(event.title)
    setEditEventDesc(event.description)
  }

  const handleSaveEventEdit = (eventId: string) => {
    updateEvent(eventId, { title: editEventTitle.trim(), description: editEventDesc.trim() } as any)
    setEditingEventId(null)
    showToast('Prediction updated!')
  }

  const handleDeleteEvent = (eventId: string) => {
    if (confirm('Are you sure you want to delete this prediction? This action cannot be undone.')) {
      deleteEvent(eventId)
      showToast('Prediction deleted')
    }
  }

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
      coins: currentUser.coins,
      totalBets: userBets.length,
      activeBets: activeBetCount,
      totalBetAmount,
    }
  }, [currentUser, bets, events, getEffectiveStatus])

  const handleSwipeBet = (eventId: string, side: 'yes' | 'no') => {
    const event = events.find(e => e.id === eventId)
    const movement = event ? betMovementStr(event.yesPool, event.noPool, side, 10) : ''
    const betAmount = 10
    const confettiColor = side === 'yes' ? '#22c55e' : '#d1206a'

    if (currentUser) {
      const existingBet = getUserBet(eventId)
      const isReducing = !!existingBet && existingBet.side !== side
      if (placeBet(eventId, side, betAmount)) {
        const newBet = getUserBet(eventId)
        setSwipeFlash({ id: eventId, side })
        setTimeout(() => setSwipeFlash(null), 600)
        if (isReducing) {
          if (!newBet) {
            // Bet was deleted (reduced to zero)
            showToast(`Deleted your ${existingBet!.side === 'yes' ? 'YES' : 'NO'} bet`)
          } else {
            // Bet was just reduced
            showToast(`Reduced your ${existingBet!.side === 'yes' ? 'YES' : 'NO'} bet by ${betAmount} coins`)
          }
        } else {
          confetti({ particleCount: betAmount, spread: 45, shapes: ['square'], scalar: 2, colors: [confettiColor], gravity: 0.5, ticks: 360 })
          showToast(`You bet ${side === 'yes' ? 'YES' : 'NO'} with ${betAmount} coins!`)
        }
      } else {
        showToast('Not enough coins or 100-coin limit reached')
      }
    } else {
      const existingVote = anonVotedEvents[eventId]
      const isReducing = !!existingVote && existingVote.lastSide !== side
      if (isReducing || Math.max(0, anonCoins - anonCoinsSpent) >= betAmount) {
        if (placeAnonymousVote(eventId, side)) {
          const newVote = anonVotedEvents[eventId]
          setAnonCoinsSpent(prev => isReducing ? Math.max(0, prev - betAmount) : prev + betAmount)
          setSwipeFlash({ id: eventId, side })
          setTimeout(() => setSwipeFlash(null), 600)
          if (isReducing) {
            if (!newVote) {
              // Vote was deleted (reduced to zero)
              showToast(`Deleted your ${existingVote!.lastSide === 'yes' ? 'YES' : 'NO'} bet`)
            } else {
              // Vote was just reduced
              showToast(`Reduced your ${existingVote!.lastSide === 'yes' ? 'YES' : 'NO'} bet by ${betAmount} coins`)
            }
          } else {
            confetti({ particleCount: betAmount, spread: 45, shapes: ['square'], scalar: 2, colors: [confettiColor], gravity: 0.5, ticks: 360 })
            showToast(`You bet ${side === 'yes' ? 'YES' : 'NO'} with ${betAmount} coins!`)
          }
        } else {
          showToast('Prediction is no longer active')
        }
      } else {
        showToast('Not enough coins')
      }
    }
  }

  const chatUserCount = useMemo(() => {
    if (!company) return 0
    const companyMessages = chatMessages.filter(m => m.companyId === company.id)
    const uniqueUserIds = new Set(companyMessages.map(m => m.userId))
    return uniqueUserIds.size
  }, [company, chatMessages])

  const prevVisitTimeRef = useRef<string | undefined>(company ? companyLastVisit[company.id] : undefined)

  useEffect(() => {
    if (!company) return
    document.title = chatOpen ? `${company.name} Live Chat | Layoff Live` : `${company.name} | Layoff Live`
    return () => { document.title = 'Layoff Live' }
  }, [company, chatOpen])

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
      title: `${company.name} on Layoff Live`,
      text: `What's really happening? Insiders are betting on it at LayoffLive.com - ${company.name}`,
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

  const handleShareChat = async (liveTopicName?: string | null) => {
    const url = `${window.location.origin}/${company.slug}?chat=open`
    const topicName = liveTopicName !== undefined ? liveTopicName : (chatExpiresAt && chatDisplayName !== `${company.name} Chat` ? chatDisplayName : null)
    const hasTopic = !!topicName
    const text = hasTopic
      ? `Join the "${topicName}" discussion at LayoffLive.com - ${company.name}`
      : `Join the live discussion at LayoffLive.com - ${company.name}`
    const shareData = { title: hasTopic ? `"${topicName}" — ${company.name} Chat on Layoff Live` : `${company.name} Chat on Layoff Live`, text, url }
    if (navigator.share) {
      try { await navigator.share(shareData) } catch {}
    } else {
      await navigator.clipboard.writeText(`${text}\n${url}`)
      showToast('Chat link copied to clipboard')
    }
  }

  const handleSharePoll = async (pollQuestion: string | null) => {
    const url = `${window.location.origin}/${company.slug}?chat=open`
    const hasQuestion = !!pollQuestion
    const text = hasQuestion
      ? `Vote on "${pollQuestion}" at LayoffLive.com - ${company.name}`
      : `Vote on this poll at LayoffLive.com - ${company.name}`
    const shareData = { title: hasQuestion ? `"${pollQuestion}" — ${company.name} Chat on Layoff Live` : `${company.name} Chat on Layoff Live`, text, url }
    if (navigator.share) {
      try { await navigator.share(shareData) } catch {}
    } else {
      await navigator.clipboard.writeText(`${text}\n${url}`)
      showToast('Poll link copied to clipboard')
    }
  }

  const PastEventsSection = () => past.length > 0 ? (
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
            <Link key={event.id} to={`/event/${event.id}`} className="block bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700/50 rounded-xl p-4 hover:border-blue-300 dark:hover:border-blue-700 transition-all">
              <div className="flex items-center justify-between mb-1.5">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s === 'resolved' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'}`}>
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
  ) : null

  return (
    <>
    <Layout>
      {/* 2-column layout on desktop */}
      <div className="sm:grid sm:grid-cols-[320px_1fr] sm:gap-8 sm:items-start">

        {/* LEFT COLUMN: title + description + past events */}
        <div className="sm:sticky sm:top-20">
          <div className="flex items-center gap-2 mb-2">
            <button onClick={() => navigate(-1)} className="flex items-center text-gray-400 dark:text-slate-400 hover:text-gray-600 dark:hover:text-slate-200 transition-colors flex-shrink-0 p-1">
              <ChevronLeft className="w-6 h-6" />
            </button>
            <h1 className="text-lg font-bold text-gray-900 dark:text-white">{company.name}</h1>
            <div className="ml-auto flex items-center gap-1">
              <button
                onClick={handleShare}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors text-gray-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-xs font-medium"
                title="Share this company"
              >
                {shareCopied ? <Check className="w-4 h-4 text-emerald-500" /> : <Share2 className="w-4 h-4" />}
                <span>{shareCopied ? 'Copied!' : 'Share'}</span>
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

          <div>
            <div className="text-gray-600 dark:text-slate-300 text-sm leading-snug mb-5">
              {expandDescription ? (
                <>
                  <p>{company.description}</p>
                  <button onClick={() => setExpandDescription(false)} className="text-blue-600 dark:text-blue-400 hover:underline text-xs font-medium mt-2">Show less</button>
                </>
              ) : (
                <div className="flex gap-1 items-baseline">
                  <span className="truncate sm:block">{company.description.split('.')[0]}.</span>
                  <button onClick={() => setExpandDescription(true)} className="text-blue-600 dark:text-blue-400 hover:underline text-xs font-medium whitespace-nowrap flex-shrink-0 sm:flex-shrink">More</button>
                </div>
              )}
            </div>
          </div>

          {/* Past events — desktop only in left column */}
          <div className="hidden sm:block">
            <PastEventsSection />
          </div>
        </div>

        {/* RIGHT COLUMN: active predictions */}
        <div>
          {active.length > 0 && (
            <section className="mb-6">
              <div className="space-y-3">
                {active.map((event, idx) => {
                  const { dominant, pct } = barProps(event.yesPool, event.noPool)
                  const flash = swipeFlash?.id === event.id
                  const anonVote = anonVotedEvents[event.id]
                  const anonCount = anonVote?.count ?? 0
                  const exhausted = !currentUser && anonCount >= 10
                  const eventComments = comments.filter(c => c.eventId === event.id)
                  const midpoint = Math.floor(active.length / 2)
                  const userBet = currentUser ? bets.find(b => b.eventId === event.id && b.userId === currentUser.id) : null
                  const eventBetCount = bets.filter(b => b.eventId === event.id).length
                  return (
                    <>
                      <div key={event.id} ref={state?.newEventId === event.id ? scrollTargetRef : null}>
                      <SwipeCard
                        onSwipeYes={() => handleSwipeBet(event.id, 'yes')}
                        onSwipeNo={() => handleSwipeBet(event.id, 'no')}
                        disabled={exhausted}
                        onClick={() => navigate(`/event/${event.id}`)}
                        demoActive={false}
                        cardClassName={`bg-white dark:bg-slate-800 border rounded-xl p-4 shadow-sm [@media(hover:hover)]:hover:shadow-md select-none transition-shadow
                          ${flash && swipeFlash?.side === 'yes' ? 'border-emerald-400 dark:border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' :
                            flash && swipeFlash?.side === 'no' ? 'border-rose-400 dark:border-rose-500 bg-rose-50 dark:bg-rose-900/20' :
                            'border-blue-200 dark:border-blue-800'}`}
                      >
                        {userBet && (
                          <div className={`mb-2 ${userBet.side === 'no' ? 'flex justify-end' : ''}`}>
                            <button
                              onClick={(ev) => { ev.stopPropagation(); handleCancelBet(event.id, !currentUser) }}
                              className={`inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full transition-opacity hover:opacity-75 ${userBet.side === 'yes' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}
                            >
                              {userBet.side === 'yes' ? 'YES' : 'NO'} - {userBet.amount} coins
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                        {!userBet && anonVote && (
                          <div className={`mb-2 ${anonVote.lastSide === 'no' ? 'flex justify-end' : ''}`}>
                            <button
                              onClick={(ev) => { ev.stopPropagation(); handleCancelBet(event.id, true) }}
                              className={`inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full transition-opacity hover:opacity-75 ${anonVote.lastSide === 'yes' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}
                            >
                              {anonVote.lastSide === 'yes' ? 'YES' : 'NO'} - {anonVote.count * 10} coins
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                        <div className="flex items-start justify-between gap-2 mb-2 group">
                          {editingEventId === event.id ? (
                            <input
                              type="text"
                              value={editEventTitle}
                              onChange={e => setEditEventTitle(e.target.value)}
                              className="flex-1 text-sm bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded px-2 py-1 text-gray-900 dark:text-white"
                            />
                          ) : (
                            <p className="text-sm text-gray-900 dark:text-white font-medium leading-snug flex-1">{event.title}</p>
                          )}
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {currentUser && (event.creatorId === currentUser.id || currentUser.isAdmin) && (
                              <>
                                {editingEventId === event.id ? (
                                  <>
                                    <button
                                      onClick={(ev) => { ev.stopPropagation(); handleSaveEventEdit(event.id) }}
                                      className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors"
                                      title="Save changes"
                                    >
                                      <Check className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={(ev) => { ev.stopPropagation(); setEditingEventId(null) }}
                                      className="text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 transition-colors"
                                      title="Cancel"
                                    >
                                      <X className="w-4 h-4" />
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <button
                                      onClick={(ev) => { ev.stopPropagation(); handleEditEvent(event) }}
                                      className="opacity-0 group-hover:opacity-100 text-gray-300 dark:text-slate-600 hover:text-blue-500 transition-all"
                                      title="Edit prediction"
                                    >
                                      <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={(ev) => { ev.stopPropagation(); handleDeleteEvent(event.id) }}
                                      className="opacity-0 group-hover:opacity-100 text-gray-300 dark:text-slate-600 hover:text-rose-500 transition-all"
                                      title="Delete prediction"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </>
                                )}
                              </>
                            )}
                            {prevVisitTimeRef.current && event.createdAt > prevVisitTimeRef.current && (
                              <span className="flex-shrink-0 text-[10px] font-bold bg-blue-600 text-white px-1.5 py-0.5 rounded-full">NEW</span>
                            )}
                          </div>
                        </div>
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
                          <span className="text-[11px] font-medium text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/40 px-2 py-0.5 rounded-full whitespace-nowrap">{timeUntil(event.expiresAt)}</span>
                          {dominant === 'no'
                            ? <span className="text-rose-600 dark:text-rose-400 font-semibold">NO {pct}%</span>
                            : <span className="text-gray-400 dark:text-slate-500">{eventBetCount} bet{eventBetCount === 1 ? '' : 's'}</span>
                          }
                        </div>
                      </SwipeCard>
                      <div className="mt-2">
                        {eventComments.length > 0 && (
                          <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 mb-2">
                            Discussion ({eventComments.length})
                          </p>
                        )}
                        <div className="space-y-1.5">
                        {[...eventComments].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map(cmt => {
                          const canEdit = currentUser && (cmt.userId === currentUser.id || currentUser.isAdmin)
                          return (
                            <div key={cmt.id} className="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-xl px-3 py-2.5 shadow-sm group">
                              <p className="text-sm text-gray-800 dark:text-slate-200 leading-relaxed break-words">{cmt.content}</p>
                              <div className="flex items-center justify-between gap-2 mt-1">
                                <p className="text-[11px] text-gray-400 dark:text-slate-500">
                                  {timeAgo(cmt.createdAt)}{cmt.editedAt && ' · edited'}
                                </p>
                                <div className="flex items-center gap-1 flex-shrink-0">
                                  {canEdit && (
                                    <>
                                      <button
                                        onClick={ev => { ev.stopPropagation(); handleEditComment(cmt, event.id) }}
                                        className="opacity-0 group-hover:opacity-100 text-gray-300 dark:text-slate-600 hover:text-blue-500 transition-all"
                                      >
                                        <Edit2 className="w-3 h-3" />
                                      </button>
                                      <button
                                        onClick={ev => { ev.stopPropagation(); deleteComment(cmt.id) }}
                                        className="opacity-0 group-hover:opacity-100 text-gray-300 dark:text-slate-600 hover:text-rose-500 transition-all"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    </>
                                  )}
                                  <CommentVotes comment={cmt} />
                                </div>
                              </div>
                            </div>
                          )
                        })}
                        </div>
                        {commentErrors[event.id] && (
                          <p className="text-[10px] text-rose-500 mt-1">{commentErrors[event.id]}</p>
                        )}
                        <div className="flex gap-1.5 mt-2">
                          <input
                            value={commentInputs[event.id] ?? ''}
                            onChange={ev => setCommentInputs(prev => ({ ...prev, [event.id]: ev.target.value }))}
                            onKeyDown={ev => { if (ev.key === 'Enter') handleAddComment(event.id) }}
                            onFocus={() => setFocusedInput(event.id)}
                            onBlur={() => setTimeout(() => setFocusedInput(f => f === event.id ? null : f), 150)}
                            onClick={ev => ev.stopPropagation()}
                            placeholder={editingCommentId ? "Edit comment..." : "Add a comment..."}
                            maxLength={500}
                            className="flex-1 text-sm bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-xl px-3 py-2 text-gray-700 dark:text-slate-300 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-400 dark:focus:ring-blue-500 shadow-sm"
                          />
                          {focusedInput === event.id && (
                            <>
                              <button
                                onMouseDown={ev => ev.preventDefault()}
                                onClick={ev => { ev.stopPropagation(); handleAddComment(event.id) }}
                                className="flex-shrink-0 w-9 h-9 flex items-center justify-center bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-colors"
                                title={editingCommentId ? "Update" : "Comment"}
                              >
                                <Send className="w-4 h-4" />
                              </button>
                              {editingCommentId && (
                                <button
                                  onMouseDown={ev => ev.preventDefault()}
                                  onClick={ev => { ev.stopPropagation(); handleCancelEdit(event.id) }}
                                  className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-gray-300 dark:bg-slate-600 hover:bg-gray-400 dark:hover:bg-slate-500 text-gray-700 dark:text-slate-300 rounded-xl transition-colors text-xs font-medium"
                                >
                                  ✕
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                      </div>
                    </>
                  )
                })}

                {/* Add prediction CTA */}
                <div className="bg-gray-50 dark:bg-slate-800/50 rounded-xl p-4 flex flex-col items-center gap-3 mt-2">
                  <span className="text-sm text-gray-600 dark:text-slate-400">Make your first prediction</span>
                  {currentUser ? (
                    <button
                      onClick={() => navigate('/create', { state: { companyId: company.id } })}
                      className="px-3 py-1.5 rounded-lg border border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 text-sm font-medium transition-colors"
                    >
                      + New bet
                    </button>
                  ) : (
                    <button
                      onClick={() => navigate('/create', { state: { companyId: company.id } })}
                      className="px-3 py-1.5 rounded-lg border border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 text-sm font-medium transition-colors"
                    >
                      + Bet
                    </button>
                  )}
                </div>
              </div>
            </section>
          )}

          {/* Past events — mobile only (desktop renders in left column) */}
          <div className="sm:hidden">
            <PastEventsSection />
          </div>

          {companyEvents.length === 0 && (
            <EmptyState
              icon={TrendingUp}
              description="No predictions yet for this company."
              action={
                <Link to="/create" state={{ companyId: company.id }} className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors">
                  <PlusCircle className="w-4 h-4" /> Create a Prediction
                </Link>
              }
            />
          )}
        </div>

      </div>{/* end 2-col grid */}

      {/* Copied toast */}
      {shareCopied && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-white dark:bg-slate-100 text-gray-900 dark:text-slate-900 text-xs font-medium px-4 py-2.5 rounded-full shadow-lg flex items-center gap-2 animate-fade-in">
          <Check className="w-3.5 h-3.5 text-emerald-500" /> Link copied to clipboard
        </div>
      )}

      {toast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 bg-white dark:bg-slate-100 text-gray-900 dark:text-slate-900 px-5 py-2.5 rounded-full text-sm font-medium shadow-lg z-[60] pointer-events-none ${toastExiting ? 'animate-slide-down' : 'animate-slide-up'}`}>
          {toast}
        </div>
      )}

      {moderationWarning && (
        <ModerationWarningModal
          reason={moderationWarning.reason}
          onEdit={() => setModerationWarning(null)}
          onSubmitAnyway={() => {
            const { eventId, text } = moderationWarning
            setModerationWarning(null)
            submitComment(eventId, text)
          }}
        />
      )}

      {/* Ad Banner at bottom */}
      <div className="mt-12 mb-20">
        <AdBanner />
      </div>

    </Layout>

    {/* Community Chat - positioned outside Layout for correct fixed positioning */}
    {company && (
      <>
        <ChatFAB companyName={company.name} onClick={() => setChatOpen(true)} newMessageCount={newMessageCount} shouldShake={shouldShake} chatDisplayName={chatDisplayName} expiresAt={chatExpiresAt} />
        <CompanyChat companyId={company.id} companyName={company.name} isOpen={chatOpen} onClose={() => setChatOpen(false)} onTopicCreated={() => reloadChatSettings(company.id, company.name)} onShare={handleShareChat} onSharePoll={handleSharePoll} />
      </>
    )}
    </>
  )
}
