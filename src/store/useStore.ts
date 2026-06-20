import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User, Company, Event, Bet, Comment, Theme, FeedbackItem } from '../types'
import { uid, isExpired, validateNoPersonalNames } from '../utils/odds'
import { api } from '../services/api'

const DAILY_COINS = 100
const today = () => new Date().toISOString().split('T')[0]
const futureDate = (days: number) => new Date(Date.now() + days * 86400000).toISOString()
const pastDate = (days: number) => new Date(Date.now() - days * 86400000).toISOString()

const SEED_COMPANIES: Company[] = []

const ADMIN_USER: User = {
  id: 'user-admin',
  username: 'admin',
  password: 'admin',
  coins: 100,
  isAdmin: true,
  createdAt: pastDate(60),
  lastCoinsDate: today(),
}

const SEED_USERS: User[] = [ADMIN_USER]


const SEED_EVENTS: Event[] = []

const SEED_COMMENTS: Comment[] = []

interface StoreState {
  currentUser: User | null
  guestCoins: number
  users: User[]
  companies: Company[]
  events: Event[]
  bets: Bet[]
  comments: Comment[]
  chatMessages: any[]
  theme: Theme
  onboardingCompanyId: string | null
  favoriteCompanyIds: string[]
  hiddenCompanyIds: string[]
  pinnedEventIds: string[]
  feedback: FeedbackItem[]
  anonVotedEvents: Record<string, { lastSide: 'yes' | 'no'; count: number }>
  companyLastVisit: Record<string, string>
  markCompanyVisited: (companyId: string) => void

  login: (username: string, password: string) => boolean
  logout: () => void
  updateDisplayName: (displayName: string) => Promise<void>
  initializeAnonymousUser: () => Promise<void>
  migrateGuestBets: () => void
  register: (username: string, password: string) => { ok: boolean; error?: string }
  checkDailyCoins: () => void
  updateCoins: (amount: number) => void
  addCoin: () => Promise<void>
  setTheme: (theme: Theme) => void
  setOnboardingCompany: (companyId: string) => void
  toggleFavoriteCompany: (companyId: string) => void
  toggleHiddenCompany: (companyId: string) => Promise<void>
  togglePinnedEvent: (eventId: string) => void
  addFeedback: (text: string, type: string) => void
  markFeedback: (id: string, status: 'completed' | 'ignored') => void
  clearAllFeedback: () => void
  deleteFeedback: (id: string) => void

  placeAnonymousVote: (eventId: string, side: 'yes' | 'no', amount?: number) => boolean
  placeBet: (eventId: string, side: 'yes' | 'no', amount: number) => boolean
  removeBet: (eventId: string) => void
  removeAnonymousVote: (eventId: string) => void
  getUserBet: (eventId: string) => Bet | undefined
  createEvent: (data: Omit<Event, 'id' | 'creatorId' | 'creatorName' | 'yesPool' | 'noPool' | 'outcome' | 'createdAt' | 'status' | 'viewCount' | 'shareCount'> & { initialSide?: 'yes' | 'no' }) => Promise<Event | false>
  updateEvent: (eventId: string, data: { title: string; description: string; expiresAt: string; companyId: string; companyName: string }) => Promise<void>
  resolveEvent: (eventId: string, outcome: 'yes' | 'no') => void
  archiveEvent: (eventId: string) => void
  deleteEvent: (eventId: string) => Promise<void>

  addCompany: (name: string, description: string, industry: string) => void
  updateCompany: (id: string, name: string, description: string, industry: string) => void
  deleteCompany: (id: string) => void

  addComment: (eventId: string, content: string) => { ok: boolean; error?: string }
  editComment: (id: string, content: string) => { ok: boolean; error?: string }
  deleteComment: (id: string) => boolean
  upvoteComment: (commentId: string) => void
  recordShare: (eventId: string) => void
  upvotedCommentIds: string[]

  getEffectiveStatus: (event: Event) => Event['status']
  banUser: (userId: string) => void
  restoreSession: () => void
  syncCommentsFromServer: () => Promise<void>
}

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      currentUser: null,
      guestCoins: 50,
      users: SEED_USERS,
      companies: SEED_COMPANIES,
      events: SEED_EVENTS,
      bets: [],
      comments: SEED_COMMENTS,
      chatMessages: [],
      theme: 'light',
      onboardingCompanyId: null,
      favoriteCompanyIds: [],
      hiddenCompanyIds: [],
      pinnedEventIds: [],
      feedback: [],
      anonVotedEvents: {},
      companyLastVisit: {},
      upvotedCommentIds: [],

      setTheme: (theme) => set({ theme }),
      setOnboardingCompany: (companyId) => set({ onboardingCompanyId: companyId }),
      toggleFavoriteCompany: (companyId) => {
        const currentState = get()
        const isCurrentlyFavorite = currentState.favoriteCompanyIds.includes(companyId)
        const updated = isCurrentlyFavorite
          ? currentState.favoriteCompanyIds.filter(id => id !== companyId)
          : [...currentState.favoriteCompanyIds, companyId]

        console.log(`[toggleFavoriteCompany] ${companyId}: ${isCurrentlyFavorite ? 'removing' : 'adding'}, new favs:`, updated)

        const userId = currentState.currentUser?.id || 'guest'
        if (isCurrentlyFavorite) {
          api.removeFavorite(userId, companyId).catch(err => console.error('Failed to sync favorite:', err))
        } else {
          api.addFavorite(userId, companyId).catch(err => console.error('Failed to sync favorite:', err))
        }

        // Update store state first
        set({ favoriteCompanyIds: updated })

        // For anonymous users, persist to both localStorage and cookie AFTER store update
        if (!currentState.currentUser && typeof window !== 'undefined') {
          // Store in the persist middleware key so it's properly saved
          const fullState = get()
          const stateToSave = {
            users: fullState.users,
            companies: fullState.companies,
            events: fullState.events,
            bets: fullState.bets,
            comments: fullState.comments,
            currentUser: fullState.currentUser,
            theme: fullState.theme,
            onboardingCompanyId: fullState.onboardingCompanyId,
            favoriteCompanyIds: updated,
            pinnedEventIds: fullState.pinnedEventIds,
            feedback: fullState.feedback,
            anonVotedEvents: fullState.anonVotedEvents,
            companyLastVisit: fullState.companyLastVisit,
            upvotedCommentIds: fullState.upvotedCommentIds,
          }
          localStorage.setItem('layoff-bets-store-v6', JSON.stringify(stateToSave))

          // Also backup to lb-anon-favorites for cookie
          localStorage.setItem('lb-anon-favorites', JSON.stringify(updated))

          // Store in cookie with 30 day expiration
          const expiryDate = new Date()
          expiryDate.setDate(expiryDate.getDate() + 30)
          document.cookie = `lb-anon-favorites=${JSON.stringify(updated)}; expires=${expiryDate.toUTCString()}; path=/`

          console.log('[toggleFavoriteCompany] persisted to localStorage and cookie')
        }
      },

      toggleHiddenCompany: async (companyId) => {
        try {
          await api.toggleHiddenCompany(companyId)
          set(s => ({
            hiddenCompanyIds: s.hiddenCompanyIds.includes(companyId)
              ? s.hiddenCompanyIds.filter(id => id !== companyId)
              : [...s.hiddenCompanyIds, companyId],
          }))
        } catch (err) {
          console.error('Failed to toggle hidden company:', err)
          throw err
        }
      },

      togglePinnedEvent: (eventId) => set(s => ({
        pinnedEventIds: s.pinnedEventIds.includes(eventId)
          ? s.pinnedEventIds.filter(id => id !== eventId)
          : [...s.pinnedEventIds, eventId],
      })),

      markCompanyVisited: (companyId) => set(s => ({
        companyLastVisit: { ...s.companyLastVisit, [companyId]: new Date().toISOString() },
      })),

      placeAnonymousVote: (eventId, side, amount = 10) => {
        const { events, anonVotedEvents, getEffectiveStatus } = get()
        const existing = anonVotedEvents[eventId]
        const event = events.find(e => e.id === eventId)
        if (!event || getEffectiveStatus(event) !== 'active') return false
        set(s => ({
          anonVotedEvents: {
            ...s.anonVotedEvents,
            [eventId]: { lastSide: side, count: (existing?.count ?? 0) + 1 },
          },
          events: s.events.map(e => e.id === eventId ? {
            ...e,
            yesPool: side === 'yes' ? e.yesPool + amount : e.yesPool,
            noPool:  side === 'no'  ? e.noPool  + amount : e.noPool,
          } : e),
        }))
        return true
      },

      removeAnonymousVote: (eventId) => {
        const { anonVotedEvents, events, guestCoins, getEffectiveStatus } = get()
        const vote = anonVotedEvents[eventId]
        if (!vote) return
        const event = events.find(e => e.id === eventId)
        if (!event || getEffectiveStatus(event) !== 'active') return
        const amount = vote.count * 10
        const newVotes = { ...anonVotedEvents }
        delete newVotes[eventId]
        set(s => ({
          guestCoins: guestCoins + amount,
          anonVotedEvents: newVotes,
          events: s.events.map(e => e.id === eventId ? {
            ...e,
            yesPool: vote.lastSide === 'yes' ? Math.max(0, e.yesPool - amount) : e.yesPool,
            noPool:  vote.lastSide === 'no'  ? Math.max(0, e.noPool  - amount) : e.noPool,
          } : e),
        }))
      },

      addFeedback: (text, type) => set(s => ({
        feedback: [...s.feedback, { id: `fb-${uid()}`, text: text.trim(), type: type as FeedbackItem['type'], createdAt: new Date().toISOString(), status: 'active' }]
      })),

      markFeedback: (id, status) => set(s => ({
        feedback: s.feedback.map(f => f.id === id ? { ...f, status } : f),
      })),

      clearAllFeedback: () => set({ feedback: [] }),

      deleteFeedback: (id) => set(s => ({ feedback: s.feedback.filter(f => f.id !== id) })),

      login: (username, password) => {
        const user = get().users.find(
          u => u.username && u.password && u.username.toLowerCase() === username.toLowerCase() && u.password === password
        )
        if (!user) return false
        set({ currentUser: user })
        // Persist user to localStorage for session persistence
        if (typeof window !== 'undefined') {
          localStorage.setItem('layoff-bets-currentUser', JSON.stringify(user))
        }
        // Load user's favorites from server
        api.getFavorites(user.id)
          .then(favorites => {
            console.log('[login] Loaded favorites from server:', favorites)
            set({ favoriteCompanyIds: favorites })
          })
          .catch(err => console.error('[login] Failed to load favorites:', err))
        get().checkDailyCoins()
        get().migrateGuestBets()
        return true
      },

      logout: () => {
        localStorage.removeItem('anonCoins')
        localStorage.removeItem('anonCoinsSpent')
        localStorage.removeItem('layoff-bets-currentUser')
        set({ currentUser: null, guestCoins: 50, favoriteCompanyIds: [] })
      },

      updateDisplayName: async (displayName: string) => {
        const { currentUser } = get()
        if (!currentUser) return

        try {
          const updatedUser = await api.updateUser(currentUser.id, { displayName })
          set(s => ({
            currentUser: { ...s.currentUser!, displayName: updatedUser.displayName },
            users: s.users.map(u => u.id === updatedUser.id ? updatedUser : u),
            comments: s.comments.map(c => c.userId === currentUser.id ? { ...c, displayName: updatedUser.displayName } : c),
          }))
          localStorage.setItem('layoff-bets-currentUser', JSON.stringify({ ...currentUser, displayName }))
        } catch (error) {
          console.error('Failed to update display name:', error)
          throw error
        }
      },

      initializeAnonymousUser: async () => {
        try {
          // Try to get existing anonymous user ID from localStorage
          const storedAnonUserId = localStorage.getItem('layoff-bets-anonUserId') || undefined

          // Create or retrieve anonymous user from server
          const anonUser = await api.createOrGetAnonymousUser(storedAnonUserId)

          // Store the anonymous user ID locally
          localStorage.setItem('layoff-bets-anonUserId', anonUser.id)

          // Update store with anonymous user
          set(s => ({
            users: [...s.users.filter(u => u.id !== anonUser.id), anonUser],
            guestCoins: anonUser.coins || 50,
          }))
        } catch (error) {
          console.error('Failed to initialize anonymous user:', error)
        }
      },

      migrateGuestBets: () => {
        const { currentUser, anonVotedEvents, bets, events } = get()
        if (!currentUser) return

        const anonCoins = parseInt(localStorage.getItem('anonCoins') || '50')
        const anonCoinsSpent = parseInt(localStorage.getItem('anonCoinsSpent') || '0')
        const remainingCoins = Math.max(0, anonCoins - anonCoinsSpent)
        const newBets: Bet[] = []

        Object.entries(anonVotedEvents).forEach(([eventId, vote]) => {
          const event = events.find(e => e.id === eventId)
          if (event) {
            const amount = vote.count * 10
            const bet: Bet = {
              id: `bet-${uid()}`,
              eventId,
              userId: currentUser.id,
              side: vote.lastSide,
              amount,
              createdAt: new Date().toISOString(),
            }
            newBets.push(bet)
          }
        })

        set(s => ({
          currentUser: {
            ...currentUser,
            coins: Math.min(currentUser.coins + remainingCoins, 999),
          },
          bets: [...bets, ...newBets],
          anonVotedEvents: {},
        }))
        localStorage.removeItem('anonCoinsSpent')
        localStorage.removeItem('anonCoins')
      },

      register: (username, password) => {
        if (!username || !password) return { ok: false, error: 'Username and password are required.' }

        // Check locally first for immediate feedback on duplicate
        const localExists = get().users.some(u => u.username && u.username.toLowerCase() === username.toLowerCase())
        if (localExists) return { ok: false, error: 'Username already taken.' }

        // Register on server first (synchronous from user perspective, but validation is server-side)
        console.log('[Store] Registering user on server:', username)
        api.register(username, password)
          .then((serverUser) => {
            console.log('[Store] Registration successful on server:', serverUser)

            // Migrate anonymous user data to new account
            const anonUserId = typeof window !== 'undefined' ? localStorage.getItem('lb-anon-user-id') : null
            const { users, bets, favoriteCompanyIds } = get()
            const anonUser = anonUserId ? users.find(u => u.id === anonUserId) : null

            let updatedUser = { ...serverUser }
            let migratedBets = [...bets]
            let migratedFavorites = [...favoriteCompanyIds]

            if (anonUser) {
              console.log('[Store] Migrating data from anonymous user:', anonUserId)

              // Migrate bets: reassign all anon user bets to new user
              migratedBets = bets.map(b =>
                b.userId === anonUser.id
                  ? { ...b, userId: serverUser.id }
                  : b
              )

              // Add 100 coin bonus + any remaining anon coins
              const bonusCoins = 100 + (anonUser.coins || 0)
              updatedUser = {
                ...serverUser,
                coins: Math.min(serverUser.coins + bonusCoins, 999)
              }

              // Favorites are already owned by user, no migration needed
              // (they're stored separately from user account)
            } else {
              // No anonymous user to migrate, just add 100 coin bonus
              updatedUser = {
                ...serverUser,
                coins: Math.min(serverUser.coins + 100, 999)
              }
            }

            // Update store with migrated data
            set(s => ({
              users: [...s.users.filter(u => u.id !== serverUser.id), updatedUser],
              currentUser: updatedUser,
              bets: migratedBets,
              favoriteCompanyIds: migratedFavorites
            }))

            // Persist to localStorage
            if (typeof window !== 'undefined') {
              localStorage.setItem('layoff-bets-currentUser', JSON.stringify(updatedUser))
            }

            // Migrate old guest bets if they exist
            get().migrateGuestBets()
          })
          .catch(err => {
            console.error('[Store] Registration failed on server:', err)
            // Don't add to local store if server registration fails
            set({ currentUser: null })
            if (typeof window !== 'undefined') {
              localStorage.removeItem('layoff-bets-currentUser')
            }
          })

        return { ok: true }
      },

      checkDailyCoins: () => {
        const { currentUser, users } = get()
        if (!currentUser) return
        const t = today()
        if (currentUser.lastCoinsDate === t) return
        const updated = { ...currentUser, coins: Math.min(currentUser.coins + DAILY_COINS, 999), lastCoinsDate: t }
        set(s => ({
          currentUser: updated,
          users: s.users.map(u => u.id === updated.id ? updated : u),
        }))
      },

      updateCoins: (amount) => {
        const { currentUser } = get()
        if (!currentUser) return
        const updated = { ...currentUser, coins: Math.min(currentUser.coins + amount, 999) }
        set(s => ({
          currentUser: updated,
          users: s.users.map(u => u.id === updated.id ? updated : u),
        }))
      },

      addCoin: async () => {
        const { currentUser } = get()
        if (!currentUser) return
        try {
          const updated = await api.addCoin(currentUser.id)
          set(s => ({
            currentUser: updated,
            users: s.users.map(u => u.id === updated.id ? updated : u),
          }))
        } catch (error) {
          console.error('Failed to add coin:', error)
        }
      },

      placeBet: (eventId, side, amount) => {
        const { currentUser, guestCoins, events, bets, users } = get()
        const isGuest = !currentUser
        // Use anonymous user from server if available, fallback to 'user-guest'
        const anonUserId = typeof window !== 'undefined' ? localStorage.getItem('lb-anon-user-id') : null
        const anonUser = anonUserId ? users.find(u => u.id === anonUserId) : users.find(u => u.isAnonymous)
        const userId = currentUser?.id ?? anonUser?.id ?? 'user-guest'
        const userCoins = currentUser?.coins ?? anonUser?.coins ?? guestCoins

        const event = events.find(e => e.id === eventId)
        if (!event) return false
        if (get().getEffectiveStatus(event) !== 'active') return false

        const existing = bets.find(b => b.eventId === eventId && b.userId === userId)

        // ── No prior bet: simple new position ──────────────────────────────
        if (!existing) {
          if (!isGuest && amount > 100) return false
          if (userCoins < amount) return false

          const newCoins = isGuest && !anonUser ? guestCoins - amount : (currentUser?.coins ?? anonUser?.coins ?? guestCoins) - amount
          const tempBetId = `pending-${uid()}`

          // For both logged-in and guest users, create local bet immediately
          const bet: Bet = { id: tempBetId, eventId, userId, side, amount, createdAt: new Date().toISOString() }
          set((s): any => {
            let stateUpdate: any = {
              bets: [...s.bets, bet],
              events: s.events.map(e => e.id === eventId ? { ...e, yesPool: side === 'yes' ? e.yesPool + amount : e.yesPool, noPool: side === 'no' ? e.noPool + amount : e.noPool } : e)
            }
            if (currentUser) {
              stateUpdate.currentUser = { ...currentUser, coins: newCoins }
              stateUpdate.users = s.users.map(u => u.id === currentUser.id ? { ...u, coins: newCoins } : u)
            } else if (anonUser) {
              stateUpdate.users = s.users.map(u => u.id === anonUser.id ? { ...u, coins: newCoins } : u)
            } else {
              stateUpdate.guestCoins = newCoins
            }
            return stateUpdate
          })

          // Send to server for both logged-in and anonymous users
          if (currentUser || anonUser) {
            api.placeBet({ eventId, userId, side, amount })
              .then((serverBet) => {
                // Replace pending bet ID with server bet ID in the store
                set(s => ({
                  bets: s.bets.map(b => b.id === tempBetId ? { ...serverBet } : b)
                }))
                api.updateUser(userId, { coins: newCoins })
                  .then(() => {
                    get().syncCommentsFromServer()
                  })
                  .catch(err => console.error('Failed to update coins:', err))
              })
              .catch(err => console.error('Failed to place bet:', err))
          }

          return true
        }

        // ── Same side: stack up to 100 total (only for logged-in) ──────────────────────────────
        if (existing.side === side) {
          const newAmount = existing.amount + amount
          if (!isGuest && newAmount > 100) return false
          if (userCoins < amount) return false
          const newCoins = isGuest && !anonUser ? guestCoins - amount : Math.min((currentUser?.coins ?? anonUser?.coins ?? guestCoins) - amount, 999)
          set((s): any => {
            let stateUpdate: any = {
              bets: s.bets.map(b => b.id === existing.id ? { ...b, amount: newAmount } : b),
              events: s.events.map(e => e.id === eventId ? { ...e, yesPool: side === 'yes' ? e.yesPool + amount : e.yesPool, noPool: side === 'no' ? e.noPool + amount : e.noPool } : e),
            }
            if (currentUser) {
              stateUpdate.currentUser = { ...currentUser, coins: newCoins }
              stateUpdate.users = s.users.map(u => u.id === currentUser.id ? { ...u, coins: newCoins } : u)
            } else if (anonUser) {
              stateUpdate.users = s.users.map(u => u.id === anonUser.id ? { ...u, coins: newCoins } : u)
            } else {
              stateUpdate.guestCoins = newCoins
            }
            return stateUpdate
          })

          // Update server with new bet amount
          if (currentUser || anonUser) {
            api.updateBet(existing.id, { amount: newAmount })
              .catch(err => console.error('Failed to update bet:', err))
            api.updateUser(userId, { coins: newCoins })
              .catch(err => console.error('Failed to update coins:', err))
          }

          return true
        }

        // ── Opposite side: cancel existing bet and create new one ──────────────────────────
        // When betting opposite side: cancel the existing bet (coins returned) and place new bet with swipe amount
        const netCost = amount  // Cost of the new bet
        if (userCoins < netCost) return false

        const newCoins = isGuest && !anonUser ? guestCoins - netCost : Math.min((currentUser?.coins ?? anonUser?.coins ?? guestCoins) - netCost, 999)

        // Remove existing bet and create new bet with swipe amount
        const withoutExisting = bets.filter(b => b.id !== existing.id)
        const newBets = [...withoutExisting, { id: `bet-${uid()}`, eventId, userId, side, amount, createdAt: new Date().toISOString() }]

        set((s): any => {
          let stateUpdate: any = {
            bets: newBets,
            events: s.events.map(e => e.id !== eventId ? e : {
              ...e,
              yesPool: Math.max(0, e.yesPool - (existing.side === 'yes' ? existing.amount : 0) + (side === 'yes' ? amount : 0)),
              noPool:  Math.max(0, e.noPool  - (existing.side === 'no'  ? existing.amount : 0) + (side === 'no'  ? amount : 0)),
            }),
          }
          if (currentUser) {
            stateUpdate.currentUser = { ...currentUser, coins: newCoins }
            stateUpdate.users = s.users.map(u => u.id === currentUser.id ? { ...u, coins: newCoins } : u)
          } else if (anonUser) {
            stateUpdate.users = s.users.map(u => u.id === anonUser.id ? { ...u, coins: newCoins } : u)
          } else {
            stateUpdate.guestCoins = newCoins
          }
          return stateUpdate
        })

        // Update server for opposite side bets
        if (currentUser || anonUser) {
          // Remove existing bet
          api.removeBet(existing.id)
            .catch(err => console.error('Failed to remove bet:', err))
          // Create new bet with swipe amount
          const newBetData = { eventId, userId, side, amount }
          api.placeBet(newBetData)
            .catch(err => console.error('Failed to place new bet:', err))
          api.updateUser(userId, { coins: newCoins })
            .catch(err => console.error('Failed to update coins:', err))
        }

        return true
      },

      removeBet: (eventId) => {
        const { currentUser, bets, events, getEffectiveStatus, users } = get()

        // Find the bet to remove - look for any bet with this eventId
        // For logged-in users, must match their ID
        // For anonymous users, find by anonUserId from localStorage
        let bet: Bet | undefined
        let userId: string | undefined
        let anonUser: User | undefined

        if (currentUser) {
          bet = bets.find(b => b.eventId === eventId && b.userId === currentUser.id)
          userId = currentUser.id
        } else {
          // For anonymous users, try to find by stored ID first, then fallback to any anonymous user
          const anonUserId = typeof window !== 'undefined' ? localStorage.getItem('lb-anon-user-id') : null
          anonUser = anonUserId ? users.find(u => u.id === anonUserId) : users.find(u => u.isAnonymous)

          if (anonUser) {
            bet = bets.find(b => b.eventId === eventId && b.userId === anonUser!.id)
            userId = anonUser.id
          }
        }

        if (!bet || !userId) return

        const newCoins = Math.min((currentUser?.coins ?? anonUser?.coins ?? 0) + bet.amount, 999)

        // Send to server
        api.removeBet(bet.id)
          .then(() => {
            if (currentUser || anonUser) {
              api.updateUser(userId!, { coins: newCoins })
                .catch(err => console.error('Failed to update coins:', err))
            }
          })
          .catch(err => console.error('Failed to remove bet:', err))

        // Update local state optimistically
        set((s): any => {
          let stateUpdate: any = {
            bets: s.bets.filter(b => !(b.eventId === eventId && b.userId === userId)),
            events: s.events.map(e => e.id === eventId ? {
              ...e,
              yesPool: bet.side === 'yes' ? Math.max(0, e.yesPool - bet.amount) : e.yesPool,
              noPool:  bet.side === 'no'  ? Math.max(0, e.noPool  - bet.amount) : e.noPool,
            } : e),
          }
          if (currentUser) {
            stateUpdate.currentUser = { ...currentUser, coins: newCoins }
            stateUpdate.users = s.users.map(u => u.id === currentUser.id ? { ...u, coins: newCoins } : u)
          } else if (anonUser) {
            stateUpdate.users = s.users.map(u => u.id === userId ? { ...u, coins: newCoins } : u)
          }
          return stateUpdate
        })
      },

      getUserBet: (eventId) => {
        const { currentUser, bets, users } = get()
        // Use anonymous user from server if available, fallback to 'user-guest'
        const anonUserId = typeof window !== 'undefined' ? localStorage.getItem('lb-anon-user-id') : null
        const anonUser = anonUserId ? users.find(u => u.id === anonUserId) : users.find(u => u.isAnonymous)
        const userId = currentUser?.id ?? anonUser?.id ?? 'user-guest'
        return bets.find(b => b.eventId === eventId && b.userId === userId)
      },

      createEvent: async (data) => {
        const { currentUser, guestCoins, placeBet, placeAnonymousVote } = get()
        const { initialSide, ...eventData } = data as any
        const creatorId = currentUser?.id || 'anon'
        const creatorName = currentUser?.username || 'Guest'

        const costCoins = 10
        const userCoins = currentUser?.coins ?? guestCoins
        if (userCoins < costCoins) return false

        const event: Event = {
          ...eventData,
          id: `evt-${uid()}`,
          creatorId,
          creatorName,
          yesPool: 50,
          noPool: 50,
          outcome: null,
          status: 'active',
          viewCount: 0,
          shareCount: 0,
          createdAt: new Date().toISOString(),
        }

        set(s => ({ events: [event, ...s.events] }))

        // Persist to server
        try {
          await api.createEvent(event)
        } catch (error) {
          console.error('Failed to persist event to server:', error)
        }

        if (initialSide) {
          if (currentUser) {
            placeBet(event.id, initialSide, costCoins)
          } else {
            placeAnonymousVote(event.id, initialSide, costCoins)
          }
        }
        return event
      },

      updateEvent: async (eventId, data) => {
        set(s => ({
          events: s.events.map(e => e.id === eventId ? { ...e, ...data } : e),
        }))
        try {
          await api.updateEvent(eventId, data)
        } catch (err) {
          console.error('Failed to update event on server:', err)
        }
      },

      resolveEvent: (eventId, outcome) => {
        const { events, bets, users } = get()
        const event = events.find(e => e.id === eventId)
        if (!event) return

        const totalPool = event.yesPool + event.noPool
        const winnerBets = bets.filter(b => b.eventId === eventId && b.side === outcome)
        const winnerPool = outcome === 'yes' ? event.yesPool : event.noPool
        const updatedUsers = [...users]

        winnerBets.forEach(bet => {
          const share = winnerPool > 0 ? (bet.amount / winnerPool) * totalPool : 0
          const payout = Math.floor(share)
          const idx = updatedUsers.findIndex(u => u.id === bet.userId)
          if (idx !== -1) updatedUsers[idx] = { ...updatedUsers[idx], coins: Math.min(updatedUsers[idx].coins + payout, 999) }
        })

        const { currentUser } = get()
        const updatedCurrent = currentUser ? updatedUsers.find(u => u.id === currentUser.id) ?? currentUser : null

        set({
          events: events.map(e => e.id === eventId ? { ...e, outcome, status: 'resolved' } : e),
          users: updatedUsers,
          currentUser: updatedCurrent,
        })
      },

      archiveEvent: (eventId) => {
        set(s => ({ events: s.events.map(e => e.id === eventId ? { ...e, status: 'archived' } : e) }))
      },

      deleteEvent: async (eventId) => {
        set(s => ({
          events: s.events.filter(e => e.id !== eventId),
          bets: s.bets.filter(b => b.eventId !== eventId),
          comments: s.comments.filter(c => c.eventId !== eventId),
        }))
        try {
          await api.deleteEvent(eventId)
        } catch (err) {
          console.error('Failed to delete event on server:', err)
        }
      },

      addCompany: (name, description, industry) => {
        const trimmed = name.trim()
        const slug = trimmed.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
        const company: Company = {
          id: `comp-${uid()}`,
          name: trimmed,
          slug,
          description: description.trim(),
          industry: industry.trim(),
          viewCount: 0,
          createdAt: new Date().toISOString(),
        }
        set(s => ({ companies: [...s.companies, company] }))
      },

      updateCompany: (id, name, description, industry) => {
        set(s => ({
          companies: s.companies.map(c => c.id === id ? { ...c, name: name.trim(), description: description.trim(), industry: industry.trim() } : c),
          events: s.events.map(e => e.companyId === id ? { ...e, companyName: name.trim() } : e),
        }))
      },

      deleteCompany: (id) => {
        set(s => ({
          companies: s.companies.filter(c => c.id !== id),
          events: s.events.filter(e => e.companyId !== id),
        }))
      },

      addComment: (eventId, content) => {
        const { currentUser, events } = get()
        if (!currentUser) return { ok: false, error: 'Must be logged in to comment' }

        const trimmed = content.trim()
        if (!trimmed) return { ok: false, error: 'Comment cannot be empty' }
        if (!validateNoPersonalNames(trimmed)) return { ok: false, error: 'Please avoid using personal names in comments' }

        const event = events.find(e => e.id === eventId)
        const comment: Comment = {
          id: `cmt-${uid()}`,
          eventId,
          companyId: event?.companyId,
          userId: currentUser.id,
          displayName: currentUser.displayName || currentUser.username || undefined,
          content: trimmed,
          createdAt: new Date().toISOString(),
        }

        // Add comment to local store immediately
        set(s => ({ comments: [...s.comments, comment] }))

        // Save to server asynchronously
        api.addComment(comment)
          .then(serverComment => {
            // Update with server ID if different
            if (serverComment.id !== comment.id) {
              set(s => ({
                comments: s.comments.map(c => c.id === comment.id ? serverComment : c)
              }))
            }
          })
          .catch(err => {
            console.error('[Store] Failed to save comment to server:', err)
            // Comment stays in local store even if server save fails
          })

        return { ok: true }
      },

      editComment: (id, content) => {
        const { currentUser, comments } = get()
        if (!currentUser) return { ok: false, error: 'Must be logged in to edit' }

        const comment = comments.find(c => c.id === id)
        if (!comment) return { ok: false, error: 'Comment not found' }
        if (comment.userId !== currentUser.id && !currentUser.isAdmin) {
          return { ok: false, error: 'You can only edit your own comments' }
        }

        const trimmed = content.trim()
        if (!trimmed) return { ok: false, error: 'Comment cannot be empty' }
        if (!validateNoPersonalNames(trimmed)) return { ok: false, error: 'Please avoid using personal names in comments' }

        const editedAt = new Date().toISOString()
        set(s => ({
          comments: s.comments.map(c => c.id === id ? { ...c, content: trimmed, editedAt } : c)
        }))

        // Save to server asynchronously
        api.editComment(id, trimmed, editedAt)
          .catch(err => console.error('[Store] Failed to save comment edit to server:', err))

        return { ok: true }
      },

      deleteComment: (id) => {
        const { currentUser, comments } = get()
        if (!currentUser) return false

        const comment = comments.find(c => c.id === id)
        if (!comment) return false
        if (comment.userId !== currentUser.id && !currentUser.isAdmin) return false

        set(s => ({ comments: s.comments.filter(c => c.id !== id) }))

        // Send to server asynchronously
        api.deleteComment(id)
          .catch(err => console.error('[Store] Failed to delete comment on server:', err))

        return true
      },

      upvoteComment: (commentId) => {
        const { upvotedCommentIds } = get()
        if (upvotedCommentIds.includes(commentId)) return
        set(s => ({
          comments: s.comments.map(c => c.id === commentId ? { ...c, upvotes: (c.upvotes ?? 0) + 1 } : c),
          upvotedCommentIds: [...s.upvotedCommentIds, commentId],
        }))
      },

      recordShare: (eventId) => {
        set(s => ({
          events: s.events.map(e => e.id === eventId ? { ...e, shareCount: (e.shareCount ?? 0) + 1 } : e),
        }))
      },

      getEffectiveStatus: (event) => {
        if (event.status === 'resolved' || event.status === 'archived') return event.status
        if (isExpired(event.expiresAt)) return 'expired'
        return 'active'
      },

      banUser: (userId) => {
        if (userId === 'user-admin') return
        set(s => ({ users: s.users.filter(u => u.id !== userId) }))
      },

      restoreSession: () => {
        if (typeof window === 'undefined') return
        try {
          const saved = localStorage.getItem('layoff-bets-currentUser')
          if (saved) {
            const user = JSON.parse(saved)
            set({ currentUser: user })
            // Verify user still exists in the users list
            const users = get().users
            if (!users.find(u => u.id === user.id)) {
              localStorage.removeItem('layoff-bets-currentUser')
              set({ currentUser: null })
            } else {
              // Load user's favorites from server
              api.getFavorites(user.id)
                .then(favorites => {
                  console.log('[restoreSession] Loaded favorites from server:', favorites)
                  set({ favoriteCompanyIds: favorites })
                })
                .catch(err => console.error('[restoreSession] Failed to load favorites:', err))
            }
          }
        } catch (e) {
          console.error('Failed to restore session:', e)
          localStorage.removeItem('layoff-bets-currentUser')
        }
      },

      syncCommentsFromServer: async () => {
        try {
          const serverData = await api.sync()
          if (serverData) {
            const currentUser = get().currentUser
            const userId = currentUser?.id
            const currentFavs = get().favoriteCompanyIds
            const currentPinned = get().pinnedEventIds
            const currentBets = get().bets

            // For logged-in users, use server data. For anonymous users, preserve local favorites
            const newFavs = userId && serverData.favorites?.[userId] ? serverData.favorites[userId] : currentFavs
            const newPinned = userId && serverData.pinnedEvents?.[userId] ? serverData.pinnedEvents[userId] : currentPinned

            // Merge bets: keep server bets as source of truth, but preserve local bets not yet synced
            const serverBets = serverData.bets || []
            // Replace pending bets with server bets, keep other local bets
            const pendingBets = currentBets.filter(b => b.id.startsWith('pending-'))
            const otherLocalBets = currentBets.filter(b => !b.id.startsWith('pending-'))

            let mergedBets = [...serverBets]
            // Keep local bets that aren't pending and don't exist on server
            for (const localBet of otherLocalBets) {
              if (!serverBets.find((sb: Bet) => sb.id === localBet.id)) {
                mergedBets.push(localBet)
              }
            }
            // Pending bets are replaced by server bets, so don't include them

            if (JSON.stringify(newFavs) !== JSON.stringify(currentFavs)) {
              console.log('[syncCommentsFromServer] favorites changed from', currentFavs, 'to', newFavs)
            }

            // Merge seed events with server events (server events can add to/replace seed ones)
            const mergedEvents = serverData.events.length > 0
              ? [...SEED_EVENTS, ...serverData.events.filter((e: Event) => !SEED_EVENTS.find(se => se.id === e.id))]
              : SEED_EVENTS

            // Merge seed comments with server comments (server comments can add to/replace seed ones)
            const mergedComments = serverData.comments.length > 0
              ? [...SEED_COMMENTS, ...serverData.comments.filter((c: Comment) => !SEED_COMMENTS.find(sc => sc.id === c.id))]
              : SEED_COMMENTS

            set({
              users: serverData.users.length > 0 ? serverData.users : SEED_USERS,
              events: mergedEvents,
              bets: mergedBets,
              comments: mergedComments,
              chatMessages: serverData.chatMessages || [],
              companies: serverData.companies.length > 0 ? serverData.companies : SEED_COMPANIES,
              favoriteCompanyIds: newFavs,
              pinnedEventIds: newPinned,
              feedback: serverData.feedback || [],
              anonVotedEvents: serverData.anonVotedEvents || {},
              hiddenCompanyIds: serverData.hiddenCompanyIds || [],
            })
          }
        } catch (error) {
          console.error('Failed to sync from server:', error)
        }
      },
    }),
    {
      name: 'layoff-bets-store-v6',
      partialize: (s) => ({
        users: s.users,
        companies: s.companies,
        events: s.events,
        bets: s.bets,
        comments: s.comments,
        chatMessages: s.chatMessages,
        currentUser: s.currentUser,
        theme: s.theme,
        onboardingCompanyId: s.onboardingCompanyId,
        favoriteCompanyIds: s.favoriteCompanyIds,
        pinnedEventIds: s.pinnedEventIds,
        feedback: s.feedback,
        anonVotedEvents: s.anonVotedEvents,
        companyLastVisit: s.companyLastVisit,
        upvotedCommentIds: s.upvotedCommentIds,
        hiddenCompanyIds: s.hiddenCompanyIds,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return
        const idx = state.users.findIndex(u => u.id === 'user-admin')
        if (idx === -1) {
          state.users = [ADMIN_USER, ...state.users]
        } else {
          state.users[idx] = { ...state.users[idx], username: 'admin', password: 'admin', isAdmin: true }
        }
      },
    }
  )
)
