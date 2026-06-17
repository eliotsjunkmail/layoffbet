import { useState, useRef, useEffect } from 'react'
import { X, Send, ThumbsUp, ThumbsDown, Laugh, Frown, Trash2 } from 'lucide-react'
import { useStore } from '../store/useStore'

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
  content: string
  createdAt: Date
  reactions: Reaction[]
}

export const CompanyChat = ({ companyId, companyName, isOpen, onClose }: { companyId: string; companyName: string; isOpen: boolean; onClose: () => void }) => {
  const currentUser = useStore(s => s.currentUser)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSend = () => {
    if (!input.trim() || !currentUser) return

    const newMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      companyId,
      userId: currentUser.id,
      username: currentUser.username || 'Anonymous',
      content: input.trim(),
      createdAt: new Date(),
      reactions: [],
    }

    setMessages(prev => [...prev, newMessage])
    setInput('')
  }

  const toggleReaction = (messageId: string, reactionType: ReactionType) => {
    if (!currentUser) return

    setMessages(prev =>
      prev.map(msg => {
        if (msg.id === messageId) {
          const reactions = [...msg.reactions]
          const reactionIndex = reactions.findIndex(r => r.type === reactionType)

          if (reactionIndex >= 0) {
            const reaction = reactions[reactionIndex]
            if (reaction.userIds.includes(currentUser.id)) {
              reaction.userIds = reaction.userIds.filter(id => id !== currentUser.id)
              if (reaction.userIds.length === 0) {
                reactions.splice(reactionIndex, 1)
              }
            } else {
              reaction.userIds.push(currentUser.id)
            }
          } else {
            reactions.push({ type: reactionType, userIds: [currentUser.id] })
          }

          return { ...msg, reactions }
        }
        return msg
      })
    )
  }

  const deleteMessage = (messageId: string) => {
    if (!currentUser) return
    const message = messages.find(m => m.id === messageId)
    if (!message || message.userId !== currentUser.id) return
    setMessages(prev => prev.filter(m => m.id !== messageId))
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
      <div className="bg-blue-600 text-white px-4 py-4 sm:px-6 sm:py-5 flex items-center justify-between border-b border-blue-700">
        <div>
          <h2 className="font-semibold text-lg">{companyName} Discussion</h2>
          <p className="text-xs text-blue-100">Community chat about this company</p>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-blue-500 rounded-lg transition-colors"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-400 dark:text-slate-500">
            <div className="text-center">
              <p className="mb-2">No messages yet</p>
              <p className="text-sm">Be the first to start the discussion!</p>
            </div>
          </div>
        ) : (
          messages.map(msg => (
            <div key={msg.id} className="flex flex-col group">
              <div className="flex items-start gap-3">
                <div className="flex-1 bg-gray-50 dark:bg-slate-800 rounded-lg p-3 sm:p-4">
                  <div className="flex items-center justify-end mb-1">
                    <span className="text-xs text-gray-400 dark:text-slate-500">
                      {msg.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 dark:text-slate-300">{msg.content}</p>

                  {/* Reactions */}
                  {msg.reactions.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {msg.reactions.map(reaction => (
                        <button
                          key={reaction.type}
                          onClick={() => toggleReaction(msg.id, reaction.type)}
                          className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
                            currentUser && reaction.userIds.includes(currentUser.id)
                              ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300'
                              : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-600'
                          }`}
                        >
                          <span>{getReactionEmoji(reaction.type)}</span>
                          {reaction.userIds.length > 0 && <span>{reaction.userIds.length}</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Reaction buttons and delete on hover */}
              <div className="flex items-center gap-1 mt-2 ml-3 opacity-0 group-hover:opacity-100 transition-opacity">
                {(['thumbsup', 'thumbsdown', 'laugh', 'cry'] as ReactionType[]).map(reactionType => (
                  <button
                    key={reactionType}
                    onClick={() => toggleReaction(msg.id, reactionType)}
                    className="p-1.5 rounded text-sm transition-colors bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-600"
                    title={reactionType}
                  >
                    {getReactionEmoji(reactionType)}
                  </button>
                ))}
                {currentUser && msg.userId === currentUser.id && (
                  <button
                    onClick={() => deleteMessage(msg.id)}
                    className="p-1.5 rounded text-sm transition-colors bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-400 hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-600 dark:hover:text-red-400"
                    title="Delete message"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-4 sm:px-6">
        {currentUser ? (
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
        ) : (
          <div className="text-center py-4">
            <p className="text-sm text-gray-500 dark:text-slate-400">Sign in to participate in the discussion</p>
          </div>
        )}
      </div>
    </div>
  )
}
