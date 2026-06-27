import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Search, User, Shield, LogOut, Settings, ChevronDown, Coins, X, MessageSquare, Trash2 } from 'lucide-react'
import { useStore } from '../store/useStore'
import { APP_VERSION } from '../constants'

const deleteSession = (onClose: () => void) => {
  onClose()
  useStore.setState({ currentUser: null })
  localStorage.removeItem('layoff-bets-currentUser')
  localStorage.removeItem('lb-anon-user-id')
  window.location.href = '/'
}

const ProfileSheet = ({ onClose }: { onClose: () => void }) => {
  const currentUser = useStore(s => s.currentUser)
  const logout = useStore(s => s.logout)
  const navigate = useNavigate()
  const isAnon = currentUser?.isAnonymous || currentUser?.username?.match(/^Anon\d+$/)

  const handleLogout = () => {
    logout()
    onClose()
    localStorage.removeItem('lb-gate-v2')
    window.location.href = '/'
  }

  const handleDeleteSession = () => {
    if (!window.confirm('Delete your anonymous session? You will return to the gate and lose your anonymous account.')) return
    deleteSession(onClose)
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
              <button onClick={handleDeleteSession} className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors text-left">
                <Trash2 className="w-5 h-5 text-rose-500 dark:text-rose-400" />
                <span className="text-sm font-medium text-rose-600 dark:text-rose-400">Delete session</span>
              </button>
            )}
          </div>

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
  const handleDeleteSession = () => {
    if (!window.confirm('Delete your session? You will return to the gate.')) return
    deleteSession(onClose)
  }

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
            <button onClick={handleDeleteSession} className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors text-left">
              <Trash2 className="w-5 h-5 text-rose-500 dark:text-rose-400" />
              <span className="text-sm font-medium text-rose-600 dark:text-rose-400">Delete session</span>
            </button>
          </div>

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
  const companies = useStore(s => s.companies)
  const favoriteCompanyIds = useStore(s => s.favoriteCompanyIds)
  const companyLastVisit = useStore(s => s.companyLastVisit)

  const location = useLocation()
  const navigate = useNavigate()
  const [showProfile, setShowProfile] = useState(false)

  const isAnon = currentUser?.isAnonymous || currentUser?.username?.match(/^Anon\d+$/)
  const isLoggedIn = !!currentUser && !isAnon

  const pathSlug = location.pathname.replace(/^\//, '').split('/')[0]
  const currentCompany = companies.find(c => c.slug === pathSlug)

  const getCreateCompanyId = () => {
    if (currentCompany) return currentCompany.id
    if (favoriteCompanyIds.length > 0) return favoriteCompanyIds[0]
    const lastVisited = Object.entries(companyLastVisit)
      .sort((a, b) => new Date(b[1]).getTime() - new Date(a[1]).getTime())[0]
    return lastVisited?.[0]
  }

  const isActive = (path: string) =>
    location.pathname === path
      ? 'text-blue-600 dark:text-blue-400'
      : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200'

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-950/95 backdrop-blur border-b border-gray-200 dark:border-slate-800">
        <div className="max-w-md sm:max-w-5xl mx-auto w-full px-4 sm:px-8 flex items-center justify-between h-14">
          <Link to="/" className="flex items-center gap-2 flex-shrink-0">
            <div className="flex items-baseline gap-0.5">
              <span className="font-semibold text-gray-600 dark:text-slate-300 text-sm tracking-tight">Layoff</span>
              <span className="font-black text-blue-600 dark:text-blue-400 text-sm tracking-tight">Live</span>
              <span className="text-xs text-gray-400 dark:text-slate-500 ml-2">{APP_VERSION}</span>
            </div>
          </Link>

          <nav className="flex items-center gap-1">
            <Link to="/search" className={`p-1.5 sm:p-2 rounded-lg transition-colors ${isActive('/search')}`}>
              <Search className="w-4 sm:w-5 h-4 sm:h-5" />
            </Link>
            <button
              onClick={() => navigate('/create', { state: { companyId: getCreateCompanyId() } })}
              className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-full font-medium text-xs sm:text-sm border-2 transition-colors ${
                isActive('/create').includes('violet')
                  ? 'border-blue-600 dark:border-blue-400 text-blue-600 dark:text-blue-400'
                  : 'border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-300 hover:border-gray-400 dark:hover:border-slate-500'
              }`}
            >
              + Bet
            </button>
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
