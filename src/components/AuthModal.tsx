import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, Coins } from 'lucide-react'
import { useStore } from '../store/useStore'

interface AuthModalProps {
  onClose: () => void
  prompt?: string
  promptTitle?: string
  anonNote?: string
}

export const AuthModal = ({ onClose, prompt, promptTitle, anonNote }: AuthModalProps) => {
  const [mode, setMode] = useState<'choose' | 'register' | 'login'>('choose')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const login = useStore(s => s.login)
  const register = useStore(s => s.register)
  const navigate = useNavigate()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (mode === 'login') {
      const ok = login(username, password)
      if (ok) onClose()
      else setError('Invalid username or password.')
    } else {
      const result = register(username, password)
      if (result.ok) onClose()
      else setError(result.error ?? 'Registration failed.')
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-slate-800 rounded-2xl w-full max-w-sm shadow-2xl border border-slate-700">
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <Coins className="w-5 h-5 text-blue-400" />
            <span className="font-semibold text-slate-100">
              {mode === 'choose' ? (promptTitle ?? 'Join to place bets') : mode === 'register' ? 'Create account' : 'Sign in'}
            </span>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5">
          {mode === 'choose' && (
            <>
              {prompt && <p className="text-sm text-slate-400 mb-4">{prompt}</p>}
              <p className="text-sm text-slate-400 mb-5">
                {anonNote ?? <>Create a free anonymous account — no email or identity required. You'll get <span className="font-semibold text-blue-400">100 Coins</span> daily to bet with.</>}
              </p>
              <button
                onClick={() => setMode('register')}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded-xl transition-colors mb-3"
              >
                Create Anonymous Account
              </button>
              <button
                onClick={() => setMode('login')}
                className="w-full bg-slate-700 hover:bg-slate-600 text-slate-200 font-semibold py-3 rounded-xl transition-colors"
              >
                Sign In
              </button>
              <button
                onClick={() => navigate('/login')}
                className="w-full text-center text-xs text-slate-500 mt-3 hover:text-slate-300 transition-colors"
              >
                Full sign-in page →
              </button>
            </>
          )}

          {(mode === 'register' || mode === 'login') && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1.5">Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="anonymous_user"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-colors text-sm"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1.5">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-colors text-sm"
                />
              </div>
              {error && (
                <div className="bg-rose-900/30 border border-rose-800 rounded-xl px-4 py-2.5 text-rose-300 text-sm">
                  {error}
                </div>
              )}
              <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2.5 rounded-xl transition-colors">
                {mode === 'login' ? 'Sign In' : 'Create Account'}
              </button>
              <button type="button" onClick={() => setMode('choose')} className="w-full text-center text-xs text-slate-500 hover:text-slate-300 transition-colors">
                ← Back
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
