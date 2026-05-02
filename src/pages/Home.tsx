import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Search, TrendingUp, Eye, Flame, ArrowRight, ChevronRight, Star } from 'lucide-react'
import { useStore } from '../store/useStore'
import { Layout } from '../components/Layout'
import { CompanyLogo } from '../components/CompanyLogo'
import { getProbability } from '../utils/odds'

const POPULAR_IDS = ['comp-1', 'comp-2', 'comp-3']

const INDUSTRIES = ['All', 'Tech', 'Software', 'AI & Machine Learning', 'Finance', 'Healthcare', 'Retail', 'Media & Entertainment', 'Energy', 'Consulting', 'Logistics', 'Food & Beverage', 'Manufacturing']

const fmtViews = (n: number) => {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}K`
  return String(n)
}

export const Home = () => {
  const companies = useStore(s => s.companies)
  const events = useStore(s => s.events)
  const getEffectiveStatus = useStore(s => s.getEffectiveStatus)
  const currentUser = useStore(s => s.currentUser)
  const favoriteCompanyIds = useStore(s => s.favoriteCompanyIds)
  const [query, setQuery] = useState('')
  const [industry, setIndustry] = useState('All')

  const favorites = companies.filter(c => favoriteCompanyIds.includes(c.id))
  const hasFavorites = favorites.length > 0
  const popular = companies.filter(c => POPULAR_IDS.includes(c.id))

  const activeEventsByCompany = useMemo(() => {
    const map: Record<string, number> = {}
    events.forEach(e => {
      if (getEffectiveStatus(e) === 'active') {
        map[e.companyId] = (map[e.companyId] ?? 0) + 1
      }
    })
    return map
  }, [events, getEffectiveStatus])

  const topEventByCompany = useMemo(() => {
    const map: Record<string, typeof events[0]> = {}
    events.forEach(e => {
      if (getEffectiveStatus(e) !== 'active') return
      const existing = map[e.companyId]
      if (!existing || (e.yesPool + e.noPool) > (existing.yesPool + existing.noPool)) {
        map[e.companyId] = e
      }
    })
    return map
  }, [events, getEffectiveStatus])

  const filtered = useMemo(() => {
    return companies
      .filter(c => !POPULAR_IDS.includes(c.id))
      .filter(c => {
        const matchQ = !query || c.name.toLowerCase().includes(query.toLowerCase()) || c.industry.toLowerCase().includes(query.toLowerCase())
        const matchI = industry === 'All' || c.industry === industry
        return matchQ && matchI
      })
      .sort((a, b) => b.viewCount - a.viewCount)
  }, [companies, query, industry])

  return (
    <Layout fullWidth>
      <div className="max-w-2xl mx-auto px-4">
        {/* Hero */}
        <div className="pt-10 pb-8 text-center">
          <span className="inline-flex items-center gap-1.5 bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300 text-xs font-semibold px-3 py-1 rounded-full border border-violet-200 dark:border-violet-800 mb-5">
            <span className="w-1.5 h-1.5 bg-violet-500 rounded-full animate-pulse" />
            100% Anonymous
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white leading-tight mb-3">
            Find out what's really<br />happening at your company
          </h1>
          <p className="text-gray-500 dark:text-slate-400 text-base mb-8 max-w-sm mx-auto">
            Join employees tracking workplace signals through anonymous prediction markets.
          </p>

          {/* Search */}
          <div className="relative max-w-md mx-auto mb-4">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-slate-500" />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search your company..."
              className="w-full bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-2xl pl-12 pr-4 py-3.5 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all shadow-sm text-sm"
              autoFocus
            />
          </div>

          {!currentUser && (
            <p className="text-xs text-gray-400 dark:text-slate-500">
              Browse freely. <Link to="/login" className="text-violet-600 dark:text-violet-400 hover:underline">Sign in</Link> to place bets.
            </p>
          )}
        </div>

        {/* If searching, show results */}
        {query && (
          <section className="mb-8">
            <h2 className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-3">
              Results for "{query}"
            </h2>
            {filtered.length === 0 && companies.filter(c => c.name.toLowerCase().includes(query.toLowerCase())).length === 0 ? (
              <div className="text-center py-8 text-gray-400 dark:text-slate-500 text-sm">
                No companies found. Try a different search.
              </div>
            ) : (
              <div className="space-y-2">
                {[...popular.filter(c => c.name.toLowerCase().includes(query.toLowerCase()) || c.industry.toLowerCase().includes(query.toLowerCase())), ...filtered.filter(c => c.name.toLowerCase().includes(query.toLowerCase()) || c.industry.toLowerCase().includes(query.toLowerCase()))].map(c => (
                  <CompanyRow key={c.id} company={c} activeBets={activeEventsByCompany[c.id] ?? 0} topEvent={topEventByCompany[c.id]} />
                ))}
              </div>
            )}
          </section>
        )}

        {!query && (
          <>
            {/* Favorites or Popular */}
            <section className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                {hasFavorites
                  ? <><Star className="w-4 h-4 text-amber-400 fill-amber-400" /><h2 className="text-sm font-semibold text-gray-700 dark:text-slate-300">My Companies</h2></>
                  : <><Flame className="w-4 h-4 text-orange-500" /><h2 className="text-sm font-semibold text-gray-700 dark:text-slate-300">Popular Right Now</h2></>
                }
              </div>
              <div className="grid grid-cols-3 gap-3">
                {(hasFavorites ? favorites : popular).map(c => {
                  const topEvent = topEventByCompany[c.id]
                  const prob = topEvent ? getProbability(topEvent.yesPool, topEvent.noPool) : null
                  const activeBets = activeEventsByCompany[c.id] ?? 0
                  return (
                    <Link
                      key={c.id}
                      to={`/company/${c.id}`}
                      className="group bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl p-4 hover:border-violet-300 dark:hover:border-violet-700 hover:shadow-md transition-all"
                    >
                      <CompanyLogo name={c.name} id={c.id} size="lg" />
                      <div className="mt-3">
                        <div className="font-semibold text-gray-900 dark:text-white text-sm leading-tight line-clamp-1">{c.name}</div>
                        <div className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">{c.industry}</div>
                      </div>
                      <div className="mt-3 flex items-center gap-1 text-xs text-gray-400 dark:text-slate-500">
                        <Eye className="w-3 h-3" />
                        <span>{fmtViews(c.viewCount)}</span>
                      </div>
                      {prob && (
                        <div className="mt-2">
                          <div className="h-1 rounded-full bg-gray-100 dark:bg-slate-700 overflow-hidden">
                            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${prob.yes}%` }} />
                          </div>
                          <div className="flex justify-between text-xs mt-1">
                            <span className="text-emerald-600 dark:text-emerald-400 font-medium">{prob.yes}%</span>
                            <span className="text-gray-400 dark:text-slate-500">{activeBets} bets</span>
                          </div>
                        </div>
                      )}
                    </Link>
                  )
                })}
              </div>
            </section>

            {/* Industry filter */}
            <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide">
              {INDUSTRIES.map(ind => (
                <button
                  key={ind}
                  onClick={() => setIndustry(ind)}
                  className={`flex-shrink-0 text-xs font-medium px-3 py-1.5 rounded-full border transition-all ${
                    industry === ind
                      ? 'bg-violet-600 border-violet-600 text-white'
                      : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-400 hover:border-violet-300 dark:hover:border-violet-700'
                  }`}
                >
                  {ind}
                </button>
              ))}
            </div>

            {/* All companies */}
            <section className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-gray-400 dark:text-slate-500" />
                  <h2 className="text-sm font-semibold text-gray-700 dark:text-slate-300">
                    Browse Companies
                  </h2>
                  <span className="text-xs bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-400 px-2 py-0.5 rounded-full">
                    {filtered.length + (industry === 'All' ? popular.length : popular.filter(c => c.industry === industry).length).toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                {(industry !== 'All' ? popular.filter(c => c.industry === industry) : []).map(c => (
                  <CompanyRow key={c.id} company={c} activeBets={activeEventsByCompany[c.id] ?? 0} topEvent={topEventByCompany[c.id]} />
                ))}
                {filtered.map(c => (
                  <CompanyRow key={c.id} company={c} activeBets={activeEventsByCompany[c.id] ?? 0} topEvent={topEventByCompany[c.id]} />
                ))}
              </div>
            </section>
          </>
        )}

        {/* CTA for guests */}
        {!currentUser && (
          <div className="bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 rounded-2xl p-5 mb-8 text-center">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Ready to bet?</h3>
            <p className="text-sm text-gray-500 dark:text-slate-400 mb-4">
              Create a free anonymous account and get <strong className="text-violet-600 dark:text-violet-400">100 Coins daily</strong> to wager on predictions.
            </p>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white font-semibold px-6 py-2.5 rounded-xl transition-colors text-sm"
            >
              Get Started — It's Free <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}
      </div>
    </Layout>
  )
}

const CompanyRow = ({
  company,
  activeBets,
  topEvent,
}: {
  company: ReturnType<typeof useStore.getState>['companies'][0]
  activeBets: number
  topEvent?: ReturnType<typeof useStore.getState>['events'][0]
}) => {
  const prob = topEvent ? getProbability(topEvent.yesPool, topEvent.noPool) : null

  return (
    <Link
      to={`/company/${company.id}`}
      className="flex items-center gap-3 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-3.5 hover:border-violet-300 dark:hover:border-violet-700 hover:shadow-sm transition-all group"
    >
      <CompanyLogo name={company.name} id={company.id} size="md" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-900 dark:text-white text-sm truncate">{company.name}</span>
          {activeBets > 0 && (
            <span className="text-xs bg-violet-50 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 px-1.5 py-0.5 rounded-full border border-violet-200 dark:border-violet-800 flex-shrink-0">
              {activeBets} active
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-0.5">
          <span className="text-xs text-gray-400 dark:text-slate-500">{company.industry}</span>
          <span className="flex items-center gap-1 text-xs text-gray-400 dark:text-slate-500">
            <Eye className="w-3 h-3" />{fmtViews(company.viewCount)}
          </span>
          {prob && (
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">{prob.yes}% YES</span>
          )}
        </div>
      </div>
      <ChevronRight className="w-4 h-4 text-gray-300 dark:text-slate-600 group-hover:text-violet-400 transition-colors flex-shrink-0" />
    </Link>
  )
}
