import type { User, Comment } from '../types'

// Use relative URLs in production (same origin)
// In development, this will fail because frontend is on 5174 and API is on 3000
// But the Vite dev server should proxy API requests to the backend
const API_BASE = ''

export const api = {
  // User endpoints
  register: async (username: string, password: string): Promise<User> => {
    console.log('[API] Registering user:', username)
    try {
      const response = await fetch(`${API_BASE}/api/users/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
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

  upvoteComment: async (id: string): Promise<Comment> => {
    const response = await fetch(`${API_BASE}/api/comments/${id}/upvote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })
    if (!response.ok) {
      throw new Error('Failed to upvote comment')
    }
    return response.json()
  },

  // Favorites endpoints
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

  removeBet: async (betId: string) => {
    const response = await fetch(`${API_BASE}/api/bets/${betId}`, {
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

  // Sync endpoint
  sync: async () => {
    const response = await fetch(`${API_BASE}/api/sync`)
    if (!response.ok) {
      throw new Error('Failed to sync')
    }
    return response.json()
  },
}
