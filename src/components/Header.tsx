import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Search, User, Shield, LogOut, Settings, ChevronDown, Coins, X, MessageSquare, Trash2, AlertTriangle } from 'lucide-react'
import { useStore } from '../store/useStore'
import { APP_VERSION } from '../constants'

const deleteSession = (onClose: () => void) => {
  onClose()
  useStore.setState({ currentUser: null })
  localStorage.removeItem('layoff-bets-currentUser')
  localStorage.removeItem('lb-anon-user-id')
  window.location.href = '/'
}

const DeleteSessionConfirm = ({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) => (
  <div className="fixed inset-0 z-[70] bg-black/50 flex items-center justify-center p-4" onClick={onCancel}>
    <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-sm shadow-2xl p-5" onClick={e => e.stopPropagation()}>
      <div className="flex items-start gap-3 mb-5">
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-1">Delete session?</h2>
          <p className="text-sm text-gray-500 dark:text-slate-400">You'll lose the ability to view your bets.</p>
        </div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={onCancel}
          className="flex-1 py-2.5 rounded-xl bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300 text-sm font-medium transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-sm font-medium transition-colors"
        >
          Delete
        </button>
      </div>
    </div>
  </div>
)

const ProfileSheet = ({ onClose }: { onClose: () => void }) => {
  const currentUser = useStore(s => s.currentUser)
  const logout = useStore(s => s.logout)
  const navigate = useNavigate()
  const isAnon = currentUser?.isAnonymous || currentUser?.username?.match(/^Anon\d+$/)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const handleLogout = () => {
    logout()
    onClose()
    localStorage.removeItem('lb-gate-v2')
    window.location.href = '/'
  }

  const go = (path: string) => { navigate(path); onClose() }

  return (
    <>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-[60] bg-white dark:bg-slate-900 rounded-t-2xl shadow-2xl border-t border-gray-200 dark:border-slate-800 animate-in slide-in-from-bottom duration-200">
        <div className="max-w-2xl mx-auto px-4 py-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="font-semibold text-gray-900 dark:text-white">{currentUser?.username}</div>
              <div className="flex items-center gap-1 mt-0.5">
                <Coins className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span className="text-sm font-medium text-blue-600 dark:text-blue-300">{currentUser?.coins.toLocaleString()}</span>
                <span className="text-sm text-gray-400 dark:text-slate-500">Coins</span>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-1 mb-4">
            {!isAnon && (
              <>
                <button onClick={() => go('/profile')} className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors text-left">
                  <User className="w-5 h-5 text-gray-500 dark:text-slate-400" />
                  <span className="text-sm font-medium text-gray-900 dark:text-white">My Profile</span>
                </button>
                <button onClick={() => go('/settings')} className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors text-left">
                  <Settings className="w-5 h-5 text-gray-500 dark:text-slate-400" />
                  <span className="text-sm font-medium text-gray-900 dark:text-white">Settings</span>
                </button>
              </>
            )}
            {currentUser?.isAdmin && (
              <>
                <button onClick={() => go('/feedback-admin')} className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors text-left">
                  <MessageSquare className="w-5 h-5 text-blue-500 dark:text-blue-400" />
                  <span className="text-sm font-medium text-gray-900 dark:text-white">Feedback</span>
                </button>
                <button onClick={() => go('/admin')} className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors text-left">
                  <Shield className="w-5 h-5 text-blue-500 dark:text-blue-400" />
                  <span className="text-sm font-medium text-gray-900 dark:text-white">Admin Panel</span>
                </button>
              </>
            )}
            {isAnon && (
              <button onClick={() => setShowDeleteConfirm(true)} className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors text-left">
                <Trash2 className="w-5 h-5 text-rose-500 dark:text-rose-400" />
                <span className="text-sm font-medium text-rose-600 dark:text-rose-400">Delete session</span>
              </button>
            )}
          </div>

          {showDeleteConfirm && (
            <DeleteSessionConfirm
              onConfirm={() => deleteSession(onClose)}
              onCancel={() => setShowDeleteConfirm(false)}
            />
          )}

          {isAnon ? (
            <Link
              to="/login"
              onClick={onClose}
              className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl transition-colors text-sm font-medium text-white"
            >
              <User className="w-4 h-4" />
              Create account / Sign in
            </Link>
          ) : (
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 py-3 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-xl transition-colors text-sm font-medium text-gray-700 dark:text-slate-300"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          )}
        </div>
        <div className="h-safe-area-inset-bottom" />
      </div>
    </>
  )
}

const GuestSheet = ({ onClose }: { onClose: () => void }) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  return (
    <>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-[60] bg-white dark:bg-slate-900 rounded-t-2xl shadow-2xl border-t border-gray-200 dark:border-slate-800 animate-in slide-in-from-bottom duration-200">
        <div className="max-w-2xl mx-auto px-4 py-5">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm font-semibold text-gray-900 dark:text-white">Guest</div>
            <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-1 mb-4">
            <button onClick={() => setShowDeleteConfirm(true)} className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors text-left">
              <Trash2 className="w-5 h-5 text-rose-500 dark:text-rose-400" />
              <span className="text-sm font-medium text-rose-600 dark:text-rose-400">Delete session</span>
            </button>
          </div>

          {showDeleteConfirm && (
            <DeleteSessionConfirm
              onConfirm={() => deleteSession(onClose)}
              onCancel={() => setShowDeleteConfirm(false)}
            />
          )}

          <Link
            to="/login"
            onClick={onClose}
            className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl transition-colors text-sm font-medium text-white"
          >
            <User className="w-4 h-4" />
            Sign In
          </Link>
        </div>
        <div className="h-safe-area-inset-bottom" />
      </div>
    </>
  )
}

export const Header = () => {
  const currentUser = useStore(s => s.currentUser)

  const location = useLocation()
  const [showProfile, setShowProfile] = useState(false)

  const isAnon = currentUser?.isAnonymous || currentUser?.username?.match(/^Anon\d+$/)
  const isLoggedIn = !!currentUser && !isAnon

  const isActive = (path: string) =>
    location.pathname === path
      ? 'text-blue-600 dark:text-blue-400'
      : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200'

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-950/95 backdrop-blur border-b border-gray-200 dark:border-slate-800">
        <div className="max-w-md sm:max-w-5xl mx-auto w-full px-4 sm:px-8 flex items-center justify-between h-14">
          <Link to="/" className="flex items-center gap-1.5 flex-shrink-0">
            <div className="relative w-7 h-7 flex-shrink-0">
              <MessageSquare className="absolute left-0 top-0 w-5 h-5 text-gray-500 dark:text-slate-400" strokeWidth={2.5} />
              <span className="absolute right-0 bottom-0 bg-white dark:bg-slate-950 rounded-full p-0.5 flex">
                <MessageSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" strokeWidth={2.5} />
              </span>
            </div>
            <div className="flex items-baseline gap-0.5">
              <span className="font-semibold text-gray-600 dark:text-slate-300 text-[1.75rem] tracking-tight">Layoff</span>
              <span className="font-black text-blue-600 dark:text-blue-400 text-[1.75rem] tracking-tight">Live</span>
              <span className="text-xs text-gray-400 dark:text-slate-500 ml-2">{APP_VERSION}</span>
            </div>
          </Link>

          <nav className="flex items-center gap-1">
            <Link to="/search" className={`p-1.5 sm:p-2 rounded-lg transition-colors ${isActive('/search')}`}>
              <Search className="w-4 sm:w-5 h-4 sm:h-5" />
            </Link>
            {isLoggedIn ? (
              <button
                onClick={() => setShowProfile(true)}
                className="flex items-center gap-0.5 sm:gap-1 ml-0.5 sm:ml-1 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-full px-2 sm:px-3 py-1 sm:py-1.5 transition-colors"
              >
                <User className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-gray-700 dark:text-slate-200" />
                <ChevronDown className="w-3 sm:w-3.5 h-3 sm:h-3.5 text-gray-400 dark:text-slate-500" />
              </button>
            ) : isAnon ? (
              <button
                onClick={() => setShowProfile(true)}
                className="flex items-center gap-0.5 sm:gap-1 ml-0.5 sm:ml-1 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-full px-2 sm:px-3 py-1 sm:py-1.5 transition-colors"
              >
                <User className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-gray-700 dark:text-slate-200" />
                <ChevronDown className="w-3 sm:w-3.5 h-3 sm:h-3.5 text-gray-400 dark:text-slate-500" />
              </button>
            ) : (
              <>
                <button
                  onClick={() => setShowProfile(true)}
                  className="flex items-center gap-0.5 sm:gap-1 ml-0.5 sm:ml-1 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-full px-2 sm:px-3 py-1 sm:py-1.5 transition-colors"
                >
                  <User className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-gray-700 dark:text-slate-200" />
                  <ChevronDown className="w-3 sm:w-3.5 h-3 sm:h-3.5 text-gray-400 dark:text-slate-500" />
                </button>
              </>
            )}
          </nav>
        </div>
      </header>

      {showProfile && currentUser && <ProfileSheet onClose={() => setShowProfile(false)} />}
      {showProfile && !currentUser && <GuestSheet onClose={() => setShowProfile(false)} />}
    </>
  )
}
