import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle, Clock, Building2, TrendingUp } from 'lucide-react'
import { useStore } from '../store/useStore'
import { Layout } from '../components/Layout'
import { getProbability, timeUntil, formatDate } from '../utils/odds'

export const Bets = () => {
  const currentUser = useStore(s => s.currentUser)
  const bets = useStore(s => s.bets)
  const events = useStore(s => s.events)
  const companies = useStore(s => s.companies)
  const getEffectiveStatus = useStore(s => s.getEffectiveStatus)
  const [tab, setTab] = useState<'active' | 'completed'>('active')

  const myBets = bets.filter(b => b.userId === currentUser?.id)

  const betsWithEvents = myBets
    .map(bet => {
      const event = events.find(e => e.id === bet.eventId)
      if (!event) return null
      const status = getEffectiveStatus(event)
      return { bet, event, status }
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)

  const activeBets = betsWithEvents
    .filter(b => b.status === 'active')
    .sort((a, b) => new Date(b.bet.createdAt).getTime() - new Date(a.bet.createdAt).getTime())

  const completedBets = betsWithEvents
    .filter(b => b.status !== 'active')
    .sort((a, b) => new Date(b.bet.createdAt).getTime() - new Date(a.bet.createdAt).getTime())

  const shown = tab === 'active' ? activeBets : completedBets

  return (
    <Layout>
      <h1 className="text-lg font-bold text-gray-900 dark:text-white mb-4">My Bets</h1>

      <div className="flex bg-gray-100 dark:bg-slate-800/60 rounded-xl p-1 mb-5 gap-1">
        {([
          { id: 'active' as const, label: 'Active', count: activeBets.length },
          { id: 'completed' as const, label: 'Completed', count: completedBets.length },
        ]).map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-lg transition-all ${tab === t.id ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow' : 'text-gray-400 dark:text-slate-400 hover:text-gray-600 dark:hover:text-slate-200'}`}
          >
            {t.label}
            {t.count > 0 && (
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${tab === t.id ? 'bg-violet-100 dark:bg-violet-900/50 text-violet-600 dark:text-violet-400' : 'bg-gray-200 dark:bg-slate-700 text-gray-500 dark:text-slate-400'}`}>{t.count}</span>
            )}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-4xl mb-3">{tab === 'active' ? '🎲' : '📋'}</div>
          <p className="text-gray-500 dark:text-slate-400 text-sm mb-3">
            {tab === 'active' ? 'No active bets yet.' : 'No completed bets yet.'}
          </p>
          {tab === 'active' && (
            <Link to="/" className="text-violet-600 dark:text-violet-400 text-sm hover:underline">Browse predictions →</Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {shown.map(({ bet, event, status }) => {
            const prob = getProbability(event.yesPool, event.noPool)
            const won = status === 'resolved' && event.outcome === bet.side
            const lost = status === 'resolved' && event.outcome !== null && event.outcome !== bet.side
            const company = companies.find(c => c.id === event.companyId)

            return (
              <Link key={bet.id} to={`/event/${event.id}`} className="block bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-4 hover:border-violet-300 dark:hover:border-violet-700 hover:shadow-sm transition-all">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="flex items-center gap-1 text-xs text-gray-400 dark:text-slate-500">
                    <Building2 className="w-3 h-3" /> {event.companyName}
                  </span>
                  <span className="flex items-center gap-1 text-xs">
                    {won && <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-0.5"><CheckCircle className="w-3 h-3" /> Won</span>}
                    {lost && <span className="text-rose-500 dark:text-rose-400 font-semibold">Lost</span>}
                    {status === 'expired' && <span className="text-amber-600 dark:text-amber-400">Expired</span>}
                    {status === 'active' && <span className="text-gray-400 dark:text-slate-500 flex items-center gap-0.5"><Clock className="w-3 h-3" /> {timeUntil(event.expiresAt)}</span>}
                  </span>
                </div>
                <p className="text-sm font-medium text-gray-900 dark:text-white leading-snug mb-3 line-clamp-2">{event.title}</p>
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0 ${bet.side === 'yes' ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800' : 'bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800'}`}>
                    {bet.side === 'yes' ? '✓ YES' : '✕ NO'} · {bet.amount} coins
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="h-1.5 rounded-full bg-gray-100 dark:bg-slate-700 overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${prob.yes}%` }} />
                    </div>
                    <div className="flex justify-between text-[10px] text-gray-400 dark:text-slate-600 mt-0.5">
                      <span>YES {prob.yes}%</span>
                      <span>NO {prob.no}%</span>
                    </div>
                  </div>
                </div>
                {status === 'resolved' && event.outcome && (
                  <div className={`mt-2.5 text-xs text-center font-medium py-1.5 rounded-lg ${won ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400' : 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400'}`}>
                    Resolved {event.outcome.toUpperCase()} {won ? '— you won! 🎉' : '— better luck next time'}
                  </div>
                )}
              </Link>
            )
          })}
        </div>
      )}
    </Layout>
  )
}
