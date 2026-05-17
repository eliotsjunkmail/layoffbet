import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useStore } from './store/useStore'
import type { ReactNode } from 'react'

const GATE_KEY = 'lb-gate-v1'
const GATE_PWD = 'pershing'

const SiteGate = ({ children }: { children: ReactNode }) => {
  const [unlocked, setUnlocked] = useState(() => localStorage.getItem(GATE_KEY) === '1')
  const [input, setInput] = useState('')
  const [error, setError] = useState(false)

  if (unlocked) return <>{children}</>

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (input.trim().toLowerCase() === GATE_PWD) {
      localStorage.setItem(GATE_KEY, '1')
      setUnlocked(true)
    } else {
      setError(true)
      setInput('')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center p-6">
      <div className="w-full max-w-xs">
        <div className="text-center mb-8">
          <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Layoff Bets</div>
          <div className="text-sm text-gray-400 dark:text-slate-500">Private beta — enter access password</div>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <input
            type="password"
            value={input}
            onChange={e => { setInput(e.target.value); setError(false) }}
            placeholder="Password"
            autoFocus
            className={`w-full bg-white dark:bg-slate-800 border ${error ? 'border-rose-400 dark:border-rose-500' : 'border-gray-300 dark:border-slate-700'} rounded-xl px-4 py-3 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-600 focus:outline-none focus:border-violet-500 transition-colors text-sm`}
          />
          {error && <p className="text-xs text-rose-500 dark:text-rose-400">Incorrect password. Try again.</p>}
          <button type="submit" className="w-full bg-violet-600 hover:bg-violet-500 text-white font-semibold py-3 rounded-xl transition-colors text-sm">
            Enter
          </button>
        </form>
      </div>
    </div>
  )
}

import { Home } from './pages/Home'
import { Login } from './pages/Login'
import { Feed } from './pages/Feed'
import { EventDetail } from './pages/EventDetail'
import { CreateEvent } from './pages/CreateEvent'
import { CompanyPage } from './pages/CompanyPage'
import { Search } from './pages/Search'
import { Profile } from './pages/Profile'
import { Admin } from './pages/Admin'
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
      <Route path="/create" element={<Protected><CreateEvent /></Protected>} />
      <Route path="/profile" element={<Protected><Profile /></Protected>} />
      <Route path="/settings" element={<Protected><Settings /></Protected>} />
      <Route path="/admin" element={<AdminOnly><Admin /></AdminOnly>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </BrowserRouter>
  </SiteGate>
)
