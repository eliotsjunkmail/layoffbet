import { useState, useEffect } from 'react'
import { useNavigate, Link, useSearchParams } from 'react-router-dom'
import { TrendingUp } from 'lucide-react'
import { useStore } from '../store/useStore'
import { Footer } from '../components/Footer'

const REMEMBER_KEY = 'next-layoff-remember'

export const Login = () => {
  const [searchParams] = useSearchParams()
  const [mode, setMode] = useState<'login' | 'register'>(searchParams.get('mode') === 'register' ? 'register' : 'login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(false)
  const [error, setError] = useState('')
  const login = useStore(s => s.login)
  const register = useStore(s => s.register)
  const navigate = useNavigate()

  useEffect(() => {
    const saved = localStorage.getItem(REMEMBER_KEY)
    if (saved) {
      try {
        const { username: u, password: p } = JSON.parse(saved)
        setUsername(u)
        setPassword(p)
        setRemember(true)
      } catch {}
    }
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (mode === 'login') {
      const ok = login(username, password)
      if (ok) {
        if (remember) {
          localStorage.setItem(REMEMBER_KEY, JSON.stringify({ username, password }))
        } else {
          localStorage.removeItem(REMEMBER_KEY)
        }
        navigate('/')
      } else {
        setError('Invalid username or password.')
      }
    } else {
      const result = register(username, password)
      if (result.ok) {
        if (remember) {
          localStorage.setItem(REMEMBER_KEY, JSON.stringify({ username, password }))
        }
        navigate('/')
      } else {
        setError(result.error ?? 'Registration failed.')
      }
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-white flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          <div className="flex flex-col items-center mb-8">
            <Link to="/" className="w-14 h-14 bg-violet-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-violet-200 dark:shadow-violet-900/50">
              <TrendingUp className="w-7 h-7 text-white" />
            </Link>
            <h1 className="text-2xl font-bold tracking-tight">Next Layoff</h1>
            <p className="text-gray-500 dark:text-slate-400 text-sm mt-1">Anonymous prediction markets</p>
          </div>

          <div className="flex bg-gray-100 dark:bg-slate-800 rounded-xl p-1 mb-6">
            <button
              onClick={() => { setMode('login'); setError('') }}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${mode === 'login' ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow' : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200'}`}
            >
              Sign In
            </button>
            <button
              onClick={() => { setMode('register'); setError('') }}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${mode === 'register' ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow' : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200'}`}
            >
              Create Account
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-600 dark:text-slate-400 mb-1.5">Username</label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="anonymous_user"
                className="w-full bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-xl px-4 py-3 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-600 focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/10 transition-all"
                autoComplete="username"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 dark:text-slate-400 mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-xl px-4 py-3 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-600 focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/10 transition-all"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              />
            </div>

            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <div
                onClick={() => setRemember(!remember)}
                className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${remember ? 'bg-violet-600 border-violet-600' : 'border-gray-300 dark:border-slate-600'}`}
              >
                {remember && <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
              </div>
              <span className="text-sm text-gray-600 dark:text-slate-400">Remember me</span>
            </label>

            {error && (
              <div className="bg-rose-50 dark:bg-rose-900/30 border border-rose-200 dark:border-rose-700 rounded-xl px-4 py-3 text-rose-600 dark:text-rose-300 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-violet-600 hover:bg-violet-500 text-white font-semibold py-3 rounded-xl transition-colors shadow-md shadow-violet-200 dark:shadow-violet-900/30"
            >
              {mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-xs text-gray-400 dark:text-slate-500 mt-5">
            All participation is fully anonymous. No identity verification required.
          </p>
        </div>
      </div>
      <div className="max-w-sm mx-auto w-full px-4">
        <Footer />
      </div>
    </div>
  )
}
