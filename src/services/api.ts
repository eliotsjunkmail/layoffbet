import type { User, Comment, CompanySuggestion, ModerationItem, ModerationContentType } from '../types'

// Use relative URLs in production (same origin)
// In development, this will fail because frontend is on 5174 and API is on 3000
// But the Vite dev server should proxy API requests to the backend
const API_BASE = ''

export const api = {
  // User endpoints
  register: async (username: string, password: string): Promise<User> => {
    console.log('[API] Registering user:', username)
    try {
      const anonUserId = typeof window !== 'undefined' ? localStorage.getItem('lb-anon-user-id') : null
      const response = await fetch(`${API_BASE}/api/users/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, anonUserId }),
      })
      console.log('[API] Register response status:', response.status)
      if (!response.ok) {
        const error = await response.text()
        console.error('[API] Register error:', error)
        throw new Error('Registration failed')
      }
      const data = await response.json()
      console.log('[API] Register success:', data)
      return data
    } catch (error) {
      console.error('[API] Register exception:', error)
      throw error
    }
  },

  login: async (username: string, password: string): Promise<User> => {
    const response = await fetch(`${API_BASE}/api/users/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })
    if (!response.ok) {
      throw new Error('Login failed')
    }
    return response.json()
  },

  createOrGetAnonymousUser: async (anonUserId?: string): Promise<User> => {
    const response = await fetch(`${API_BASE}/api/users/anonymous`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ anonUserId }),
    })
    if (!response.ok) {
      throw new Error('Failed to create anonymous user')
    }
    return response.json()
  },

  // Comments endpoints
  addComment: async (comment: Comment): Promise<Comment> => {
    const response = await fetch(`${API_BASE}/api/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(comment),
    })
    if (!response.ok) {
      throw new Error('Failed to add comment')
    }
    return response.json()
  },

  editComment: async (id: string, content: string, editedAt: string): Promise<Comment> => {
    const response = await fetch(`${API_BASE}/api/comments/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, editedAt }),
    })
    if (!response.ok) {
      throw new Error('Failed to edit comment')
    }
    return response.json()
  },

  deleteComment: async (id: string): Promise<void> => {
    const response = await fetch(`${API_BASE}/api/comments/${id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
    })
    if (!response.ok) {
      throw new Error('Failed to delete comment')
    }
  },

  upvoteComment: async (id: string, userId: string): Promise<{ comment: Comment; upvoted: boolean; downvoted: boolean }> => {
    const response = await fetch(`${API_BASE}/api/comments/${id}/upvote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    })
    if (!response.ok) {
      throw new Error('Failed to upvote comment')
    }
    return response.json()
  },

  downvoteComment: async (id: string, userId: string): Promise<{ comment: Comment; upvoted: boolean; downvoted: boolean }> => {
    const response = await fetch(`${API_BASE}/api/comments/${id}/downvote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    })
    if (!response.ok) {
      throw new Error('Failed to downvote comment')
    }
    return response.json()
  },

  // Company suggestion endpoints
  suggestCompany: async (name: string, userId?: string): Promise<CompanySuggestion> => {
    const response = await fetch(`${API_BASE}/api/company-suggestions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, userId }),
    })
    if (!response.ok) {
      throw new Error('Failed to suggest company')
    }
    return response.json()
  },

  resolveCompanySuggestion: async (id: string, status: 'accepted' | 'rejected', username: string, password: string): Promise<CompanySuggestion> => {
    const response = await fetch(`${API_BASE}/api/company-suggestions/${id}/resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, username, password }),
    })
    if (!response.ok) {
      throw new Error('Failed to resolve suggestion')
    }
    return response.json()
  },

  // Moderation queue endpoints
  submitForModeration: async (params: {
    contentType: ModerationContentType
    companyId?: string | null
    companyName: string
    userId?: string | null
    reason: string
    payload: Record<string, any>
  }): Promise<ModerationItem> => {
    const response = await fetch(`${API_BASE}/api/moderation-queue`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    })
    if (!response.ok) {
      throw new Error('Failed to submit for moderation')
    }
    return response.json()
  },

  resolveModerationItem: async (id: string, status: 'approved' | 'rejected', username: string, password: string): Promise<ModerationItem> => {
    const response = await fetch(`${API_BASE}/api/moderation-queue/${id}/resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, username, password }),
    })
    if (!response.ok) {
      throw new Error('Failed to resolve moderation item')
    }
    return response.json()
  },

  // Favorites endpoints
  getFavorites: async (userId: string): Promise<string[]> => {
    const response = await fetch(`${API_BASE}/api/favorites/${userId}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    })
    if (!response.ok) {
      throw new Error('Failed to get favorites')
    }
    const data = await response.json()
    return data.favorites || []
  },

  addFavorite: async (userId: string, companyId: string): Promise<void> => {
    const response = await fetch(`${API_BASE}/api/favorites/${userId}/${companyId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    if (!response.ok) {
      throw new Error('Failed to add favorite')
    }
  },

  removeFavorite: async (userId: string, companyId: string): Promise<void> => {
    const response = await fetch(`${API_BASE}/api/favorites/${userId}/${companyId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
    })
    if (!response.ok) {
      throw new Error('Failed to remove favorite')
    }
  },

  // Events endpoints
  createEvent: async (event: any) => {
    const response = await fetch(`${API_BASE}/api/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    })
    if (!response.ok) {
      throw new Error('Failed to create event')
    }
    return response.json()
  },

  // Bets endpoints
  placeBet: async (bet: Omit<any, 'id' | 'createdAt'>) => {
    const response = await fetch(`${API_BASE}/api/bets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bet),
    })
    if (!response.ok) {
      throw new Error('Failed to place bet')
    }
    return response.json()
  },

  updateBet: async (betId: string, data: any) => {
    const response = await fetch(`${API_BASE}/api/bets/${betId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!response.ok) {
      throw new Error('Failed to update bet')
    }
    return response.json()
  },

  removeBet: async (betId: string, eventId?: string, userId?: string) => {
    const params = new URLSearchParams()
    if (eventId) params.append('eventId', eventId)
    if (userId) params.append('userId', userId)
    const query = params.toString() ? `?${params.toString()}` : ''

    const response = await fetch(`${API_BASE}/api/bets/${betId}${query}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
    })
    if (!response.ok) {
      throw new Error('Failed to remove bet')
    }
    return response.json()
  },

  updateUser: async (userId: string, data: any) => {
    const response = await fetch(`${API_BASE}/api/users/${userId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!response.ok) {
      throw new Error('Failed to update user')
    }
    return response.json()
  },

  // Add coin endpoint
  addCoin: async (userId: string) => {
    const response = await fetch(`${API_BASE}/api/users/${userId}/coins`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })
    if (!response.ok) {
      throw new Error('Failed to add coin')
    }
    return response.json()
  },

  recordUserShare: async (userId: string) => {
    const response = await fetch(`${API_BASE}/api/users/${userId}/share`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })
    if (!response.ok) {
      throw new Error('Failed to record share')
    }
    return response.json()
  },

  // Sync endpoint
  sync: async () => {
    const response = await fetch(`${API_BASE}/api/sync`)
    if (!response.ok) {
      throw new Error('Failed to sync')
    }
    return response.json()
  },

  // Chat message endpoints
  getChatMessages: async (companyId: string) => {
    const response = await fetch(`${API_BASE}/api/companies/${companyId}/chat`)
    if (!response.ok) {
      throw new Error('Failed to fetch chat messages')
    }
    return response.json()
  },

  addChatMessage: async (companyId: string, message: any) => {
    const response = await fetch(`${API_BASE}/api/companies/${companyId}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
    })
    if (!response.ok) {
      throw new Error('Failed to add chat message')
    }
    return response.json()
  },

  deleteChatMessage: async (companyId: string, messageId: string) => {
    const response = await fetch(`${API_BASE}/api/companies/${companyId}/chat/${messageId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
    })
    if (!response.ok) {
      throw new Error('Failed to delete chat message')
    }
    return response.json()
  },

  clearChatMessages: async (companyId: string) => {
    const response = await fetch(`${API_BASE}/api/companies/${companyId}/chat`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
    })
    if (!response.ok) {
      throw new Error('Failed to clear chat messages')
    }
    return response.json()
  },


  updateChatMessageReactions: async (companyId: string, messageId: string, reactions: any) => {
    const response = await fetch(`${API_BASE}/api/companies/${companyId}/chat/${messageId}/reactions`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reactions }),
    })
    if (!response.ok) {
      throw new Error('Failed to update chat message reactions')
    }
    return response.json()
  },

  updateChatMessageText: async (companyId: string, messageId: string, text: string) => {
    const response = await fetch(`${API_BASE}/api/companies/${companyId}/chat/${messageId}/text`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    })
    if (!response.ok) {
      throw new Error('Failed to update chat message text')
    }
    return response.json()
  },

  setTyping: async (companyId: string, userId: string, username: string) => {
    const response = await fetch(`${API_BASE}/api/companies/${companyId}/chat/typing`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, username }),
    })
    if (!response.ok) {
      throw new Error('Failed to send typing status')
    }
    return response.json()
  },

  getTypingUsers: async (companyId: string, userId: string) => {
    const response = await fetch(`${API_BASE}/api/companies/${companyId}/chat/typing?userId=${encodeURIComponent(userId)}`)
    if (!response.ok) {
      throw new Error('Failed to fetch typing users')
    }
    return response.json()
  },

  // Chat user names endpoints
  getOrAssignChatName: async (companyId: string, userId: string) => {
    const response = await fetch(`${API_BASE}/api/companies/${companyId}/chat-names/${userId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })
    if (!response.ok) {
      throw new Error('Failed to get or assign chat name')
    }
    return response.json()
  },

  // Companies endpoints
  toggleHiddenCompany: async (companyId: string) => {
    const response = await fetch(`${API_BASE}/api/companies/${companyId}/toggle-hidden`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })
    if (!response.ok) {
      throw new Error('Failed to toggle company visibility')
    }
    return response.json()
  },

  // Chat settings endpoints
  getChatSettings: async (companyId: string, companyName: string) => {
    const response = await fetch(`${API_BASE}/api/companies/${companyId}/chat-settings?companyName=${encodeURIComponent(companyName)}`)
    if (!response.ok) {
      throw new Error('Failed to get chat settings')
    }
    return response.json()
  },

  updateChatSettings: async (companyId: string, settings: any) => {
    const response = await fetch(`${API_BASE}/api/companies/${companyId}/chat-settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    })
    if (!response.ok) {
      throw new Error('Failed to update chat settings')
    }
    return response.json()
  },
}
