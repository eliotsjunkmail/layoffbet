import type { User, Comment } from '../types'

const API_BASE = ''

export const api = {
  // User endpoints
  register: async (username: string, password: string): Promise<User> => {
    const response = await fetch(`${API_BASE}/api/users/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })
    if (!response.ok) {
      throw new Error('Registration failed')
    }
    return response.json()
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

  // Sync endpoint
  sync: async () => {
    const response = await fetch(`${API_BASE}/api/sync`)
    if (!response.ok) {
      throw new Error('Failed to sync')
    }
    return response.json()
  },
}
