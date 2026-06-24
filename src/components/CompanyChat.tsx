import { useState, useRef, useEffect, useMemo } from 'react'
import { ChevronDown, Send, ThumbsUp, ThumbsDown, Laugh, Frown, Trash2, RefreshCw, CheckCircle, Trash, Edit2 } from 'lucide-react'
import { useStore } from '../store/useStore'
import { api } from '../services/api'

type ReactionType = 'thumbsup' | 'thumbsdown' | 'laugh' | 'cry'

interface Reaction {
  type: ReactionType
  userIds: string[]
}

interface ChatMessage {
  id: string
  companyId: string
  userId: string
  username: string
  text: string
  createdAt: Date
  reactions: Reaction[]
}

export const CompanyChat = ({ companyId, companyName, isOpen, onClose }: { companyId: string; companyName: string; isOpen: boolean; onClose: () => void }) => {
  const currentUser = useStore(s => s.currentUser)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [chatDisplayName, setChatDisplayName] = useState(companyName + ' Chat')
  const [editingName, setEditingName] = useState(false)
  const [editNameValue, setEditNameValue] = useState(companyName + ' Chat')
  const [isLocked, setIsLocked] = useState(false)
  const [expiresAt, setExpiresAt] = useState<string | null>(null)
  const [showDurationPicker, setShowDurationPicker] = useState(false)
  const [showLockedMessage, setShowLockedMessage] = useState(false)
  const [selectedDuration, setSelectedDuration] = useState(2)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isAutoUpdating, setIsAutoUpdating] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [showClearDialog, setShowClearDialog] = useState(false)
  const [isClearing, setIsClearing] = useState(false)
  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const myUserIdRef = useRef<string>(currentUser?.id || `anon-${Date.now()}`)
  const pendingReactionsRef = useRef<Set<string>>(new Set())

  const chatUserCount = useMemo(() => {
    const uniqueUserIds = new Set(messages.map(m => m.userId))
    return uniqueUserIds.size
  }, [messages])

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
      const systemMessage: ChatMessage = {
        id: `system-${Date.now()}`,
        companyId,
        userId: 'system',
        username: 'System',
        text: `📌 New Topic: "${editNameValue.trim()}" (${durationHours}h)`,
        createdAt: new Date(),
        reactions: []
      }
      setMessages(prev => [...prev, systemMessage])

      // Save system message to server
      try {
        await api.addChatMessage(companyId, {
          text: systemMessage.text,
          username: 'System',
        })
      } catch (error) {
        console.error('Failed to save system message:', error)
      }
    } catch (error) {
      console.error('Failed to update chat name:', error)
    }
  }

  const resetChatName = async () => {
    if (!currentUser?.isAdmin) return
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
    } catch (error) {
      console.error('Failed to reset chat name:', error)
    }
  }

  const startPolling = () => {
    if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current)

    pollingIntervalRef.current = setInterval(() => {
      loadMessages()
    }, 3000) // Poll every 3 seconds
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
          const localSystemMessages = prevMessages.filter(m => m.userId === 'system')

          const mergedMessages = messagesWithDates.map((loaded: ChatMessage) => {
            const existing = prevMessages.find(p => p.id === loaded.id)
            if (!existing) return loaded

            // Always preserve existing reactions and merge with server data
            // This prevents reactions from disappearing during polling
            const mergedReactions = [...(loaded.reactions || [])]

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

          // Add back system messages that are from this session but not on server yet
          const systemMessagesOnServer = new Set(messagesWithDates.map(m => m.id))
          localSystemMessages.forEach(sysMsg => {
            if (!systemMessagesOnServer.has(sysMsg.id)) {
              mergedMessages.push(sysMsg)
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

    try {
      // Get or assign anonymous chat name
      const nameResponse = await api.getOrAssignChatName(companyId, userId)
      const chatName = nameResponse.chatName

      const messageData = {
        userId,
        username: chatName,
        text: input.trim(),
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
        const reactions = [...msg.reactions]
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

  const getTimeRemaining = () => {
    if (!expiresAt) return ''
    const now = new Date().getTime()
    const expires = new Date(expiresAt).getTime()
    const diff = expires - now
    if (diff <= 0) return 'now'
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    if (hours > 0) return `${hours}h ${minutes}m`
    return `${minutes}m`
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

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-white dark:bg-slate-900 flex flex-col">
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
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-lg">{chatDisplayName}</h2>
              <button
                onClick={() => isLocked ? setShowLockedMessage(true) : setEditingName(true)}
                className="p-1 hover:bg-blue-500 rounded transition-colors"
                title="Start a new topic"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              {currentUser?.isAdmin && isLocked && (
                <button
                  onClick={resetChatName}
                  className="p-1 hover:bg-blue-500 rounded transition-colors"
                  title="Reset to default"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
          <button
            onClick={onClose}
            className="p-2 hover:bg-blue-500 rounded-lg transition-colors"
            title="Minimize chat"
          >
            <ChevronDown className="w-6 h-6" />
          </button>
        </div>

        {/* Second row: Subtext on left, status and user count on right */}
        <div className="flex items-center justify-between">
          <p className="text-xs text-blue-100">Live blog meetings</p>
          <div className="flex items-center gap-2">
            {currentUser?.isAdmin && (
              <button
                onClick={() => setShowClearDialog(true)}
                className="p-2 hover:bg-blue-500 rounded-lg transition-colors"
                title="Clear all chat history"
              >
                <Trash className="w-5 h-5" />
              </button>
            )}
            <div className="flex items-center gap-3">
            {chatUserCount > 0 && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-100">
                <span className="w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs">
                  {chatUserCount > 99 ? '99+' : chatUserCount}
                </span>
                <span>{chatUserCount === 1 ? 'participant' : 'participants'}</span>
              </span>
            )}
            {isAutoUpdating ? (
              <div className="flex items-center gap-1 px-2 py-1 rounded text-xs">
                <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                <span className="text-green-100">Connected</span>
              </div>
            ) : (
              <>
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
              </>
            )}
            </div>
          </div>
        </div>
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
            const isSystemMessage = msg.userId === 'system'

            if (isSystemMessage) {
              return (
                <div key={msg.id} className="flex justify-center mb-3">
                  <div className="text-center text-xs text-gray-500 dark:text-slate-500 bg-gray-50 dark:bg-slate-900/30 rounded-full px-3 py-1 max-w-xs">
                    {msg.text}
                  </div>
                </div>
              )
            }

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
                      {!isOwnMessage && msg.reactions.length === 0 && (
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
                      {msg.reactions.length > 0 && (
                        <div className="flex gap-1 items-center flex-wrap mt-2">
                          {msg.reactions.map(reaction => {
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

      {/* Input */}
      <div className="border-t border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-4 sm:px-6">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyPress={e => {
              if (e.key === 'Enter') handleSend()
            }}
            placeholder="Share your thoughts..."
            className="flex-1 px-4 py-2 sm:py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleSend}
            className="bg-blue-600 hover:bg-blue-700 text-white p-2 sm:p-2.5 rounded-lg transition-colors"
          >
            <Send className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
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
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">New Topic</h3>
            <p className="text-sm text-gray-600 dark:text-slate-400 mb-4">"{editNameValue.trim()}"</p>
            <p className="text-xs text-gray-500 dark:text-slate-500 mb-4">How long should this topic stay active?</p>
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

      {/* Locked Message Modal */}
      {showLockedMessage && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg max-w-sm w-full mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Chat name is temporarily locked</h3>
            <p className="text-sm text-gray-600 dark:text-slate-400 mb-4">
              You can edit the chat name again in <span className="font-semibold">{getTimeRemaining()}</span>
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowLockedMessage(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
