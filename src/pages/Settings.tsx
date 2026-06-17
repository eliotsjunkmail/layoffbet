import { Sun, Moon, ChevronLeft, Shield, Coins, MessageSquare, Check, AlertCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore'
import { Layout } from '../components/Layout'
import { useState, useEffect } from 'react'

export const Settings = () => {
  const navigate = useNavigate()
  const theme = useStore(s => s.theme)
  const setTheme = useStore(s => s.setTheme)
  const currentUser = useStore(s => s.currentUser)
  const updateDisplayName = useStore(s => s.updateDisplayName)
  const [showComments, setShowComments] = useState(() => {
    const stored = localStorage.getItem('showComments')
    return stored ? JSON.parse(stored) : true
  })
  const [displayNameInput, setDisplayNameInput] = useState(currentUser?.displayName || '')
  const [isEditingDisplayName, setIsEditingDisplayName] = useState(false)
  const [isLoadingDisplayName, setIsLoadingDisplayName] = useState(false)
  const [displayNameError, setDisplayNameError] = useState('')
  const [displayNameSuccess, setDisplayNameSuccess] = useState(false)

  useEffect(() => {
    localStorage.setItem('showComments', JSON.stringify(showComments))
  }, [showComments])

  useEffect(() => {
    if (currentUser?.displayName) {
      setDisplayNameInput(currentUser.displayName)
    }
  }, [currentUser?.displayName])

  const handleUpdateDisplayName = async () => {
    if (!displayNameInput.trim()) {
      setDisplayNameError('Display name cannot be empty')
      return
    }

    if (displayNameInput === currentUser?.displayName) {
      setIsEditingDisplayName(false)
      return
    }

    setIsLoadingDisplayName(true)
    setDisplayNameError('')
    setDisplayNameSuccess(false)

    try {
      await updateDisplayName(displayNameInput.trim())
      setDisplayNameSuccess(true)
      setIsEditingDisplayName(false)
      setTimeout(() => setDisplayNameSuccess(false), 3000)
    } catch (error) {
      setDisplayNameError('Failed to update display name')
      console.error(error)
    } finally {
      setIsLoadingDisplayName(false)
    }
  }

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
              className={`relative w-14 h-7 rounded-full transition-colors ${theme === 'dark' ? 'bg-blue-600' : 'bg-gray-200 dark:bg-slate-600'}`}
            >
              <span className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow-sm transition-transform flex items-center justify-center ${theme === 'dark' ? 'translate-x-8' : 'translate-x-1'}`}>
                {theme === 'dark'
                  ? <Moon className="w-3 h-3 text-blue-600" />
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
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-medium transition-all ${theme === 'dark' ? 'bg-blue-900/30 border-blue-600 text-blue-300' : 'bg-gray-50 dark:bg-slate-700 border-gray-200 dark:border-slate-600 text-gray-500 dark:text-slate-400 hover:border-gray-300'}`}
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
              className={`relative w-14 h-7 rounded-full transition-colors ${showComments ? 'bg-blue-600' : 'bg-gray-200 dark:bg-slate-600'}`}
            >
              <span className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow-sm transition-transform flex items-center justify-center text-xs font-bold ${showComments ? 'translate-x-8 text-blue-600' : 'translate-x-1 text-gray-400'}`}>
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
            <div className="px-5 py-4">
              <div className="mb-2">
                <label className="text-sm text-gray-500 dark:text-slate-400 block mb-2">Display Name</label>
                {isEditingDisplayName ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={displayNameInput}
                      onChange={e => setDisplayNameInput(e.target.value)}
                      placeholder="Enter your display name"
                      className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {displayNameError && (
                      <div className="flex items-center gap-2 text-xs text-red-600 dark:text-red-400">
                        <AlertCircle className="w-3 h-3" />
                        {displayNameError}
                      </div>
                    )}
                    <div className="flex gap-2">
                      <button
                        onClick={handleUpdateDisplayName}
                        disabled={isLoadingDisplayName}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium rounded-lg transition-colors"
                      >
                        <Check className="w-4 h-4" />
                        {isLoadingDisplayName ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        onClick={() => {
                          setIsEditingDisplayName(false)
                          setDisplayNameInput(currentUser.displayName || '')
                          setDisplayNameError('')
                        }}
                        className="flex-1 px-3 py-2 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-900 dark:text-white text-sm font-medium rounded-lg transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {currentUser.displayName || currentUser.username}
                    </div>
                    <button
                      onClick={() => setIsEditingDisplayName(true)}
                      className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                    >
                      Edit
                    </button>
                  </div>
                )}
                {displayNameSuccess && (
                  <div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400 mt-2">
                    <Check className="w-3 h-3" />
                    Display name updated
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between px-5 py-4">
              <div className="text-sm text-gray-500 dark:text-slate-400">Daily Coins</div>
              <div className="flex items-center gap-1 text-sm font-medium text-blue-600 dark:text-blue-400">
                <Coins className="w-4 h-4" /> 100 / day
              </div>
            </div>
            <div className="flex items-center justify-between px-5 py-4">
              <div className="text-sm text-gray-500 dark:text-slate-400">Current Balance</div>
              <div className="flex items-center gap-1 text-sm font-semibold text-gray-900 dark:text-white">
                <Coins className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                {currentUser.coins.toLocaleString()}
              </div>
            </div>
            {currentUser.isAdmin && (
              <div className="flex items-center justify-between px-5 py-4">
                <div className="text-sm text-gray-500 dark:text-slate-400">Role</div>
                <div className="flex items-center gap-1.5 text-sm font-medium text-blue-600 dark:text-blue-400">
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
            <div className="text-sm text-gray-900 dark:text-white">0.98</div>
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
