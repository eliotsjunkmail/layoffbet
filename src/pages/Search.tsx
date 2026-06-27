import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Search as SearchIcon, Eye } from 'lucide-react'
import { useStore } from '../store/useStore'
import { Layout } from '../components/Layout'
import { CompanyLogo } from '../components/CompanyLogo'
import { getProbability } from '../utils/odds'

const fmtViews = (n: number) => {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}K`
  return String(n)
}

export const Search = () => {
  const companies = useStore(s => s.companies)
  const events = useStore(s => s.events)
  const hiddenCompanyIds = useStore(s => s.hiddenCompanyIds)
  const getEffectiveStatus = useStore(s => s.getEffectiveStatus)
  const [query, setQuery] = useState('')

  const q = query.toLowerCase().trim()

  const sentimentByCompany = useMemo(() => {
    const map: Record<string, number> = {}
    const pools: Record<string, { yes: number; no: number }> = {}
    events.forEach(e => {
      if (getEffectiveStatus(e) !== 'active') return
      if (!pools[e.companyId]) pools[e.companyId] = { yes: 0, no: 0 }
      pools[e.companyId].yes += e.yesPool
      pools[e.companyId].no += e.noPool
    })
    Object.entries(pools).forEach(([id, { yes, no }]) => {
      map[id] = Math.round((yes / (yes + no)) * 100)
    })
    return map
  }, [events, getEffectiveStatus])

  const matchedCompanies = q
    ? companies.filter(c =>
        !hiddenCompanyIds.includes(c.id) && (
          c.name.toLowerCase().includes(q) ||
          c.industry.toLowerCase().includes(q) ||
          c.aliases?.some(alias => alias.toLowerCase().includes(q))
        )
      )
    : companies.filter(c => !hiddenCompanyIds.includes(c.id)).sort((a, b) => b.viewCount - a.viewCount)

  const matchedEvents = q
    ? events.filter(e => !hiddenCompanyIds.includes(e.companyId) && (e.title.toLowerCase().includes(q) || e.companyName.toLowerCase().includes(q)))
    : events.filter(e => !hiddenCompanyIds.includes(e.companyId) && getEffectiveStatus(e) === 'active')

  return (
    <Layout>
      <h1 className="text-xl font-bold text-slate-100 mb-4">Search</h1>

      <div className="relative mb-6">
        <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search companies or events..."
          className="w-full bg-slate-800 border border-slate-700 rounded-md pl-10 pr-4 py-3 text-slate-100 placeholder-slate-600 font-mono focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all"
          autoFocus
        />
      </div>

      <section className="mb-6">
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider font-mono mb-3">Companies</h2>
        <div className="space-y-2">
          {matchedCompanies.slice(0, 8).map(c => {
            const companyEvents = events.filter(e => e.companyId === c.id && getEffectiveStatus(e) === 'active')
            return (
              <Link key={c.id} to={`/${c.slug}`} className="flex items-center gap-3 bg-slate-800 border border-slate-700 rounded-xl p-3.5 hover:border-blue-700 transition-all">
                <CompanyLogo name={c.name} id={c.id} industry={c.industry} color={c.color} sentiment={sentimentByCompany[c.id]} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-100">{c.name}</div>
                  <div className="flex items-center gap-2 text-xs text-slate-500 font-mono mt-0.5">
                    <span>{c.industry}</span>
                    <span className="flex items-center gap-0.5"><Eye className="w-3 h-3" />{fmtViews(c.viewCount)}</span>
                    {companyEvents.length > 0 && <span className="text-blue-400">{companyEvents.length} active</span>}
                  </div>
                </div>
              </Link>
            )
          })}
          {matchedCompanies.length === 0 && <p className="text-slate-500 text-sm">No companies found.</p>}
        </div>
      </section>

      <section>
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider font-mono mb-3">
          {q ? 'Matching Predictions' : 'Active Predictions'}
        </h2>
        <div className="space-y-3">
          {matchedEvents.slice(0, 15).map(event => {
            const prob = getProbability(event.yesPool, event.noPool)
            const status = getEffectiveStatus(event)
            return (
              <Link key={event.id} to={`/event/${event.id}`} className="block bg-slate-800 border border-slate-700 rounded-xl p-4 hover:border-blue-700 transition-all">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-slate-500 font-mono">{event.companyName}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-md font-mono ${status === 'active' ? 'text-blue-400 bg-blue-900/20' : 'text-slate-400 bg-slate-700'}`}>
                    {status}
                  </span>
                </div>
                <p className="text-sm text-slate-100 font-medium leading-snug mb-2 line-clamp-2">{event.title}</p>
                <div className="h-1.5 rounded-full bg-slate-700 overflow-hidden mb-1">
                  <div className="h-full bg-blue-600 rounded-full" style={{ width: `${prob.yes}%` }} />
                </div>
                <div className="flex justify-between text-xs text-slate-500 font-mono">
                  <span className="text-blue-400">YES {prob.yes}%</span>
                  <span>{event.yesPool + event.noPool} wagered</span>
                  <span className="text-slate-400">NO {prob.no}%</span>
                </div>
              </Link>
            )
          })}
          {matchedEvents.length === 0 && <p className="text-slate-500 text-sm">No predictions found.</p>}
        </div>
      </section>
    </Layout>
  )
}
