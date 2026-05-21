import { Sun, Moon, ChevronLeft, Shield, Coins, MessageSquare } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore'
import { Layout } from '../components/Layout'
import { useState, useEffect } from 'react'

export const Settings = () => {
  const navigate = useNavigate()
  const theme = useStore(s => s.theme)
  const setTheme = useStore(s => s.setTheme)
  const currentUser = useStore(s => s.currentUser)
  const [showComments, setShowComments] = useState(() => {
    const stored = localStorage.getItem('showComments')
    return stored ? JSON.parse(stored) : true
  })

  useEffect(() => {
    localStorage.setItem('showComments', JSON.stringify(showComments))
  }, [showComments])

  return (
    <Layout>
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-gray-400 dark:text-slate-400 hover:text-gray-600 dark:hover:text-slate-200 transition-colors mb-5 text-sm">
        <ChevronLeft className="w-4 h-4" /> Back
      </button>

      <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Settings</h1>

      {/* Appearance */}
      <section className="mb-6">
        <h2 className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-3">Appearance</h2>
        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4">
            <div>
              <div className="text-sm font-medium text-gray-900 dark:text-white">Theme</div>
              <div className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                {theme === 'light' ? 'Light mode' : 'Dark mode'} — tap to switch
              </div>
            </div>
            <button
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              className={`relative w-14 h-7 rounded-full transition-colors ${theme === 'dark' ? 'bg-violet-600' : 'bg-gray-200 dark:bg-slate-600'}`}
            >
              <span className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow-sm transition-transform flex items-center justify-center ${theme === 'dark' ? 'translate-x-8' : 'translate-x-1'}`}>
                {theme === 'dark'
                  ? <Moon className="w-3 h-3 text-violet-600" />
                  : <Sun className="w-3 h-3 text-amber-500" />
                }
              </span>
            </button>
          </div>
          <div className="px-5 pb-4">
            <div className="flex gap-3">
              <button
                onClick={() => setTheme('light')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-medium transition-all ${theme === 'light' ? 'bg-amber-50 border-amber-300 text-amber-700' : 'bg-gray-50 dark:bg-slate-700 border-gray-200 dark:border-slate-600 text-gray-500 dark:text-slate-400 hover:border-gray-300'}`}
              >
                <Sun className="w-4 h-4" /> Light
              </button>
              <button
                onClick={() => setTheme('dark')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-medium transition-all ${theme === 'dark' ? 'bg-violet-900/30 border-violet-600 text-violet-300' : 'bg-gray-50 dark:bg-slate-700 border-gray-200 dark:border-slate-600 text-gray-500 dark:text-slate-400 hover:border-gray-300'}`}
              >
                <Moon className="w-4 h-4" /> Dark
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Preferences */}
      <section className="mb-6">
        <h2 className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-3">Preferences</h2>
        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4">
            <div className="flex items-center gap-3">
              <MessageSquare className="w-5 h-5 text-gray-400 dark:text-slate-500 flex-shrink-0" />
              <div>
                <div className="text-sm font-medium text-gray-900 dark:text-white">Show Comments</div>
                <div className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">Display comments on predictions</div>
              </div>
            </div>
            <button
              onClick={() => setShowComments(!showComments)}
              className={`relative w-14 h-7 rounded-full transition-colors ${showComments ? 'bg-violet-600' : 'bg-gray-200 dark:bg-slate-600'}`}
            >
              <span className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow-sm transition-transform flex items-center justify-center text-xs font-bold ${showComments ? 'translate-x-8 text-violet-600' : 'translate-x-1 text-gray-400'}`}>
                {showComments ? '✓' : '✕'}
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* Account */}
      {currentUser && (
        <section className="mb-6">
          <h2 className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-3">Account</h2>
          <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl divide-y divide-gray-100 dark:divide-slate-700">
            <div className="flex items-center justify-between px-5 py-4">
              <div className="text-sm text-gray-500 dark:text-slate-400">Username</div>
              <div className="text-sm font-medium text-gray-900 dark:text-white">{currentUser.username}</div>
            </div>
            <div className="flex items-center justify-between px-5 py-4">
              <div className="text-sm text-gray-500 dark:text-slate-400">Daily Coins</div>
              <div className="flex items-center gap-1 text-sm font-medium text-violet-600 dark:text-violet-400">
                <Coins className="w-4 h-4" /> 100 / day
              </div>
            </div>
            <div className="flex items-center justify-between px-5 py-4">
              <div className="text-sm text-gray-500 dark:text-slate-400">Current Balance</div>
              <div className="flex items-center gap-1 text-sm font-semibold text-gray-900 dark:text-white">
                <Coins className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                {currentUser.coins.toLocaleString()}
              </div>
            </div>
            {currentUser.isAdmin && (
              <div className="flex items-center justify-between px-5 py-4">
                <div className="text-sm text-gray-500 dark:text-slate-400">Role</div>
                <div className="flex items-center gap-1.5 text-sm font-medium text-violet-600 dark:text-violet-400">
                  <Shield className="w-4 h-4" /> Administrator
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* About */}
      <section>
        <h2 className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-3">About</h2>
        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl divide-y divide-gray-100 dark:divide-slate-700">
          <div className="flex items-center justify-between px-5 py-4">
            <div className="text-sm text-gray-500 dark:text-slate-400">Version</div>
            <div className="text-sm text-gray-900 dark:text-white">1.0.0</div>
          </div>
          <div className="flex items-center justify-between px-5 py-4">
            <div className="text-sm text-gray-500 dark:text-slate-400">Data stored</div>
            <div className="text-sm text-gray-900 dark:text-white">Locally in browser</div>
          </div>
        </div>
      </section>
    </Layout>
  )
}
