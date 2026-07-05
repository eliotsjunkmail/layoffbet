import { useState, useRef, useEffect } from 'react'
import { X, Send, ThumbsUp, ThumbsDown, Laugh, Frown, Trash2, RefreshCw, CheckCircle, Edit2, Share2, Plus, MessageSquarePlus, BarChart3 } from 'lucide-react'
import { useStore } from '../store/useStore'
import { api } from '../services/api'
import { checkContentModeration } from '../utils/moderation'

type ReactionType = 'thumbsup' | 'thumbsdown' | 'laugh' | 'cry'

interface Reaction {
  type: ReactionType
  userIds: string[]
}

interface PollVotes {
  poll: true
  votes: Record<number, string[]>
}

interface ChatMessage {
  id: string
  companyId: string
  userId: string
  username: string
  text: string
  createdAt: Date
  reactions: Reaction[] | PollVotes
}

const POLL_PREFIX = 'POLL::'

const isPollMessage = (msg: { text: string }) => msg.text.startsWith(POLL_PREFIX)

const parsePoll = (text: string): { question?: string; options: string[] } | null => {
  if (!text.startsWith(POLL_PREFIX)) return null
  try {
    return JSON.parse(text.slice(POLL_PREFIX.length))
  } catch {
    return null
  }
}

const TRACKED_WORD = 'AI'

const countWordMentions = (msgs: { text: string; username: string }[], word: string) => {
  const regex = new RegExp(`\\b${word}\\b`, 'gi')
  return msgs.reduce((count, m) => {
    if (m.username === 'System' || isPollMessage(m)) return count
    const matches = m.text.match(regex)
    return count + (matches ? matches.length : 0)
  }, 0)
}

export const CompanyChat = ({ companyId, companyName, isOpen, onClose, onTopicCreated, onShare, onSharePoll }: { companyId: string; companyName: string; isOpen: boolean; onClose: () => void; onTopicCreated?: () => void; onShare?: (topicName: string | null) => void; onSharePoll?: (pollQuestion: string | null) => void }) => {
  const currentUser = useStore(s => s.currentUser)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [toast, setToast] = useState('')
  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 4000) }
  const [chatDisplayName, setChatDisplayName] = useState(companyName + ' Chat')
  const [editingName, setEditingName] = useState(false)
  const [editNameValue, setEditNameValue] = useState(companyName + ' Chat')
  const [isLocked, setIsLocked] = useState(false)
  const [expiresAt, setExpiresAt] = useState<string | null>(null)
  const [showDurationPicker, setShowDurationPicker] = useState(false)
  const [selectedDuration, setSelectedDuration] = useState(2)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isAutoUpdating, setIsAutoUpdating] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [showClearDialog, setShowClearDialog] = useState(false)
  const [isClearing, setIsClearing] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState('')
  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const timeRemainingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const myUserIdRef = useRef<string>(currentUser?.id || `anon-${Date.now()}`)
  const pendingReactionsRef = useRef<Set<string>>(new Set())
  const [typingUsers, setTypingUsers] = useState<{ userId: string; username: string }[]>([])
  const myChatNameRef = useRef<string | null>(null)
  const lastTypingPingRef = useRef(0)
  const [shouldRender, setShouldRender] = useState(isOpen)
  const [isVisible, setIsVisible] = useState(false)
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [showActionsMenu, setShowActionsMenu] = useState(false)
  const [showPollComposer, setShowPollComposer] = useState(false)
  const [pollQuestion, setPollQuestion] = useState('')
  const [pollChoices, setPollChoices] = useState<string[]>(['', ''])
  const [editingPollId, setEditingPollId] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current)
        closeTimeoutRef.current = null
      }
      setShouldRender(true)
      const raf = requestAnimationFrame(() => setIsVisible(true))
      return () => cancelAnimationFrame(raf)
    } else {
      setIsVisible(false)
      closeTimeoutRef.current = setTimeout(() => setShouldRender(false), 200)
      return () => {
        if (closeTimeoutRef.current) {
          clearTimeout(closeTimeoutRef.current)
          closeTimeoutRef.current = null
        }
      }
    }
  }, [isOpen])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    if (isOpen) {
      loadMessages()
      startPolling()
      loadChatSettings()
    } else {
      stopPolling()
    }

    return () => stopPolling()
  }, [isOpen, companyId])

  useEffect(() => {
    if (!expiresAt) {
      setTimeRemaining('')
      if (timeRemainingIntervalRef.current) {
        clearInterval(timeRemainingIntervalRef.current)
        timeRemainingIntervalRef.current = null
      }
      return
    }

    const checkExpiry = () => {
      const now = new Date().getTime()
      const expires = new Date(expiresAt).getTime()
      const diff = expires - now

      if (diff <= 0 && isLocked && chatDisplayName !== companyName + ' Chat') {
        handleTopicExpired(chatDisplayName)
        return
      }

      if (diff <= 0) {
        setTimeRemaining('')
        return
      }
      const hours = Math.floor(diff / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      if (hours > 0) {
        setTimeRemaining(`${hours}h ${minutes}m`)
      } else {
        setTimeRemaining(`${minutes}m`)
      }
    }

    checkExpiry()
    timeRemainingIntervalRef.current = setInterval(checkExpiry, 60000)

    return () => {
      if (timeRemainingIntervalRef.current) {
        clearInterval(timeRemainingIntervalRef.current)
        timeRemainingIntervalRef.current = null
      }
    }
  }, [expiresAt, isLocked, chatDisplayName, companyName])

  const loadChatSettings = async () => {
    try {
      const settings = await api.getChatSettings(companyId, companyName)
      if (settings.displayName) {
        setChatDisplayName(settings.displayName)
        setEditNameValue(settings.displayName)
      }
      setIsLocked(settings.isLocked || false)
      setExpiresAt(settings.expiresAt || null)
    } catch (error) {
      console.error('Failed to load chat settings:', error)
    }
  }

  const handleShareClick = () => {
    if (!onShare) return
    const activeTopic = expiresAt && new Date(expiresAt) > new Date() && chatDisplayName !== companyName + ' Chat'
      ? chatDisplayName
      : null
    onShare(activeTopic)
  }

  const handleSaveChatName = async () => {
    if (!editNameValue.trim()) return
    if (!isLocked) {
      setShowDurationPicker(true)
    } else {
      await confirmSaveChatName()
    }
  }

  const confirmSaveChatName = async () => {
    try {
      const durationHours = showDurationPicker ? selectedDuration : 0
      const response = await api.updateChatSettings(companyId, {
        displayName: editNameValue.trim(),
        durationHours,
        userId: currentUser?.id || null,
      })
      setChatDisplayName(editNameValue.trim())
      setEditingName(false)
      setShowDurationPicker(false)
      setIsLocked(durationHours > 0)
      // Use server response for expiry time
      if (response.expiresAt) {
        setExpiresAt(response.expiresAt)
      } else if (durationHours > 0) {
        setExpiresAt(new Date(Date.now() + durationHours * 60 * 60 * 1000).toISOString())
      }

      // Add system message to chat
      const now = new Date()
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      const dateStr = now.toLocaleDateString([], { month: 'short', day: 'numeric' })
      const localId = `system-${Date.now()}`
      const systemMessage: ChatMessage = {
        id: localId,
        companyId,
        userId: currentUser?.id || myUserIdRef.current,
        username: 'System',
        text: `New Topic: "${editNameValue.trim()}" (${durationHours}h)\n${timeStr} • ${dateStr}`,
        createdAt: new Date(),
        reactions: []
      }
      setMessages(prev => [...prev, systemMessage])

      // Save system message to server and replace local id with server id
      try {
        const saved = await api.addChatMessage(companyId, {
          text: systemMessage.text,
          username: 'System',
          userId: currentUser?.id || myUserIdRef.current,
        })
        setMessages(prev => prev.map(m => m.id === localId ? { ...m, id: saved.id } : m))
      } catch (error) {
        console.error('Failed to save system message:', error)
      }

      // Notify parent to reload chat settings
      if (onTopicCreated) {
        onTopicCreated()
      }
    } catch (error) {
      console.error('Failed to update chat name:', error)
    }
  }

  const endTopic = async () => {
    if (!currentUser?.isAdmin) return
    const topicName = chatDisplayName
    try {
      await api.updateChatSettings(companyId, {
        displayName: '',
        durationHours: 0,
        userId: null,
      })
      setChatDisplayName(companyName + ' Chat')
      setEditNameValue(companyName + ' Chat')
      setIsLocked(false)
      setExpiresAt(null)

      const now = new Date()
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      const dateStr = now.toLocaleDateString([], { month: 'short', day: 'numeric' })
      const endLocalId = `system-${Date.now()}`
      const systemMessage: ChatMessage = {
        id: endLocalId,
        companyId,
        userId: currentUser?.id || myUserIdRef.current,
        username: 'System',
        text: `Topic "${topicName}" ended\n${timeStr} • ${dateStr}`,
        createdAt: new Date(),
        reactions: []
      }
      setMessages(prev => [...prev, systemMessage])

      try {
        const saved = await api.addChatMessage(companyId, {
          text: systemMessage.text,
          username: 'System',
          userId: currentUser?.id || myUserIdRef.current,
        })
        setMessages(prev => prev.map(m => m.id === endLocalId ? { ...m, id: saved.id } : m))
      } catch (error) {
        console.error('Failed to save topic ended message:', error)
      }
    } catch (error) {
      console.error('Failed to end topic:', error)
    }
  }

  const startPolling = () => {
    if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current)

    pollingIntervalRef.current = setInterval(() => {
      loadMessages()
      loadTypingUsers()
    }, 3000) // Poll every 3 seconds
  }

  const loadTypingUsers = async () => {
    try {
      const typers = await api.getTypingUsers(companyId, myUserIdRef.current)
      if (Array.isArray(typers)) setTypingUsers(typers)
    } catch (error) {
      console.error('Failed to load typing users:', error)
    }
  }

  const notifyTyping = async () => {
    const now = Date.now()
    if (now - lastTypingPingRef.current < 1500) return
    lastTypingPingRef.current = now

    const userId = myUserIdRef.current
    try {
      if (!myChatNameRef.current) {
        const nameResponse = await api.getOrAssignChatName(companyId, userId)
        myChatNameRef.current = nameResponse.chatName
      }
      await api.setTyping(companyId, userId, myChatNameRef.current || 'Someone')
    } catch (error) {
      console.error('Failed to send typing status:', error)
    }
  }

  const stopPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current)
      pollingIntervalRef.current = null
    }
  }

  const handleManualRefresh = async () => {
    setIsRefreshing(true)
    try {
      await loadMessages()
    } finally {
      setIsRefreshing(false)
    }
  }

  const loadMessages = async () => {
    setIsLoading(true)
    try {
      const loadedMessages = await api.getChatMessages(companyId)
      if (!Array.isArray(loadedMessages)) {
        console.error('Invalid chat messages response:', loadedMessages)
        setIsLoading(false)
        return
      }

      const messagesWithDates = loadedMessages.map((m: any) => ({ ...m, createdAt: new Date(m.createdAt) }))

      // Merge loaded messages with existing messages to preserve reactions and system messages
      setMessages(prevMessages => {
        try {
          // Keep local system messages that might not be on the server yet
          const localSystemMessages = prevMessages.filter(m => m.username === 'System')

          const mergedMessages = messagesWithDates.map((loaded: ChatMessage) => {
            const existing = prevMessages.find(p => p.id === loaded.id)
            if (!existing) return loaded

            // Poll votes are trusted straight from the server (not array-shaped reactions)
            if (isPollMessage(loaded)) return loaded

            // Always preserve existing reactions and merge with server data
            // This prevents reactions from disappearing during polling
            const mergedReactions = [...(Array.isArray(loaded.reactions) ? loaded.reactions : [])]

            // Add any local reactions that might not be on the server yet (pending)
            if (existing.reactions && Array.isArray(existing.reactions)) {
              existing.reactions.forEach(localReaction => {
                const serverReactionIndex = mergedReactions.findIndex(r => r.type === localReaction.type)
                if (serverReactionIndex === -1) {
                  // Local reaction not on server yet (pending)
                  mergedReactions.push(localReaction)
                } else if (mergedReactions[serverReactionIndex].userIds.length < localReaction.userIds.length) {
                  // Local has more reactions (user just added one)
                  mergedReactions[serverReactionIndex] = localReaction
                }
              })
            }

            return { ...loaded, reactions: mergedReactions }
          })

          // Add back system messages not yet on server, inserted at chronological position
          const systemMessagesOnServer = new Set(messagesWithDates.map(m => m.id))
          localSystemMessages.forEach(sysMsg => {
            if (!systemMessagesOnServer.has(sysMsg.id)) {
              const insertIdx = mergedMessages.findIndex(m => m.createdAt > sysMsg.createdAt)
              if (insertIdx === -1) mergedMessages.push(sysMsg)
              else mergedMessages.splice(insertIdx, 0, sysMsg)
            }
          })

          return mergedMessages
        } catch (err) {
          console.error('Error merging reactions:', err)
          return messagesWithDates
        }
      })
    } catch (error) {
      console.error('Failed to load chat messages:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSend = async () => {
    if (!input.trim()) return

    const userId = myUserIdRef.current
    const text = input.trim()

    const moderation = checkContentModeration(text)
    if (moderation) {
      try {
        const nameResponse = await api.getOrAssignChatName(companyId, userId)
        await api.submitForModeration({
          contentType: 'chat_message',
          companyId,
          companyName,
          userId,
          reason: moderation.reason,
          payload: { companyId, userId, username: nameResponse.chatName, text, reactions: [] },
        })
        setInput('')
        showToast(`Your message needs admin approval before it's visible — it may contain ${moderation.reason}.`)
      } catch (error) {
        console.error('Failed to submit message for moderation:', error)
      }
      return
    }

    try {
      // Get or assign anonymous chat name
      const nameResponse = await api.getOrAssignChatName(companyId, userId)
      const chatName = nameResponse.chatName

      const messageData = {
        userId,
        username: chatName,
        text,
        reactions: [],
      }

      const savedMessage = await api.addChatMessage(companyId, messageData)
      const newMessage: ChatMessage = {
        ...savedMessage,
        createdAt: new Date(savedMessage.createdAt),
        reactions: [],
      }
      setMessages(prev => [...prev, newMessage])
      setInput('')
    } catch (error) {
      console.error('Failed to send message:', error)
    }
  }

  const toggleReaction = async (messageId: string, reactionType: ReactionType) => {
    const userId = myUserIdRef.current
    const key = `${messageId}-${reactionType}`
    pendingReactionsRef.current.add(key)

    const updatedMessages = messages.map(msg => {
      if (msg.id === messageId) {
        const reactions = [...(msg.reactions as Reaction[])]
        const reactionIndex = reactions.findIndex(r => r.type === reactionType)

        if (reactionIndex >= 0) {
          const reaction = reactions[reactionIndex]
          if (reaction.userIds.includes(userId)) {
            reaction.userIds = reaction.userIds.filter(id => id !== userId)
            if (reaction.userIds.length === 0) {
              reactions.splice(reactionIndex, 1)
            }
          } else {
            reaction.userIds.push(userId)
          }
        } else {
          reactions.push({ type: reactionType, userIds: [userId] })
        }

        return { ...msg, reactions }
      }
      return msg
    })

    setMessages(updatedMessages)

    // Persist to server
    const updatedMessage = updatedMessages.find(m => m.id === messageId)
    if (updatedMessage) {
      try {
        await api.updateChatMessageReactions(companyId, messageId, updatedMessage.reactions)
      } catch (error) {
        console.error('Failed to save reaction:', error)
      } finally {
        pendingReactionsRef.current.delete(key)
      }
    }
  }

  const toggleVote = async (messageId: string, optionIndex: number) => {
    const userId = myUserIdRef.current
    const msg = messages.find(m => m.id === messageId)
    if (!msg) return
    const current = msg.reactions as PollVotes
    const votes: Record<number, string[]> = {}
    Object.entries(current.votes || {}).forEach(([k, ids]) => {
      const remaining = ids.filter(id => id !== userId)
      if (remaining.length > 0) votes[Number(k)] = remaining
    })
    const alreadyVoted = (current.votes?.[optionIndex] || []).includes(userId)
    if (!alreadyVoted) {
      votes[optionIndex] = [...(votes[optionIndex] || []), userId]
    }
    const updated: PollVotes = { poll: true, votes }
    setMessages(prev => prev.map(m => m.id === messageId ? { ...m, reactions: updated } : m))
    try {
      await api.updateChatMessageReactions(companyId, messageId, updated)
    } catch (error) {
      console.error('Failed to save vote:', error)
    }
  }

  const updatePollChoice = (index: number, value: string) => {
    setPollChoices(prev => {
      const next = [...prev]
      next[index] = value
      if (index === next.length - 1 && value.trim() !== '' && next.length < 8) {
        next.push('')
      }
      return next
    })
  }

  const closePollComposer = () => {
    setShowPollComposer(false)
    setPollQuestion('')
    setPollChoices(['', ''])
    setEditingPollId(null)
  }

  const startEditPoll = (msg: ChatMessage, pollData: { question?: string; options: string[] }) => {
    setEditingPollId(msg.id)
    setPollQuestion(pollData.question || '')
    setPollChoices([...pollData.options, ''])
    setShowPollComposer(true)
  }

  const handleSavePoll = async () => {
    const options = pollChoices.map(c => c.trim()).filter(Boolean)
    if (options.length < 2) return
    const question = pollQuestion.trim()

    if (editingPollId) {
      const newText = POLL_PREFIX + JSON.stringify({ question: question || undefined, options })
      try {
        await api.updateChatMessageText(companyId, editingPollId, newText)
        setMessages(prev => prev.map(m => m.id === editingPollId ? { ...m, text: newText } : m))
        closePollComposer()
      } catch (error) {
        console.error('Failed to update poll:', error)
      }
      return
    }

    const userId = myUserIdRef.current
    try {
      const nameResponse = await api.getOrAssignChatName(companyId, userId)
      const chatName = nameResponse.chatName

      const pollReactions: PollVotes = { poll: true, votes: {} }
      const messageData = {
        userId,
        username: chatName,
        text: POLL_PREFIX + JSON.stringify({ question: question || undefined, options }),
        reactions: pollReactions,
      }

      const savedMessage = await api.addChatMessage(companyId, messageData)
      const newMessage: ChatMessage = {
        ...savedMessage,
        createdAt: new Date(savedMessage.createdAt),
        reactions: pollReactions,
      }
      setMessages(prev => [...prev, newMessage])
      closePollComposer()
    } catch (error) {
      console.error('Failed to send poll:', error)
    }
  }

  const deleteMessage = async (messageId: string) => {
    if (!currentUser) return
    const message = messages.find(m => m.id === messageId)
    if (!message || message.userId !== currentUser.id) return

    try {
      await api.deleteChatMessage(companyId, messageId)
      setMessages(prev => prev.filter(m => m.id !== messageId))
    } catch (error) {
      console.error('Failed to delete message:', error)
    }
  }

  const handleClearChatHistory = async () => {
    if (!currentUser?.isAdmin) return

    setIsClearing(true)
    try {
      await api.clearChatMessages(companyId)
      setMessages([])
      setShowClearDialog(false)
    } catch (error) {
      console.error('Failed to clear chat history:', error)
    } finally {
      setIsClearing(false)
    }
  }

  const handleTopicExpired = async (topicName: string) => {
    // Reset chat name back to company name
    setChatDisplayName(companyName + ' Chat')
    setEditNameValue(companyName + ' Chat')
    setIsLocked(false)
    setExpiresAt(null)

    // Add system message that topic ended
    const now = new Date()
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    const dateStr = now.toLocaleDateString([], { month: 'short', day: 'numeric' })
    const endLocalId = `system-${Date.now()}`
    const systemMessage: ChatMessage = {
      id: endLocalId,
      companyId,
      userId: currentUser?.id || myUserIdRef.current,
      username: 'System',
      text: `Topic "${topicName}" ended\n${timeStr} • ${dateStr}`,
      createdAt: new Date(),
      reactions: []
    }
    setMessages(prev => [...prev, systemMessage])

    try {
      const saved = await api.addChatMessage(companyId, {
        text: systemMessage.text,
        username: 'System',
        userId: currentUser?.id || myUserIdRef.current,
      })
      setMessages(prev => prev.map(m => m.id === endLocalId ? { ...m, id: saved.id } : m))
    } catch (error) {
      console.error('Failed to save topic ended message:', error)
    }
  }

  const getReactionEmoji = (type: ReactionType) => {
    const emojis: Record<ReactionType, string> = {
      thumbsup: '👍',
      thumbsdown: '👎',
      laugh: '😂',
      cry: '😢',
    }
    return emojis[type]
  }

  const getReactionIcon = (type: ReactionType) => {
    const iconProps = 'w-3 h-3'
    switch (type) {
      case 'thumbsup':
        return <ThumbsUp className={iconProps} />
      case 'thumbsdown':
        return <ThumbsDown className={iconProps} />
      case 'laugh':
        return <Laugh className={iconProps} />
      case 'cry':
        return <Frown className={iconProps} />
    }
  }

  if (!shouldRender) return null

  const aiMentionCount = countWordMentions(messages, TRACKED_WORD)

  return (
    <div className={`fixed inset-0 z-50 bg-black/40 flex flex-col transition-opacity duration-200 ease-out ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
      <div className={`flex-1 mt-6 sm:mt-10 bg-white dark:bg-slate-900 rounded-t-2xl shadow-2xl flex flex-col overflow-hidden transition-transform duration-200 ease-out ${isVisible ? 'translate-y-0' : 'translate-y-full'}`}>
      {/* Header */}
      <div className="bg-blue-600 text-white px-3 py-2 sm:px-4 sm:py-3 border-b border-blue-700">
        {/* First row: Title and minimize button */}
        <div className="flex items-center justify-between mb-1">
          {editingName && !isLocked ? (
            <input
              type="text"
              value={editNameValue}
              onChange={(e) => setEditNameValue(e.target.value)}
              onBlur={handleSaveChatName}
              onKeyPress={(e) => e.key === 'Enter' && handleSaveChatName()}
              autoFocus
              className="flex-1 px-2 py-1 rounded text-gray-900 text-sm font-semibold"
            />
          ) : (
            <>
              <div className="flex items-center gap-2 flex-1">
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    {isAutoUpdating && <span className="w-2 h-2 bg-green-400 rounded-full flex-shrink-0"></span>}
                    <h2 className="font-semibold text-lg">{chatDisplayName}</h2>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {timeRemaining && <span className="text-xs text-blue-200">{timeRemaining} left</span>}
                    {aiMentionCount > 0 && (
                      <span
                        className="px-1.5 py-0.5 bg-white/15 rounded-full text-[10px] font-medium text-blue-100"
                        title={`"${TRACKED_WORD}" mentioned ${aiMentionCount} time${aiMentionCount === 1 ? '' : 's'} in this chat`}
                      >
                        🤖 {TRACKED_WORD} ×{aiMentionCount}
                      </span>
                    )}
                  </div>
                </div>
                {currentUser?.isAdmin && isLocked && (
                  <button
                    onClick={endTopic}
                    className="px-2 py-1 border border-white hover:bg-white/20 rounded text-xs font-medium text-white transition-colors whitespace-nowrap"
                    title="End this topic"
                  >
                    End Topic
                  </button>
                )}
              </div>
            </>
          )}
          <div className="flex items-center gap-1">
            {onShare && (
              <button
                onClick={handleShareClick}
                className="flex items-center gap-1 px-2 py-1.5 hover:bg-blue-500 rounded-lg transition-colors"
                title="Share this chat"
              >
                <Share2 className="w-5 h-5" />
                <span className="text-sm font-medium">Share</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-blue-500 rounded-lg transition-colors"
              title="Close chat"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {(currentUser?.isAdmin || !isAutoUpdating) && (
          <div className="flex items-center justify-between">
            {currentUser?.isAdmin ? (
              <button
                onClick={() => setShowClearDialog(true)}
                className="px-2 py-1 text-xs font-medium border border-white/30 hover:bg-white/20 rounded transition-colors"
              >
                Clear
              </button>
            ) : <div />}
            {!isAutoUpdating && (
              <div className="flex items-center gap-1">
                <div className="flex items-center gap-1 px-2 py-1 rounded text-xs">
                  <span className="w-2 h-2 bg-yellow-400 rounded-full"></span>
                  <span className="text-yellow-100">Offline</span>
                </div>
                <button
                  onClick={handleManualRefresh}
                  disabled={isRefreshing}
                  className="p-2 hover:bg-blue-500 rounded-lg transition-colors disabled:opacity-50"
                  title="Refresh chat"
                >
                  <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-400 dark:text-slate-500">
            <div className="text-center">
              <p className="mb-2">No messages yet</p>
              <p className="text-sm">Be the first to start the discussion!</p>
            </div>
          </div>
        ) : (
          messages.map(msg => {
            const isOwnMessage = msg.userId === myUserIdRef.current
            const isSystemMessage = msg.username === 'System'

            if (isSystemMessage) {
              const [topicLine, timestampLine] = msg.text.split('\n')
              return (
                <div key={msg.id} className="flex justify-center my-4">
                  <div className="text-center text-xs text-gray-500 dark:text-slate-500 bg-gray-50 dark:bg-slate-900/30 rounded-lg px-3 py-2 max-w-xs">
                    <div className="text-sm font-semibold">{topicLine}</div>
                    {timestampLine && <div className="text-xs text-gray-400 dark:text-slate-600 mt-1">{timestampLine}</div>}
                  </div>
                </div>
              )
            }

            const pollData = parsePoll(msg.text)
            if (pollData) {
              const votes = (msg.reactions as PollVotes)?.votes || {}
              const totalVotes = Object.values(votes).reduce((sum, ids) => sum + (ids?.length || 0), 0)
              return (
                <div key={msg.id} className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} mb-2`}>
                  <div className="max-w-xs w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-2xl p-3">
                    <div className="flex items-center justify-between gap-1.5 mb-2">
                      <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-slate-400">
                        <BarChart3 className="w-3.5 h-3.5" />
                        <span>{msg.username} started a poll</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {onSharePoll && (
                          <button
                            onClick={() => onSharePoll(pollData.question || null)}
                            className="flex items-center gap-1 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                            title="Share poll"
                          >
                            <Share2 className="w-3.5 h-3.5" />
                            <span className="text-xs font-medium">Share</span>
                          </button>
                        )}
                        {isOwnMessage && (
                          <button
                            onClick={() => startEditPoll(msg, pollData)}
                            className="text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                            title="Edit poll"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                    {pollData.question && (
                      <p className="text-sm font-semibold text-gray-900 dark:text-white mb-2">{pollData.question}</p>
                    )}
                    <div className="space-y-1.5">
                      {pollData.options.map((option, idx) => {
                        const optionVotes = votes[idx]?.length || 0
                        const pct = totalVotes > 0 ? Math.round((optionVotes / totalVotes) * 100) : 0
                        const hasVoted = (votes[idx] || []).includes(myUserIdRef.current)
                        return (
                          <button
                            key={idx}
                            onClick={() => toggleVote(msg.id, idx)}
                            className={`relative w-full text-left px-3 py-2 rounded-lg border overflow-hidden transition-colors ${
                              hasVoted
                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                : 'border-gray-200 dark:border-slate-600 hover:bg-gray-100 dark:hover:bg-slate-700'
                            }`}
                          >
                            <div
                              className="absolute inset-y-0 left-0 bg-blue-100 dark:bg-blue-900/30 transition-all"
                              style={{ width: `${pct}%` }}
                            />
                            <div className="relative flex items-center justify-between gap-2 text-sm">
                              <span className="text-gray-900 dark:text-white">{option}</span>
                              <span className="text-xs text-gray-500 dark:text-slate-400 whitespace-nowrap">{pct}% ({optionVotes})</span>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                    <p className="text-xs text-gray-400 dark:text-slate-500 mt-2">{totalVotes} vote{totalVotes === 1 ? '' : 's'}</p>
                  </div>
                </div>
              )
            }

            const reactions = msg.reactions as Reaction[]

            return (
              <div key={msg.id} className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} group mb-2`}>
                <div className={`flex items-end gap-2 max-w-xs ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'}`}>
                  {!isOwnMessage && (
                    <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-slate-600 flex items-center justify-center text-xs font-semibold text-gray-700 dark:text-white flex-shrink-0">
                      {msg.username?.charAt(0).toUpperCase() || '?'}
                    </div>
                  )}
                  <div className="flex flex-col gap-1">
                    <div className={`flex items-end gap-1 ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'}`}>
                      <div
                        className={`rounded-2xl px-4 py-2.5 break-words ${
                          isOwnMessage
                            ? 'bg-blue-600 text-white rounded-br-none'
                            : 'bg-gray-200 dark:bg-slate-600 text-gray-900 dark:text-white rounded-bl-none'
                        }`}
                      >
                        <p className="text-sm">{msg.text}</p>
                      </div>
                      {!isOwnMessage && reactions.length === 0 && (
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                          {(['thumbsup'] as ReactionType[]).map(reactionType => (
                            <button
                              key={reactionType}
                              onClick={() => toggleReaction(msg.id, reactionType)}
                              className="text-lg hover:scale-125 transition-transform cursor-pointer"
                              title={reactionType}
                            >
                              {getReactionEmoji(reactionType)}
                            </button>
                          ))}
                        </div>
                      )}
                      {reactions.length > 0 && (
                        <div className="flex gap-1 items-center flex-wrap mt-2">
                          {reactions.map(reaction => {
                            const hasUserReacted = reaction.userIds.includes(myUserIdRef.current)
                            return (
                              <button
                                key={reaction.type}
                                onClick={() => toggleReaction(msg.id, reaction.type)}
                                className={`px-2 py-1 rounded-full transition-all cursor-pointer flex items-center gap-1 whitespace-nowrap ${
                                  hasUserReacted
                                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                                    : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-600'
                                }`}
                                title={`${hasUserReacted ? 'Remove' : 'Add'} ${reaction.type} reaction`}
                              >
                                <span>{getReactionEmoji(reaction.type)}</span>
                                <span className="text-xs font-medium">{reaction.userIds.length}</span>
                              </button>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                  {isOwnMessage && (
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                      <button
                        onClick={() => deleteMessage(msg.id)}
                        className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                        title="Delete message"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {typingUsers.length > 0 && (
        <div className="px-4 sm:px-6 pb-1 flex items-center gap-1.5 text-xs text-gray-400 dark:text-slate-500 italic">
          <span className="flex gap-0.5">
            <span className="w-1 h-1 rounded-full bg-gray-400 dark:bg-slate-500 animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-1 h-1 rounded-full bg-gray-400 dark:bg-slate-500 animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-1 h-1 rounded-full bg-gray-400 dark:bg-slate-500 animate-bounce" style={{ animationDelay: '300ms' }} />
          </span>
          {typingUsers.length === 1
            ? `${typingUsers[0].username} is typing...`
            : `${typingUsers.length} people are typing...`}
        </div>
      )}

      {/* Input */}
      <div className="border-t border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-4 sm:px-6">
        {showPollComposer ? (
          <div className="relative bg-gray-100 dark:bg-slate-800 rounded-2xl px-3 py-2">
            <button
              onClick={closePollComposer}
              className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center bg-gray-300 dark:bg-slate-600 hover:bg-gray-400 dark:hover:bg-slate-500 rounded-full text-gray-700 dark:text-slate-200 transition-colors"
              title="Cancel poll"
            >
              <X className="w-3.5 h-3.5" />
            </button>
            <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 pr-8 mb-1">{editingPollId ? 'Edit Poll' : 'New Poll'}</p>
            <input
              type="text"
              value={pollQuestion}
              onChange={e => setPollQuestion(e.target.value)}
              placeholder="Question (optional)"
              className="w-full bg-transparent py-2 text-sm font-medium text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none border-b border-gray-200 dark:border-slate-600"
            />
            <div className="divide-y divide-gray-200 dark:divide-slate-600">
              {pollChoices.map((choice, idx) => (
                <input
                  key={idx}
                  type="text"
                  value={choice}
                  onChange={e => updatePollChoice(idx, e.target.value)}
                  onKeyPress={e => {
                    if (e.key === 'Enter') handleSavePoll()
                  }}
                  placeholder={`Choice ${idx + 1}`}
                  autoFocus={idx === 0}
                  className="w-full bg-transparent py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none"
                />
              ))}
            </div>
            <div className="flex justify-end pt-2">
              <button
                onClick={handleSavePoll}
                disabled={pollChoices.filter(c => c.trim()).length < 2}
                className="px-4 py-1.5 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        ) : (
        <div className="flex gap-2">
          <div className="relative">
            <button
              onClick={() => setShowActionsMenu(prev => !prev)}
              className="p-2 sm:p-2.5 rounded-lg border border-gray-200 dark:border-slate-600 text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
              title="More options"
            >
              <Plus className={`w-4 h-4 sm:w-5 sm:h-5 transition-transform ${showActionsMenu ? 'rotate-45' : ''}`} />
            </button>
            {showActionsMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowActionsMenu(false)} />
                <div className="absolute bottom-full left-0 mb-2 w-44 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-xl shadow-lg overflow-hidden z-20">
                  {!isLocked && (
                    <button
                      onClick={() => {
                        setShowActionsMenu(false)
                        setEditNameValue('')
                        setShowDurationPicker(true)
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-gray-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                    >
                      <MessageSquarePlus className="w-4 h-4" />
                      Add Topic
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setShowActionsMenu(false)
                      setShowPollComposer(true)
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-gray-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                  >
                    <BarChart3 className="w-4 h-4" />
                    Create Poll
                  </button>
                </div>
              </>
            )}
          </div>
          <input
            type="text"
            value={input}
            onChange={e => { setInput(e.target.value); notifyTyping() }}
            onKeyPress={e => {
              if (e.key === 'Enter') handleSend()
            }}
            placeholder="Share your thoughts anonymously"
            className="flex-1 px-4 py-2 sm:py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleSend}
            className="bg-blue-600 hover:bg-blue-700 text-white p-2 sm:p-2.5 rounded-lg transition-colors"
          >
            <Send className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
        )}
      </div>

      {/* Clear Chat Dialog */}
      {showClearDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg max-w-sm w-full mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Clear Chat & Reset?</h3>
            <p className="text-sm text-gray-600 dark:text-slate-400 mb-6">
              This will permanently delete all messages and reset all chat names and user assignments. This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowClearDialog(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleClearChatHistory}
                disabled={isClearing}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {isClearing ? 'Clearing...' : 'Clear All'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Duration Picker Modal */}
      {showDurationPicker && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg max-w-sm w-full mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">New Topic</h3>
            <input
              type="text"
              value={editNameValue}
              onChange={(e) => setEditNameValue(e.target.value)}
              placeholder="e.g. Layoff today, Tom's FYI, Tech reorg"
              className="w-full px-3 py-2 rounded-lg bg-gray-100 dark:bg-slate-700 text-gray-900 dark:text-white mb-4 text-sm"
              autoFocus
            />
            <p className="text-xs text-gray-500 dark:text-slate-500 mb-4">Duration</p>
            <div className="grid grid-cols-3 gap-2 mb-6">
              {[2, 4, 6, 12, 24].map(hours => (
                <button
                  key={hours}
                  onClick={() => setSelectedDuration(hours)}
                  className={`py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedDuration === hours
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-600'
                  }`}
                >
                  {hours}h
                </button>
              ))}
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDurationPicker(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmSaveChatName}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
              >
                Start
              </button>
            </div>
          </div>
        </div>
      )}
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white dark:bg-slate-100 text-gray-900 dark:text-slate-900 px-5 py-2.5 rounded-full text-sm font-medium shadow-lg z-[70] max-w-[90vw] text-center pointer-events-none">
          {toast}
        </div>
      )}
    </div>
  )
}
