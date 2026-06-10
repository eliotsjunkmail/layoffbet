import { useState } from 'react'
import { Link } from 'react-router-dom'
import { TrendingUp, Clock, Star, PlusCircle, ChevronDown } from 'lucide-react'
import { useStore } from '../store/useStore'
import { Layout } from '../components/Layout'
import { getProbability, timeUntil } from '../utils/odds'

export const Feed = () => {
  const currentUser = useStore(s => s.currentUser)
  const events = useStore(s => s.events)
  const bets = useStore(s => s.bets)
  const companies = useStore(s => s.companies)
  const getEffectiveStatus = useStore(s => s.getEffectiveStatus)
  const onboardingCompanyId = useStore(s => s.onboardingCompanyId)
  const favoriteCompanyIds = useStore(s => s.favoriteCompanyIds)
  const setOnboardingCompany = useStore(s => s.setOnboardingCompany)

  const [tab, setTab] = useState<'trending' | 'recent'>('trending')
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false)
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(onboardingCompanyId)

  const activeEvents = events.filter(e => getEffectiveStatus(e) === 'active')

  const filtered = activeEvents.filter(e => {
    if (showFavoritesOnly && favoriteCompanyIds.length > 0) {
      return favoriteCompanyIds.includes(e.companyId)
    }
    if (selectedCompanyId) return e.companyId === selectedCompanyId
    return true
  })

  const sorted = tab === 'trending'
    ? [...filtered].sort((a, b) => (b.yesPool + b.noPool) - (a.yesPool + a.noPool))
    : [...filtered].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  const selectedCompany = companies.find(c => c.id === selectedCompanyId)

  return (
    <Layout>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="relative">
            <select
              value={selectedCompanyId ?? ''}
              onChange={e => {
                const val = e.target.value || null
                setSelectedCompanyId(val)
                setShowFavoritesOnly(false)
                if (val) setOnboardingCompany(val)
              }}
              className="appearance-none bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-full pl-3 pr-7 py-1.5 text-sm font-medium text-gray-900 dark:text-white focus:outline-none focus:border-blue-500 cursor-pointer shadow-sm"
            >
              <option value="">All Companies</option>
              {[...companies].sort((a, b) => a.name.localeCompare(b.name)).map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
          </div>
          {favoriteCompanyIds.length > 0 && (
            <button
              onClick={() => { setShowFavoritesOnly(!showFavoritesOnly); setSelectedCompanyId(null) }}
              className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${showFavoritesOnly ? 'bg-amber-400 text-white' : 'bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-500 dark:text-slate-400 shadow-sm'}`}
            >
              <Star className={`w-3 h-3 ${showFavoritesOnly ? 'fill-white' : ''}`} />
              Favorites
            </button>
          )}
        </div>
        <Link to="/create" className="flex items-center gap-1 text-xs bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-full font-medium transition-colors">
          <PlusCircle className="w-3.5 h-3.5" /> New
        </Link>
      </div>

      {selectedCompany && !showFavoritesOnly && (
        <div className="text-xs text-gray-400 dark:text-slate-500 mb-3">
          Showing predictions for <span className="font-medium text-gray-700 dark:text-slate-300">{selectedCompany.name}</span>
          <button onClick={() => setSelectedCompanyId(null)} className="ml-1.5 text-blue-600 dark:text-blue-400 hover:underline">clear</button>
        </div>
      )}

      <div className="flex bg-gray-100 dark:bg-slate-800/60 rounded-xl p-1 mb-5 gap-1">
        {([['trending', <TrendingUp key="t" className="w-3.5 h-3.5" />, 'Trending'], ['recent', <Clock key="c" className="w-3.5 h-3.5" />, 'Recent']] as const).map(([t, icon, label]) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-lg transition-all ${tab === t ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow' : 'text-gray-400 dark:text-slate-400 hover:text-gray-600 dark:hover:text-slate-200'}`}
          >
            {icon}{label}
          </button>
        ))}
      </div>

      {sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="text-5xl mb-4">🔍</div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No predictions here</h3>
          <p className="text-gray-400 dark:text-slate-400 text-sm mb-6">
            {showFavoritesOnly ? 'No active predictions for your favorite companies.' : 'No active predictions for this company yet.'}
          </p>
          <Link to="/create" className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl font-medium transition-colors text-sm">
            <PlusCircle className="w-4 h-4" /> Create a Prediction
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map(event => {
            const prob = getProbability(event.yesPool, event.noPool)
            const userBet = bets.find(b => b.eventId === event.id && b.userId === currentUser?.id && !b.id.startsWith('pending-'))
            return (
              <Link key={event.id} to={`/event/${event.id}`} className="block bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-4 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-sm transition-all">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-gray-400 dark:text-slate-500">{event.companyName}</span>
                  {userBet ? (
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${userBet.side === 'yes' ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' : 'bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400'}`}>
                      Bet {userBet.side.toUpperCase()}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-300 dark:text-slate-600">{timeUntil(event.expiresAt)}</span>
                  )}
                </div>
                <p className="text-sm text-gray-900 dark:text-white font-medium leading-snug mb-3 line-clamp-2">{event.title}</p>
                <div className="h-1.5 rounded-full bg-gray-100 dark:bg-slate-700 overflow-hidden mb-1.5">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${prob.yes}%` }} />
                </div>
                <div className="flex justify-between text-xs text-gray-400 dark:text-slate-500">
                  <span className="text-emerald-600 dark:text-emerald-400">YES {prob.yes}%</span>
                  <span>{event.yesPool + event.noPool} wagered</span>
                  <span className="text-rose-600 dark:text-rose-400">NO {prob.no}%</span>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </Layout>
  )
}
