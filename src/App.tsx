import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useStore } from './store/useStore'
import type { ReactNode } from 'react'

const GATE_KEY = 'lb-gate-v2'
const GATE_ANS = 'pershing'
const LAUNCH_DATE_KEY = 'lb-launch-date'
const DEFAULT_LAUNCH = '2026-09-01'
const GATE_ADMIN_USER = 'admin'
const GATE_ADMIN_PASS = 'admin'

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

const SiteGate = ({ children }: { children: ReactNode }) => {
  const [unlocked, setUnlocked] = useState(() => localStorage.getItem(GATE_KEY) === '1')
  const [launchDate, setLaunchDate] = useState(() => localStorage.getItem(LAUNCH_DATE_KEY) || DEFAULT_LAUNCH)
  const [input, setInput] = useState('')
  const [error, setError] = useState(false)
  const [shake, setShake] = useState(false)

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

  if (unlocked) return <>{children}</>

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (input.trim().toLowerCase() === GATE_ANS) {
      localStorage.setItem(GATE_KEY, '1')
      setUnlocked(true)
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

  const DiceIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" className="w-9 h-9 text-white" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="4" fill="currentColor" opacity="0.15" />
      <rect x="2" y="2" width="20" height="20" rx="4" />
      <circle cx="8" cy="8" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="16" cy="8" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="8" cy="16" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="16" cy="16" r="1.4" fill="currentColor" stroke="none" />
    </svg>
  )

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div className="flex flex-col items-center gap-3">
            <div className="w-16 h-16 bg-gradient-to-br from-violet-500 to-purple-700 rounded-2xl flex items-center justify-center shadow-xl shadow-violet-900/50">
              <DiceIcon />
            </div>
            <div className="text-center">
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-2xl font-semibold text-slate-300 tracking-tight">Layoff</span>
                <span className="text-2xl font-black text-violet-400 tracking-tight">Bet</span>
              </div>
              <div className="text-xs text-slate-500 mt-0.5 tracking-wide uppercase">Anonymous prediction markets</div>
            </div>
          </div>
        </div>

        {/* Countdown banner */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl px-4 py-3 mb-4 text-center">
          <p className="text-xs text-slate-500 uppercase tracking-widest mb-2">Stealth beta · Launching late 2026</p>
          <div className="flex flex-col items-center">
            <span className="text-5xl font-black text-white tabular-nums leading-none">{pad(days)}</span>
            <span className="text-xs text-slate-600 uppercase tracking-wider mt-1.5">Days to launch</span>
          </div>
        </div>

        {/* Challenge card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl">
          <p className="text-base font-semibold text-white mb-1 text-center">Where do you work?</p>
          <p className="text-xs text-slate-500 text-center mb-5">Early access is invite-only</p>

          <form onSubmit={submit} className="space-y-3">
            <div className={shake ? 'animate-[wiggle_0.4s_ease-in-out]' : ''}>
              <input
                type="text"
                value={input}
                onChange={e => { setInput(e.target.value); setError(false) }}
                placeholder="Your answer..."
                autoFocus
                autoComplete="off"
                className={`w-full bg-slate-800 border ${error ? 'border-rose-500' : 'border-slate-700 focus:border-violet-500'} rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500/20 transition-colors text-sm`}
              />
            </div>
            {error && (
              <p className="text-xs text-rose-400 flex items-center gap-1.5">
                <span className="inline-block w-1.5 h-1.5 bg-rose-400 rounded-full" />
                That's not right — try again
              </p>
            )}
            <button type="submit" className="w-full bg-violet-600 hover:bg-violet-500 active:bg-violet-700 text-white font-semibold py-3 rounded-xl transition-colors text-sm tracking-wide">
              Continue →
            </button>
          </form>
        </div>

        <div className="text-center mt-6">
          <button onClick={() => { setAdminOpen(true); setAdminStep('login') }} className="text-slate-800 hover:text-slate-600 text-xs transition-colors">·</button>
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
                  <input value={adminUser} onChange={e => { setAdminUser(e.target.value); setAdminErr(false) }} placeholder="Username" autoFocus className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-violet-500 transition-colors" />
                  <input type="password" value={adminPass} onChange={e => { setAdminPass(e.target.value); setAdminErr(false) }} placeholder="Password" className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-violet-500 transition-colors" />
                  {adminErr && <p className="text-xs text-rose-400">Incorrect credentials</p>}
                  <button type="submit" className="w-full bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors">Sign in</button>
                </form>
              </>
            ) : (
              <>
                <p className="text-sm font-semibold text-white mb-1">Launch date</p>
                <p className="text-xs text-slate-500 mb-4">Set the public launch date shown on the gate</p>
                <form onSubmit={saveDate} className="space-y-3">
                  <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500 transition-colors" />
                  <button type="submit" className={`w-full text-sm font-semibold py-2.5 rounded-xl transition-colors ${saved ? 'bg-emerald-600 text-white' : 'bg-violet-600 hover:bg-violet-500 text-white'}`}>
                    {saved ? '✓ Saved' : 'Save date'}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes wiggle {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-6px); }
          40% { transform: translateX(6px); }
          60% { transform: translateX(-4px); }
          80% { transform: translateX(4px); }
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

export const App = () => (
  <SiteGate>
  <BrowserRouter>
    <ThemeEffect />
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/guidelines" element={<ContentGuidelines />} />
      <Route path="/privacy" element={<PrivacyPolicy />} />

      <Route path="/:slug" element={<CompanyPage />} />
      <Route path="/event/:id" element={<EventDetail />} />
      <Route path="/search" element={<Search />} />

      <Route path="/feed" element={<Protected><Feed /></Protected>} />
      <Route path="/bets" element={<Protected><Bets /></Protected>} />
      <Route path="/create" element={<Protected><CreateEvent /></Protected>} />
      <Route path="/profile" element={<Protected><Profile /></Protected>} />
      <Route path="/settings" element={<Protected><Settings /></Protected>} />
      <Route path="/admin" element={<AdminOnly><Admin /></AdminOnly>} />
      <Route path="/feedback-admin" element={<AdminOnly><FeedbackAdmin /></AdminOnly>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </BrowserRouter>
  </SiteGate>
)
