import { useEffect, useState, useRef } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useStore } from './store/useStore'
import { api } from './services/api'
import { X } from 'lucide-react'
import type { ReactNode } from 'react'

const API_BASE = ''
const GATE_KEY = 'lb-gate-v2'
const GATE_CODES = ['pershing', 'hello']
const LAUNCH_DATE_KEY = 'lb-launch-date'
const DEFAULT_LAUNCH = '2026-09-01'
const GATE_ADMIN_USER = 'admin'
const GATE_ADMIN_PASS = 'admin'
const ANON_FAVORITE_COMPANY_KEY = 'lb-anon-favorite-company'

const pad = (n: number) => String(n).padStart(2, '0')

const useCountdown = (targetDate: string) => {
  const calc = () => {
    const diff = new Date(targetDate + 'T00:00:00').getTime() - Date.now()
    if (diff <= 0) return { days: 0, hours: 0, mins: 0, secs: 0 }
    return {
      days:  Math.floor(diff / 86400000),
      hours: Math.floor((diff % 86400000) / 3600000),
      mins:  Math.floor((diff % 3600000)  / 60000),
      secs:  Math.floor((diff % 60000)    / 1000),
    }
  }
  const [tick, setTick] = useState(calc)
  useEffect(() => {
    setTick(calc())
    const id = setInterval(() => setTick(calc()), 1000)
    return () => clearInterval(id)
  }, [targetDate])
  return tick
}

const CompanyScroller = ({ letter, scrollDirection, speed, selectedCompanyId, onSelectCompany, prioritizeCompany }: { letter: string; scrollDirection: 'left' | 'right'; speed: number; selectedCompanyId?: string; onSelectCompany?: (companyId: string) => void; prioritizeCompany?: string }) => {
  const companies = useStore(s => s.companies)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState(0)

  const filtered = (() => {
    const all = companies.filter(c => c.name.toUpperCase().startsWith(letter)).sort((a, b) => a.name.localeCompare(b.name))
    if (!prioritizeCompany) return all
    const priority = all.find(c => c.name.toUpperCase().includes(prioritizeCompany.toUpperCase()))
    if (!priority) return all
    return [all[0], priority, ...all.slice(1).filter(c => c.id !== priority.id)]
  })()

  useEffect(() => {
    if (!scrollRef.current) return
    const el = scrollRef.current
    // If we're prioritizing a company, start at the beginning to show it
    if (prioritizeCompany) {
      el.scrollLeft = 0
    } else if (scrollDirection === 'right') {
      el.scrollLeft = el.scrollWidth - el.clientWidth
    } else {
      el.scrollLeft = 0
    }
  }, [scrollDirection, prioritizeCompany])

  useEffect(() => {
    if (!scrollRef.current || isDragging || selectedCompanyId) return
    const scroll = () => {
      if (!scrollRef.current) return
      const el = scrollRef.current
      const scrollSpeed = scrollDirection === 'left' ? speed : -speed
      el.scrollLeft += scrollSpeed
      if (scrollDirection === 'left' && el.scrollLeft >= el.scrollWidth - el.clientWidth) {
        el.scrollLeft = 0
      } else if (scrollDirection === 'right' && el.scrollLeft <= 0) {
        el.scrollLeft = el.scrollWidth - el.clientWidth
      }
    }
    const interval = setInterval(scroll, 30)
    return () => clearInterval(interval)
  }, [scrollDirection, speed, isDragging, selectedCompanyId])

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('[data-company-pill]')) return
    setIsDragging(true)
    setDragStart(e.clientX - (scrollRef.current?.scrollLeft || 0))
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !scrollRef.current) return
    scrollRef.current.scrollLeft = e.clientX - dragStart
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const handlePillClick = (companyId: string) => {
    onSelectCompany?.(companyId)
  }

  return (
    <div
      ref={scrollRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide cursor-grab active:cursor-grabbing"
    >
      {filtered.map(c => (
        <button
          key={c.id}
          data-company-pill
          onClick={() => handlePillClick(c.id)}
          className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm whitespace-nowrap border transition-colors cursor-pointer appearance-none ${
            selectedCompanyId === c.id
              ? 'bg-blue-600 border-blue-500 text-white'
              : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-600'
          }`}
        >
          {c.name}
        </button>
      ))}
    </div>
  )
}

const SiteGate = ({ children }: { children: ReactNode }) => {
  const currentUser = useStore(s => s.currentUser)
  const syncCommentsFromServer = useStore(s => s.syncCommentsFromServer)
  const [unlocked, setUnlocked] = useState(() => localStorage.getItem(GATE_KEY) === '1')
  const [launchDate, setLaunchDate] = useState(() => localStorage.getItem(LAUNCH_DATE_KEY) || DEFAULT_LAUNCH)
  const [input, setInput] = useState('')
  const [error, setError] = useState(false)
  const [shake, setShake] = useState(false)
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>()
  const [anonUsername, setAnonUsername] = useState<string>('')
  const [loadingAnonId, setLoadingAnonId] = useState(true)
  const [showPolicies, setShowPolicies] = useState(false)
  const [policiesTab, setPoliciesTab] = useState<'guidelines' | 'privacy'>('guidelines')

  // Gate admin state
  const [adminOpen, setAdminOpen] = useState(false)
  const [adminStep, setAdminStep] = useState<'login' | 'settings'>('login')
  const [adminUser, setAdminUser] = useState('')
  const [adminPass, setAdminPass] = useState('')
  const [adminErr, setAdminErr] = useState(false)
  const [newDate, setNewDate] = useState(launchDate)
  const [saved, setSaved] = useState(false)

  const { days, hours, mins, secs } = useCountdown(launchDate)

  const launchLabel = new Date(launchDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

  // Fetch next anonymous username on mount
  useEffect(() => {
    const fetchAnonId = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/next-anon-id`)
        const data = await res.json()
        setAnonUsername(data.username)
      } catch (err) {
        console.error('Failed to fetch anonymous ID:', err)
        setAnonUsername('Anon0000001') // Fallback
      } finally {
        setLoadingAnonId(false)
      }
    }
    if (!unlocked) {
      fetchAnonId()
    } else {
      setLoadingAnonId(false)
    }
  }, [unlocked])

  // If user logs in, bypass the gate. Reset gate when user logs out.
  useEffect(() => {
    if (currentUser) {
      setUnlocked(true)
    } else if (unlocked && localStorage.getItem(GATE_KEY) === '1') {
      // User logged out but gate was unlocked - keep it unlocked for anonymous access
      // This preserves the gate unlock state
    }
  }, [currentUser, unlocked])

  if (unlocked) return <>{children}</>

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (GATE_CODES.includes(input.trim().toLowerCase())) {
      try {
        // Register user with anonUsername and password "guest"
        const user = await api.register(anonUsername, 'guest')

        // Store in localStorage
        localStorage.setItem('layoff-bets-currentUser', JSON.stringify(user))

        if (selectedCompanyId) {
          localStorage.setItem(ANON_FAVORITE_COMPANY_KEY, selectedCompanyId)
        }
        localStorage.setItem(GATE_KEY, '1')

        // Sync data from server BEFORE setting currentUser so Home has data ready
        await syncCommentsFromServer()

        // Now set currentUser and unlock gate
        useStore.setState({ currentUser: user })
        setUnlocked(true)
      } catch (err) {
        console.error('Failed to register user:', err)
        setError(true); setShake(true); setInput('')
        setTimeout(() => setShake(false), 500)
      }
    } else {
      setError(true); setShake(true); setInput('')
      setTimeout(() => setShake(false), 500)
    }
  }

  const adminLogin = (e: React.FormEvent) => {
    e.preventDefault()
    if (adminUser.trim().toLowerCase() === GATE_ADMIN_USER && adminPass.toLowerCase() === GATE_ADMIN_PASS) {
      setAdminStep('settings'); setAdminErr(false)
    } else {
      setAdminErr(true); setAdminPass('')
    }
  }

  const saveDate = (e: React.FormEvent) => {
    e.preventDefault()
    localStorage.setItem(LAUNCH_DATE_KEY, newDate)
    setLaunchDate(newDate)
    setSaved(true)
    setTimeout(() => { setSaved(false); setAdminOpen(false); setAdminStep('login'); setAdminUser(''); setAdminPass('') }, 1200)
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        {/* Tagline */}
        <div className="flex justify-center mb-6">
          <div className="text-center">
            <div className="flex items-baseline justify-center gap-1 mb-2">
              <span className="text-2xl font-semibold text-gray-600 dark:text-slate-300 tracking-tight">Layoff</span>
              <span className="text-2xl font-black text-blue-600 dark:text-blue-400 tracking-tight">Live</span>
            </div>
            <div className="text-sm text-slate-400 tracking-wide uppercase">See it coming</div>
          </div>
        </div>

        {/* Company scrollers */}
        <div className="mb-6 space-y-2">
          <CompanyScroller letter="A" scrollDirection="right" speed={0.2} />
          <CompanyScroller letter="B" scrollDirection="right" speed={0.15} />
          <CompanyScroller letter="C" scrollDirection="right" speed={0.1} />
        </div>

        {/* Challenge card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl">
          <form onSubmit={submit} className="space-y-3">
            <div className={shake ? 'animate-[wiggle_0.4s_ease-in-out]' : ''}>
              <input
                type="text"
                value={input}
                onChange={e => { setInput(e.target.value); setError(false) }}
                placeholder="Enter invite code"
                autoComplete="off"
                className={`w-full bg-slate-800 border ${error ? 'border-rose-500' : 'border-slate-700 focus:border-blue-500'} rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors text-sm`}
              />
            </div>
            {error && (
              <p className="text-xs text-rose-400 flex items-center gap-1.5">
                <span className="inline-block w-1.5 h-1.5 bg-rose-400 rounded-full" />
                That's not right — try again
              </p>
            )}
            <button type="submit" disabled={loadingAnonId} className="w-full bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed">
              {loadingAnonId ? 'Loading...' : 'Enter anonymously'}
            </button>
          </form>
        </div>

        <div className="text-center mt-6 space-y-3">
          <p className="text-xs text-slate-500">For entertainment purposes only. All predictions are speculative and not financial advice.</p>
          <p className="text-xs text-slate-600">v1.87</p>
          <div className="flex items-center justify-center gap-2 text-xs">
            <button onClick={() => { setShowPolicies(true); setPoliciesTab('guidelines') }} className="text-slate-600 hover:text-slate-500 transition-colors">Content Guidelines</button>
            <span className="text-slate-600">·</span>
            <button onClick={() => { setShowPolicies(true); setPoliciesTab('privacy') }} className="text-slate-600 hover:text-slate-500 transition-colors">Privacy Policy</button>
          </div>
        </div>
      </div>

      {/* Admin modal */}
      {adminOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-6 z-50" onClick={() => setAdminOpen(false)}>
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-xs shadow-2xl" onClick={e => e.stopPropagation()}>
            {adminStep === 'login' ? (
              <>
                <p className="text-sm font-semibold text-white mb-4">Admin access</p>
                <form onSubmit={adminLogin} className="space-y-3">
                  <input value={adminUser} onChange={e => { setAdminUser(e.target.value); setAdminErr(false) }} placeholder="Username" autoFocus className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-colors" />
                  <input type="password" value={adminPass} onChange={e => { setAdminPass(e.target.value); setAdminErr(false) }} placeholder="Password" className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-colors" />
                  {adminErr && <p className="text-xs text-rose-400">Incorrect credentials</p>}
                  <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors">Sign in</button>
                </form>
              </>
            ) : (
              <>
                <p className="text-sm font-semibold text-white mb-1">Launch date</p>
                <p className="text-xs text-slate-500 mb-4">Set the public launch date shown on the gate</p>
                <form onSubmit={saveDate} className="space-y-3">
                  <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors" />
                  <button type="submit" className={`w-full text-sm font-semibold py-2.5 rounded-xl transition-colors ${saved ? 'bg-emerald-600 text-white' : 'bg-blue-600 hover:bg-blue-500 text-white'}`}>
                    {saved ? '✓ Saved' : 'Save date'}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      {/* Policies Bottom Sheet with Tabs */}
      {showPolicies && (
        <>
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" onClick={() => setShowPolicies(false)} />
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-slate-900 rounded-t-2xl shadow-2xl border-t border-gray-200 dark:border-slate-800 max-h-[80vh] overflow-y-auto flex flex-col">
            <div className="sticky top-0 bg-white dark:bg-slate-900 flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-800">
              <div className="flex gap-4">
                <button onClick={() => setPoliciesTab('guidelines')} className={`font-medium transition-colors ${policiesTab === 'guidelines' ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-slate-500'}`}>
                  Content Guidelines
                </button>
                <button onClick={() => setPoliciesTab('privacy')} className={`font-medium transition-colors ${policiesTab === 'privacy' ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-slate-500'}`}>
                  Privacy Policy
                </button>
              </div>
              <button onClick={() => setShowPolicies(false)} className="p-1 rounded-lg text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-4 space-y-4 text-sm text-gray-700 dark:text-slate-300">
              {policiesTab === 'guidelines' ? (
                <>
                  <p className="text-gray-600 dark:text-slate-400">
                    Layoff Live is an anonymous platform built on good-faith participation. These guidelines protect all users and ensure the platform remains valuable and safe.
                  </p>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Prohibited Content</h3>
                    <ul className="space-y-1 text-gray-600 dark:text-slate-400">
                      <li>• Illegal content of any kind</li>
                      <li>• Harassment, threats, or targeted bullying</li>
                      <li>• Personal identifying information or confidential data</li>
                      <li>• Impersonating users, companies, or public figures</li>
                      <li>• Sexually explicit or NSFW content</li>
                      <li>• Spam, coordinated manipulation, or bot activity</li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Event Quality Standards</h3>
                    <ul className="space-y-1 text-gray-600 dark:text-slate-400">
                      <li>• Events must be specific and verifiable</li>
                      <li>• Events tied to real companies only</li>
                      <li>• No events designed to manipulate or spread misinformation</li>
                      <li>• No duplicate events for the same prediction</li>
                    </ul>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <p className="text-gray-500 dark:text-slate-500 text-xs mb-2">Last updated: May 2026</p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Our Commitment to Anonymity</h3>
                    <p className="text-gray-600 dark:text-slate-400">
                      Layoff Live is built anonymous-first. We do not require your real name, email address, employer, or any identifying information. Your username is the only identity associated with your activity.
                    </p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Data We Collect</h3>
                    <ul className="space-y-1 text-gray-600 dark:text-slate-400">
                      <li>• IP address (fraud prevention)</li>
                      <li>• Browser cookies (session management)</li>
                      <li>• Usage data (events, bets, comments)</li>
                      <li>• Account data (username, password, coins)</li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Data We Do Not Collect</h3>
                    <ul className="space-y-1 text-gray-600 dark:text-slate-400">
                      <li>• Real names or personal identifiers</li>
                      <li>• Email addresses</li>
                      <li>• Employer or employment status</li>
                      <li>• Location data beyond region</li>
                      <li>• Financial or payment information</li>
                    </ul>
                  </div>
                </>
              )}
            </div>
          </div>
        </>
      )}

      <style>{`
        @keyframes wiggle {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-6px); }
          40% { transform: translateX(6px); }
          60% { transform: translateX(-4px); }
          80% { transform: translateX(4px); }
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  )
}

import { Home } from './pages/Home'
import { Login } from './pages/Login'
import { Feed } from './pages/Feed'
import { Bets } from './pages/Bets'
import { EventDetail } from './pages/EventDetail'
import { CreateEvent } from './pages/CreateEvent'
import { CompanyPage } from './pages/CompanyPage'
import { Search } from './pages/Search'
import { Profile } from './pages/Profile'
import { Admin } from './pages/Admin'
import { FeedbackAdmin } from './pages/FeedbackAdmin'
import { Settings } from './pages/Settings'
import { ContentGuidelines } from './pages/ContentGuidelines'
import { PrivacyPolicy } from './pages/PrivacyPolicy'

const Protected = ({ children }: { children: ReactNode }) => {
  const currentUser = useStore(s => s.currentUser)
  return currentUser ? <>{children}</> : <Navigate to="/login" replace />
}

const AdminOnly = ({ children }: { children: ReactNode }) => {
  const currentUser = useStore(s => s.currentUser)
  if (!currentUser) return <Navigate to="/login" replace />
  if (!currentUser.isAdmin) return <Navigate to="/" replace />
  return <>{children}</>
}

const ThemeEffect = () => {
  const theme = useStore(s => s.theme)
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])
  return null
}

import { useLocation } from 'react-router-dom'

const ScrollToTop = () => {
  const { pathname } = useLocation()
  useEffect(() => {
    // Scroll to top on next frame to ensure DOM is ready
    requestAnimationFrame(() => {
      window.scrollTo(0, 0)
      document.documentElement.scrollTop = 0
      document.body.scrollTop = 0
    })
  }, [pathname])
  return null
}

const DataSync = () => {
  const syncCommentsFromServer = useStore(s => s.syncCommentsFromServer)
  const restoreSession = useStore(s => s.restoreSession)
  const initializeAnonymousUser = useStore(s => s.initializeAnonymousUser)

  useEffect(() => {
    const initApp = async () => {
      // Wait for store rehydration to complete
      // This ensures persist middleware has fully loaded saved state
      await new Promise(r => setTimeout(r, 100))

      // Restore user session from localStorage
      restoreSession()

      // Initialize anonymous user with server-side storage
      const currentUser = useStore.getState().currentUser
      if (!currentUser) {
        await initializeAnonymousUser()
      }

      // For anonymous users, fallback to cookie if localStorage has no favorites
      // (persist middleware handles normal restore via 'layoff-bets-store-v6' key)
      const currentFavs = useStore.getState().favoriteCompanyIds
      if (!currentUser && (!currentFavs || currentFavs.length === 0)) {
        // Only restore from cookie if no favorites in store
        const cookies = document.cookie.split(';')
        const cookieFav = cookies.find(c => c.trim().startsWith('lb-anon-favorites='))
        if (cookieFav) {
          try {
            const favStr = cookieFav.split('=')[1]
            const favs = JSON.parse(favStr)
            if (Array.isArray(favs) && favs.length > 0) {
              useStore.setState({ favoriteCompanyIds: favs })
            }
          } catch (e) {
            console.error('Failed to restore anonymous favorites from cookie:', e)
          }
        }
      }

      // Wait a moment for registration API to complete if in progress
      const registering = localStorage.getItem('layoff-bets-registering')
      if (registering) {
        console.log('[DataSync] Registration in progress, waiting...')
        // Wait up to 5 seconds for registration to complete
        for (let i = 0; i < 50; i++) {
          if (!localStorage.getItem('layoff-bets-registering')) {
            console.log('[DataSync] Registration completed')
            break
          }
          await new Promise(r => setTimeout(r, 100))
        }
      }

      // Sync from server to get latest data
      await syncCommentsFromServer()
    }

    initApp()

    // Sync every 5 seconds to keep data updated
    const interval = setInterval(() => {
      syncCommentsFromServer()
    }, 5000)

    return () => clearInterval(interval)
  }, [syncCommentsFromServer, restoreSession, initializeAnonymousUser])

  return null
}

export const App = () => (
  <SiteGate>
  <BrowserRouter>
    <ThemeEffect />
    <ScrollToTop />
    <DataSync />
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/guidelines" element={<ContentGuidelines />} />
      <Route path="/privacy" element={<PrivacyPolicy />} />

      <Route path="/:slug" element={<CompanyPage />} />
      <Route path="/:slug/bet/:id/*" element={<EventDetail />} />
      <Route path="/event/:id" element={<EventDetail />} />
      <Route path="/search" element={<Search />} />

      <Route path="/feed" element={<Protected><Feed /></Protected>} />
      <Route path="/bets" element={<Bets />} />
      <Route path="/create" element={<CreateEvent />} />
      <Route path="/profile" element={<Protected><Profile /></Protected>} />
      <Route path="/settings" element={<Protected><Settings /></Protected>} />
      <Route path="/admin" element={<AdminOnly><Admin /></AdminOnly>} />
      <Route path="/feedback-admin" element={<AdminOnly><FeedbackAdmin /></AdminOnly>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </BrowserRouter>
  </SiteGate>
)
