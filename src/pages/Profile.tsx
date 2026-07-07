import { Link } from 'react-router-dom'
import { Coins, CheckCircle, XCircle, Clock, TrendingUp, Star } from 'lucide-react'
import { useStore } from '../store/useStore'
import { Layout } from '../components/Layout'
import { formatDate } from '../utils/odds'

export const Profile = () => {
  const currentUser = useStore(s => s.currentUser)
  const bets = useStore(s => s.bets)
  const events = useStore(s => s.events)
  const companies = useStore(s => s.companies)
  const favoriteCompanyIds = useStore(s => s.favoriteCompanyIds)
  const hiddenCompanyIds = useStore(s => s.hiddenCompanyIds)
  const getEffectiveStatus = useStore(s => s.getEffectiveStatus)

  if (!currentUser || !currentUser.username) return null

  // Deduplicate bets: keep only one bet per eventId, and only count bets whose event
  // still exists and isn't on a hidden company — matches what the My Bets page shows.
  const betsMap = new Map<string, typeof bets[0]>()
  bets.forEach(b => {
    if (b.userId === currentUser.id && !betsMap.has(b.eventId)) {
      betsMap.set(b.eventId, b)
    }
  })
  const userBets = Array.from(betsMap.values()).filter(b => {
    const event = events.find(e => e.id === b.eventId)
    return event && !hiddenCompanyIds.includes(event.companyId)
  })
  const betsWithEvents = userBets.map(bet => ({ bet, event: events.find(e => e.id === bet.eventId)! }))

  const resolved = betsWithEvents.filter(({ event }) => getEffectiveStatus(event) === 'resolved' && event.outcome)
  const wins = resolved.filter(({ bet, event }) => bet.side === event.outcome).length
  const losses = resolved.length - wins
  const pending = betsWithEvents.filter(({ event }) => getEffectiveStatus(event) === 'active')
  const totalWagered = userBets.reduce((sum, b) => sum + b.amount, 0)

  return (
    <Layout>
      <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl p-5 mb-5 shadow-sm dark:shadow-none">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-blue-100 dark:bg-blue-700 rounded-2xl flex items-center justify-center text-2xl font-bold text-blue-700 dark:text-white">
            {currentUser.username.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">{currentUser.username}</h1>
            <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-slate-400 mt-0.5">
              <Coins className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span className="font-semibold text-blue-600 dark:text-blue-300">{currentUser.coins.toLocaleString()}</span>
              <span>Coins</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-5">
        {[
          { label: 'Total Bets', value: userBets.length, icon: <TrendingUp className="w-4 h-4" />, color: 'text-gray-600 dark:text-slate-300' },
          { label: 'Total Wagered', value: `${totalWagered}`, icon: <Coins className="w-4 h-4" />, color: 'text-blue-600 dark:text-blue-300' },
          { label: 'Wins', value: wins, icon: <CheckCircle className="w-4 h-4" />, color: 'text-emerald-600 dark:text-emerald-400' },
          { label: 'Losses', value: losses, icon: <XCircle className="w-4 h-4" />, color: 'text-rose-600 dark:text-rose-400' },
        ].map(({ label, value, icon, color }) => (
          <div key={label} className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-4 shadow-sm dark:shadow-none">
            <div className={`flex items-center gap-2 ${color} mb-1`}>{icon}<span className="text-xs text-gray-400 dark:text-slate-400">{label}</span></div>
            <div className={`text-2xl font-bold ${color}`}>{value}</div>
          </div>
        ))}
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 rounded-xl p-4 mb-5 flex items-center gap-3">
        <Coins className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
        <div>
          <div className="text-sm font-medium text-blue-800 dark:text-blue-200">100 Coins every day</div>
          <div className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">Your balance is topped up daily.</div>
        </div>
      </div>

      {favoriteCompanyIds.length > 0 && (
        <section className="mb-5">
          <div className="flex items-center gap-2 mb-3">
            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
            <h2 className="text-sm font-semibold text-gray-700 dark:text-slate-300">My Favorites ({favoriteCompanyIds.length})</h2>
          </div>
          <div className="grid grid-cols-1 gap-2">
            {favoriteCompanyIds.filter(cid => !hiddenCompanyIds.includes(cid)).map(companyId => {
              const company = companies.find(c => c.id === companyId)
              if (!company) return null
              return (
                <Link
                  key={companyId}
                  to={`/company/${company.slug}`}
                  className="block bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-3.5 hover:border-yellow-300 dark:hover:border-yellow-700 hover:shadow-sm transition-all"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="w-10 h-10 rounded-lg flex-shrink-0 flex items-center justify-center text-sm font-bold text-white"
                      style={{ backgroundColor: company.color }}
                    >
                      {company.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 dark:text-white truncate">{company.name}</p>
                      <p className="text-xs text-gray-500 dark:text-slate-400 truncate">{company.industry}</p>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </section>
      )}

      {pending.length > 0 && (
        <section className="mb-5">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-amber-500" />
            <h2 className="text-sm font-semibold text-gray-700 dark:text-slate-300">Active Bets ({pending.length})</h2>
          </div>
          <div className="space-y-2">
            {pending.map(({ bet, event }) => (
              <Link key={bet.id} to={`/event/${event.id}`} className="block bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-3.5 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-sm transition-all">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-400 dark:text-slate-500">{event.companyName}</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${bet.side === 'yes' ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' : 'bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400'}`}>
                    {bet.side.toUpperCase()} · {bet.amount} 🪙
                  </span>
                </div>
                <p className="text-sm text-gray-900 dark:text-white line-clamp-1">{event.title}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {resolved.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-3">Resolved Bets</h2>
          <div className="space-y-2">
            {resolved.map(({ bet, event }) => {
              const won = bet.side === event.outcome
              return (
                <Link key={bet.id} to={`/event/${event.id}`} className="block bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700/50 rounded-xl p-3.5 hover:border-blue-300 dark:hover:border-blue-700 transition-all">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-400 dark:text-slate-500">{formatDate(event.expiresAt)}</span>
                    <span className={`text-xs font-bold flex items-center gap-1 ${won ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                      {won ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                      {won ? 'Won' : 'Lost'} · {bet.amount} 🪙
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-slate-300 line-clamp-1">{event.title}</p>
                </Link>
              )
            })}
          </div>
        </section>
      )}

      {userBets.length === 0 && (
        <div className="text-center py-10">
          <p className="text-gray-400 dark:text-slate-500 text-sm mb-3">You haven't made any bets yet.</p>
          <Link to="/" className="text-blue-600 dark:text-blue-400 hover:underline text-sm">Browse companies →</Link>
        </div>
      )}
    </Layout>
  )
}
