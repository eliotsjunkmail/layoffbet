export interface User {
  id: string
  username?: string | null
  password?: string | null
  coins: number
  isAdmin: boolean
  isAnonymous?: boolean
  createdAt: string
  lastCoinsDate: string
  anonymousNumber?: number
  displayName?: string
  shareCount?: number
}

export interface Company {
  id: string
  name: string
  slug: string
  description: string
  industry: string
  viewCount: number
  createdAt: string
  color?: string
  aliases?: string[]
}

export type EventStatus = 'active' | 'expired' | 'resolved' | 'archived'

export interface Event {
  id: string
  companyId: string
  companyName: string
  title: string
  description: string
  expiresAt: string
  status: EventStatus
  creatorId: string
  creatorName: string
  yesPool: number
  noPool: number
  outcome: 'yes' | 'no' | null
  createdAt: string
  viewCount: number
  shareCount: number
  isWarnActNotice?: boolean
}

export interface Bet {
  id: string
  eventId: string
  userId: string
  side: 'yes' | 'no'
  amount: number
  createdAt: string
}

export interface Comment {
  id: string
  eventId?: string
  companyId?: string
  userId: string
  content: string
  createdAt: string
  editedAt?: string
  upvotes?: number
  displayName?: string
}

export type Theme = 'light' | 'dark'

export interface FeedbackItem {
  id: string
  text: string
  type: 'bug' | 'feature' | 'other'
  createdAt: string
  status: 'active' | 'completed' | 'ignored'
}

export interface CompanySuggestion {
  id: string
  name: string
  suggestedBy?: string | null
  status: 'pending' | 'accepted' | 'rejected'
  createdAt: string
}

export type ModerationContentType = 'comment' | 'chat_message' | 'event'

export interface ModerationItem {
  id: string
  contentType: ModerationContentType
  companyId?: string | null
  companyName: string
  userId?: string | null
  reason: string
  payload: Record<string, any>
  status: 'pending' | 'approved' | 'rejected'
  createdAt: string
}
