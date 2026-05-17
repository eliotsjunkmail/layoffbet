import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User, Company, Event, Bet, Comment, Theme } from '../types'
import { uid, isExpired } from '../utils/odds'

const DAILY_COINS = 100
const today = () => new Date().toISOString().split('T')[0]
const futureDate = (days: number) => new Date(Date.now() + days * 86400000).toISOString()
const pastDate = (days: number) => new Date(Date.now() - days * 86400000).toISOString()

const SEED_COMPANIES: Company[] = [
  { id: 'comp-1', name: 'ACME Inc', description: 'Leading provider of enterprise software and cloud solutions.', industry: 'Software', viewCount: 142341, createdAt: pastDate(60) },
  { id: 'comp-2', name: 'Beyond LLC', description: 'Future-focused technology and AI startup.', industry: 'AI & Machine Learning', viewCount: 89204, createdAt: pastDate(45) },
  { id: 'comp-3', name: 'Cap Corp', description: 'Global capital management and financial services firm.', industry: 'Finance', viewCount: 67891, createdAt: pastDate(30) },
  { id: 'comp-4', name: 'SynthAI', description: 'Building the next generation of generative AI infrastructure.', industry: 'AI & Machine Learning', viewCount: 55120, createdAt: pastDate(28) },
  { id: 'comp-5', name: 'StreamVault', description: 'On-demand entertainment and streaming platform.', industry: 'Media & Entertainment', viewCount: 41234, createdAt: pastDate(25) },
  { id: 'comp-6', name: 'NovaTech Inc', description: 'Enterprise software for manufacturing and supply chain.', industry: 'Software', viewCount: 38445, createdAt: pastDate(22) },
  { id: 'comp-7', name: 'MedCore Health', description: 'Healthcare delivery and digital health platform.', industry: 'Healthcare', viewCount: 28901, createdAt: pastDate(20) },
  { id: 'comp-8', name: 'DataStream Corp', description: 'Real-time data analytics and business intelligence.', industry: 'Tech', viewCount: 28334, createdAt: pastDate(18) },
  { id: 'comp-9', name: 'ValueBank Group', description: 'Retail and commercial banking services.', industry: 'Finance', viewCount: 24112, createdAt: pastDate(17) },
  { id: 'comp-10', name: 'NewsFirst Media', description: 'Digital news and investigative journalism platform.', industry: 'Media & Entertainment', viewCount: 22445, createdAt: pastDate(15) },
  { id: 'comp-11', name: 'Capital Bridge', description: 'Fintech lending and alternative finance solutions.', industry: 'Finance', viewCount: 19334, createdAt: pastDate(14) },
  { id: 'comp-12', name: 'ShopEasy', description: 'E-commerce marketplace for everyday essentials.', industry: 'Retail', viewCount: 19234, createdAt: pastDate(13) },
  { id: 'comp-13', name: 'GreenPower', description: 'Renewable energy generation and distribution.', industry: 'Energy', viewCount: 18901, createdAt: pastDate(12) },
  { id: 'comp-14', name: 'Pixelworks', description: 'Creative tools and design software for professionals.', industry: 'Software', viewCount: 18332, createdAt: pastDate(11) },
  { id: 'comp-15', name: 'HealthPath', description: 'Digital health coaching and wellness programs.', industry: 'Healthcare', viewCount: 16445, createdAt: pastDate(10) },
  { id: 'comp-16', name: 'MarketFresh', description: 'Online grocery delivery and meal kit service.', industry: 'Retail', viewCount: 15678, createdAt: pastDate(9) },
  { id: 'comp-17', name: 'FuelMax', description: 'Oil & gas exploration and energy trading.', industry: 'Energy', viewCount: 14234, createdAt: pastDate(9) },
  { id: 'comp-18', name: 'CloudBase Solutions', description: 'Cloud infrastructure and managed services provider.', industry: 'Tech', viewCount: 14445, createdAt: pastDate(8) },
  { id: 'comp-19', name: 'YumGroup', description: 'Global food brands and quick-service restaurants.', industry: 'Food & Beverage', viewCount: 13890, createdAt: pastDate(8) },
  { id: 'comp-20', name: 'MergerCo', description: 'Mergers and acquisitions advisory services.', industry: 'Finance', viewCount: 12890, createdAt: pastDate(7) },
  { id: 'comp-21', name: 'FleetTrack', description: 'Fleet management and last-mile logistics platform.', industry: 'Logistics', viewCount: 11234, createdAt: pastDate(7) },
  { id: 'comp-22', name: 'StyleHouse', description: 'Online fashion retail and personal styling.', industry: 'Retail', viewCount: 11234, createdAt: pastDate(6) },
  { id: 'comp-23', name: 'FreshBite', description: 'Food delivery and cloud kitchen operator.', industry: 'Food & Beverage', viewCount: 10234, createdAt: pastDate(6) },
  { id: 'comp-24', name: 'QuickShip', description: 'Same-day and express parcel delivery.', industry: 'Logistics', viewCount: 9445, createdAt: pastDate(5) },
  { id: 'comp-25', name: 'BuildRight Industries', description: 'Residential and commercial construction contractor.', industry: 'Manufacturing', viewCount: 9234, createdAt: pastDate(5) },
  { id: 'comp-26', name: 'Stratford Partners', description: 'Management consulting and digital transformation.', industry: 'Consulting', viewCount: 8445, createdAt: pastDate(4) },
  { id: 'comp-27', name: 'FactoryOne', description: 'Industrial automation and smart manufacturing.', industry: 'Manufacturing', viewCount: 7890, createdAt: pastDate(4) },
  { id: 'comp-28', name: 'Peak Advisors', description: 'Strategy and operations consulting for mid-market firms.', industry: 'Consulting', viewCount: 6890, createdAt: pastDate(3) },
]

const SEED_USERS: User[] = [
  {
    id: 'user-admin',
    username: 'admin',
    password: 'admin',
    coins: 9999,
    isAdmin: true,
    createdAt: pastDate(60),
    lastCoinsDate: today(),
  },
]

const SEED_EVENTS: Event[] = [
  {
    id: 'evt-1', companyId: 'comp-1', companyName: 'ACME Inc',
    title: 'ACME Inc will announce mass layoffs this quarter',
    description: 'Multiple insiders report restructuring is imminent. The engineering org is rumored to shrink by 20%. Sales and marketing may be affected too.',
    expiresAt: futureDate(14), status: 'active', creatorId: 'user-admin', creatorName: 'admin',
    yesPool: 420, noPool: 180, outcome: null, createdAt: pastDate(5), viewCount: 3241,
  },
  {
    id: 'evt-2', companyId: 'comp-1', companyName: 'ACME Inc',
    title: 'ACME CEO will resign within the next 6 months',
    description: 'Board pressure is mounting after two consecutive quarters of missed earnings. Several executives have already departed.',
    expiresAt: futureDate(60), status: 'active', creatorId: 'user-admin', creatorName: 'admin',
    yesPool: 110, noPool: 390, outcome: null, createdAt: pastDate(3), viewCount: 1872,
  },
  {
    id: 'evt-3', companyId: 'comp-2', companyName: 'Beyond LLC',
    title: 'Beyond LLC will freeze all hiring through end of year',
    description: 'Runway concerns and slowing growth have led to internal discussions about pausing headcount expansion indefinitely.',
    expiresAt: futureDate(21), status: 'active', creatorId: 'user-admin', creatorName: 'admin',
    yesPool: 290, noPool: 210, outcome: null, createdAt: pastDate(7), viewCount: 2104,
  },
  {
    id: 'evt-4', companyId: 'comp-2', companyName: 'Beyond LLC',
    title: 'Beyond LLC will be acquired by a larger tech company',
    description: 'Acquisition talks have been floating around for months. Valuations are reportedly close to agreement.',
    expiresAt: futureDate(90), status: 'active', creatorId: 'user-admin', creatorName: 'admin',
    yesPool: 155, noPool: 345, outcome: null, createdAt: pastDate(2), viewCount: 987,
  },
  {
    id: 'evt-5', companyId: 'comp-3', companyName: 'Cap Corp',
    title: 'Cap Corp will close its NYC office by year end',
    description: 'Remote-first policies have gutted NYC office usage. The lease is up for renewal and leadership is weighing whether to sign.',
    expiresAt: futureDate(30), status: 'active', creatorId: 'user-admin', creatorName: 'admin',
    yesPool: 200, noPool: 200, outcome: null, createdAt: pastDate(4), viewCount: 1455,
  },
  {
    id: 'evt-6', companyId: 'comp-3', companyName: 'Cap Corp',
    title: 'Cap Corp will cut 15% of its workforce in the next 90 days',
    description: 'Regulatory fines and rising costs have squeezed margins. Board-mandated efficiency review underway.',
    expiresAt: futureDate(10), status: 'active', creatorId: 'user-admin', creatorName: 'admin',
    yesPool: 315, noPool: 185, outcome: null, createdAt: pastDate(6), viewCount: 2788,
  },
  {
    id: 'evt-7', companyId: 'comp-1', companyName: 'ACME Inc',
    title: 'ACME Inc announced a hiring freeze in Q1',
    description: 'Leadership cited macroeconomic conditions for the pause.',
    expiresAt: pastDate(10), status: 'resolved', creatorId: 'user-admin', creatorName: 'admin',
    yesPool: 600, noPool: 200, outcome: 'yes', createdAt: pastDate(30), viewCount: 5102,
  },
  {
    id: 'evt-8', companyId: 'comp-2', companyName: 'Beyond LLC',
    title: 'Beyond LLC will miss Q1 revenue targets',
    description: 'Pipeline reports from sales show a significant gap vs forecast.',
    expiresAt: pastDate(5), status: 'expired', creatorId: 'user-admin', creatorName: 'admin',
    yesPool: 220, noPool: 280, outcome: null, createdAt: pastDate(45), viewCount: 1334,
  },
]

const SEED_COMMENTS: Comment[] = [
  { id: 'cmt-1', eventId: 'evt-1', content: 'Heard from someone in eng that PIPs are flying out. This is definitely happening.', createdAt: pastDate(2) },
  { id: 'cmt-2', eventId: 'evt-1', content: 'My manager just had a weird 1:1 with HR. Not a good sign.', createdAt: pastDate(1) },
  { id: 'cmt-3', eventId: 'evt-1', content: 'Stock has been down 30% YTD, cost cuts are inevitable.', createdAt: pastDate(0) },
  { id: 'cmt-4', eventId: 'evt-3', content: 'Confirmed — they just rescinded two offers this week.', createdAt: pastDate(3) },
  { id: 'cmt-5', eventId: 'evt-5', content: "Office was basically empty last time I visited. Makes sense they'd close it.", createdAt: pastDate(1) },
]

interface StoreState {
  currentUser: User | null
  users: User[]
  companies: Company[]
  events: Event[]
  bets: Bet[]
  comments: Comment[]
  theme: Theme
  onboardingCompanyId: string | null
  favoriteCompanyIds: string[]

  login: (username: string, password: string) => boolean
  logout: () => void
  register: (username: string, password: string) => { ok: boolean; error?: string }
  checkDailyCoins: () => void
  setTheme: (theme: Theme) => void
  setOnboardingCompany: (companyId: string) => void
  toggleFavoriteCompany: (companyId: string) => void

  placeBet: (eventId: string, side: 'yes' | 'no', amount: number) => boolean
  getUserBet: (eventId: string) => Bet | undefined
  createEvent: (data: Omit<Event, 'id' | 'creatorId' | 'creatorName' | 'yesPool' | 'noPool' | 'outcome' | 'createdAt' | 'status'>) => void
  resolveEvent: (eventId: string, outcome: 'yes' | 'no') => void
  archiveEvent: (eventId: string) => void
  deleteEvent: (eventId: string) => void

  addCompany: (name: string, description: string, industry: string) => void
  updateCompany: (id: string, name: string, description: string, industry: string) => void
  deleteCompany: (id: string) => void

  addComment: (eventId: string, content: string) => void
  deleteComment: (id: string) => void

  getEffectiveStatus: (event: Event) => Event['status']
  banUser: (userId: string) => void
}

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      currentUser: null,
      users: SEED_USERS,
      companies: SEED_COMPANIES,
      events: SEED_EVENTS,
      bets: [],
      comments: SEED_COMMENTS,
      theme: 'light',
      onboardingCompanyId: null,
      favoriteCompanyIds: [],

      setTheme: (theme) => set({ theme }),
      setOnboardingCompany: (companyId) => set({ onboardingCompanyId: companyId }),
      toggleFavoriteCompany: (companyId) => set(s => ({
        favoriteCompanyIds: s.favoriteCompanyIds.includes(companyId)
          ? s.favoriteCompanyIds.filter(id => id !== companyId)
          : [...s.favoriteCompanyIds, companyId],
      })),

      login: (username, password) => {
        const user = get().users.find(
          u => u.username.toLowerCase() === username.toLowerCase() && u.password === password
        )
        if (!user) return false
        set({ currentUser: user })
        get().checkDailyCoins()
        return true
      },

      logout: () => set({ currentUser: null }),

      register: (username, password) => {
        if (!username.trim() || !password) return { ok: false, error: 'Username and password are required.' }
        const exists = get().users.some(u => u.username.toLowerCase() === username.toLowerCase())
        if (exists) return { ok: false, error: 'Username already taken.' }
        const user: User = {
          id: `user-${uid()}`,
          username: username.trim(),
          password,
          coins: DAILY_COINS,
          isAdmin: false,
          createdAt: new Date().toISOString(),
          lastCoinsDate: today(),
        }
        set(s => ({ users: [...s.users, user], currentUser: user }))
        return { ok: true }
      },

      checkDailyCoins: () => {
        const { currentUser, users } = get()
        if (!currentUser) return
        const t = today()
        if (currentUser.lastCoinsDate === t) return
        const updated = { ...currentUser, coins: currentUser.coins + DAILY_COINS, lastCoinsDate: t }
        set(s => ({
          currentUser: updated,
          users: s.users.map(u => u.id === updated.id ? updated : u),
        }))
      },

      placeBet: (eventId, side, amount) => {
        const { currentUser, events, bets } = get()
        if (!currentUser) return false
        if (currentUser.coins < amount) return false
        const event = events.find(e => e.id === eventId)
        if (!event) return false
        if (get().getEffectiveStatus(event) !== 'active') return false
        const alreadyBet = bets.find(b => b.eventId === eventId && b.userId === currentUser.id)
        if (alreadyBet) return false

        const bet: Bet = {
          id: `bet-${uid()}`,
          eventId,
          userId: currentUser.id,
          side,
          amount,
          createdAt: new Date().toISOString(),
        }

        const updatedUser = { ...currentUser, coins: currentUser.coins - amount }
        const updatedEvent = {
          ...event,
          yesPool: side === 'yes' ? event.yesPool + amount : event.yesPool,
          noPool: side === 'no' ? event.noPool + amount : event.noPool,
        }

        set(s => ({
          bets: [...s.bets, bet],
          events: s.events.map(e => e.id === eventId ? updatedEvent : e),
          currentUser: updatedUser,
          users: s.users.map(u => u.id === updatedUser.id ? updatedUser : u),
        }))
        return true
      },

      getUserBet: (eventId) => {
        const { currentUser, bets } = get()
        if (!currentUser) return undefined
        return bets.find(b => b.eventId === eventId && b.userId === currentUser.id)
      },

      createEvent: (data) => {
        const { currentUser } = get()
        if (!currentUser) return
        const event: Event = {
          ...data,
          id: `evt-${uid()}`,
          creatorId: currentUser.id,
          creatorName: currentUser.username,
          yesPool: 50,
          noPool: 50,
          outcome: null,
          status: 'active',
          createdAt: new Date().toISOString(),
        }
        set(s => ({ events: [event, ...s.events] }))
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
          if (idx !== -1) updatedUsers[idx] = { ...updatedUsers[idx], coins: updatedUsers[idx].coins + payout }
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

      deleteEvent: (eventId) => {
        set(s => ({
          events: s.events.filter(e => e.id !== eventId),
          bets: s.bets.filter(b => b.eventId !== eventId),
          comments: s.comments.filter(c => c.eventId !== eventId),
        }))
      },

      addCompany: (name, description, industry) => {
        const company: Company = {
          id: `comp-${uid()}`,
          name: name.trim(),
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
        const comment: Comment = {
          id: `cmt-${uid()}`,
          eventId,
          content: content.trim(),
          createdAt: new Date().toISOString(),
        }
        set(s => ({ comments: [...s.comments, comment] }))
      },

      deleteComment: (id) => {
        set(s => ({ comments: s.comments.filter(c => c.id !== id) }))
      },

      getEffectiveStatus: (event) => {
        if (event.status === 'resolved' || event.status === 'archived') return event.status
        if (isExpired(event.expiresAt)) return 'expired'
        return 'active'
      },

      banUser: (userId) => {
        set(s => ({ users: s.users.filter(u => u.id !== userId) }))
      },
    }),
    {
      name: 'layoff-bets-store-v2',
      partialize: (s) => ({
        users: s.users,
        companies: s.companies,
        events: s.events,
        bets: s.bets,
        comments: s.comments,
        currentUser: s.currentUser,
        theme: s.theme,
        onboardingCompanyId: s.onboardingCompanyId,
        favoriteCompanyIds: s.favoriteCompanyIds,
      }),
    }
  )
)
