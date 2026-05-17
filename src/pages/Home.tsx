import { useState, useMemo, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Search, TrendingUp, Eye, ArrowRight, Star, X } from 'lucide-react'
import { useStore } from '../store/useStore'
import { Layout } from '../components/Layout'
import { CompanyLogo } from '../components/CompanyLogo'
import { getProbability } from '../utils/odds'

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
  const toggleFavoriteCompany = useStore(s => s.toggleFavoriteCompany)
  const navigate = useNavigate()

  const [query, setQuery] = useState('')
  const [industry, setIndustry] = useState('All')
  const [showDropdown, setShowDropdown] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)

  const favorites = companies.filter(c => favoriteCompanyIds.includes(c.id))
  const hasFavorites = favorites.length > 0

  const activeEventsByCompany = useMemo(() => {
    const map: Record<string, number> = {}
    events.forEach(e => {
      if (getEffectiveStatus(e) === 'active') map[e.companyId] = (map[e.companyId] ?? 0) + 1
    })
    return map
  }, [events, getEffectiveStatus])

  const topEventByCompany = useMemo(() => {
    const map: Record<string, typeof events[0]> = {}
    events.forEach(e => {
      if (getEffectiveStatus(e) !== 'active') return
      const existing = map[e.companyId]
      if (!existing || (e.yesPool + e.noPool) > (existing.yesPool + existing.noPool)) map[e.companyId] = e
    })
    return map
  }, [events, getEffectiveStatus])

  const typeaheadResults = useMemo(() => {
    if (!query.trim()) return []
    const q = query.toLowerCase()
    return companies
      .filter(c => c.name.toLowerCase().includes(q) || c.industry.toLowerCase().includes(q))
      .sort((a, b) => b.viewCount - a.viewCount)
      .slice(0, 6)
  }, [companies, query])

  const filtered = useMemo(() => {
    return companies
      .filter(c => industry === 'All' || c.industry === industry)
      .sort((a, b) => b.viewCount - a.viewCount)
  }, [companies, industry])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleStar = (e: React.MouseEvent, companyId: string) => {
    e.preventDefault()
    e.stopPropagation()
    toggleFavoriteCompany(companyId)
  }

  return (
    <Layout fullWidth>
      <div className="max-w-2xl mx-auto px-4">
        {/* Hero */}
        <div className="pt-10 pb-8 text-center">
          <h1 className="text-xl sm:text-4xl font-extrabold text-gray-900 dark:text-white leading-tight mb-3">
            <span className="sm:hidden">What's really happening at work</span>
            <span className="hidden sm:block">Find out what's really<br />happening at your company</span>
          </h1>
          <p className="text-gray-500 dark:text-slate-400 text-sm sm:text-base mb-8 max-w-sm mx-auto whitespace-nowrap overflow-hidden text-ellipsis sm:whitespace-normal sm:overflow-visible">
            Anonymous prediction markets for the workplace
            <span className="hidden sm:inline"> — track signals, bet on outcomes</span>
          </p>

          {/* Search with typeahead */}
          <div ref={searchRef} className="relative max-w-md mx-auto mb-4">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-slate-500 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={e => { setQuery(e.target.value); setShowDropdown(true) }}
              onFocus={() => query && setShowDropdown(true)}
              placeholder="Search your company..."
              className="w-full bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-2xl pl-12 pr-10 py-3.5 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all shadow-sm text-sm"
            />
            {query && (
              <button onClick={() => { setQuery(''); setShowDropdown(false) }} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 transition-colors">
                <X className="w-4 h-4" />
              </button>
            )}

            {/* Dropdown */}
            {showDropdown && typeaheadResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl shadow-xl z-30 overflow-hidden">
                {typeaheadResults.map(c => {
                  const isFav = favoriteCompanyIds.includes(c.id)
                  const activeBets = activeEventsByCompany[c.id] ?? 0
                  return (
                    <div
                      key={c.id}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-slate-700/50 cursor-pointer border-b border-gray-100 dark:border-slate-700 last:border-0 transition-colors"
                      onClick={() => { setShowDropdown(false); setQuery(''); navigate(`/${c.slug}`) }}
                    >
                      <CompanyLogo name={c.name} id={c.id} size="sm" />
                      <div className="flex-1 min-w-0 text-left">
                        <div className="text-sm font-medium text-gray-900 dark:text-white truncate">{c.name}</div>
                        <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-slate-500">
                          <span>{c.industry}</span>
                          {activeBets > 0 && <span className="text-violet-600 dark:text-violet-400">{activeBets} active</span>}
                        </div>
                      </div>
                      <button
                        onClick={e => handleStar(e, c.id)}
                        className={`flex-shrink-0 p-1.5 rounded-lg transition-colors ${isFav ? 'text-amber-400' : 'text-gray-300 dark:text-slate-600 hover:text-amber-400'}`}
                      >
                        <Star className={`w-4 h-4 ${isFav ? 'fill-amber-400' : ''}`} />
                      </button>
                    </div>
                  )
                })}
                <div
                  className="px-4 py-2.5 text-xs text-center text-violet-600 dark:text-violet-400 hover:bg-gray-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors font-medium"
                  onClick={() => { setShowDropdown(false); navigate('/search') }}
                >
                  See all results →
                </div>
              </div>
            )}

            {showDropdown && query && typeaheadResults.length === 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl shadow-xl z-30 px-4 py-5 text-sm text-gray-400 dark:text-slate-500 text-center">
                No companies found for "{query}"
              </div>
            )}
          </div>

          {!currentUser && (
            <p className="text-xs text-gray-400 dark:text-slate-500">
              Browse freely. <Link to="/login" className="text-violet-600 dark:text-violet-400 hover:underline">Sign in</Link> to place bets.
            </p>
          )}
        </div>

        {/* Favorite company sections */}
        {hasFavorites && favorites.map(c => {
          const activeEvents = events
            .filter(e => e.companyId === c.id && getEffectiveStatus(e) === 'active')
            .sort((a, b) => (b.yesPool + b.noPool) - (a.yesPool + a.noPool))
          return (
            <section key={c.id} className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <Link to={`/${c.slug}`} className="flex items-center gap-2 group">
                  <CompanyLogo name={c.name} id={c.id} size="sm" />
                  <span className="text-sm font-semibold text-gray-800 dark:text-white group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">{c.name}</span>
                  <span className="text-xs text-gray-400 dark:text-slate-500">{c.industry}</span>
                </Link>
              </div>
              {activeEvents.length > 0 ? (
                <div className="space-y-2">
                  {activeEvents.slice(0, 3).map(e => {
                    const prob = getProbability(e.yesPool, e.noPool)
                    return (
                      <Link key={e.id} to={`/event/${e.id}`} className="block bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-3 hover:border-violet-300 dark:hover:border-violet-700 transition-all">
                        <p className="text-sm text-gray-900 dark:text-white leading-snug mb-2 line-clamp-1">{e.title}</p>
                        <div className="h-1 rounded-full bg-gray-100 dark:bg-slate-700 overflow-hidden mb-1">
                          <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${prob.yes}%` }} />
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-emerald-600 dark:text-emerald-400 font-medium">YES {prob.yes}%</span>
                          <span className="text-gray-400 dark:text-slate-500">{e.yesPool + e.noPool} coins bet</span>
                          <span className="text-rose-600 dark:text-rose-400 font-medium">NO {prob.no}%</span>
                        </div>
                      </Link>
                    )
                  })}
                  {activeEvents.length > 3 && (
                    <Link to={`/${c.slug}`} className="block text-center text-xs text-violet-600 dark:text-violet-400 hover:text-violet-500 font-medium py-1 transition-colors">
                      +{activeEvents.length - 3} more predictions →
                    </Link>
                  )}
                </div>
              ) : (
                <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-4 text-center">
                  <p className="text-sm text-gray-400 dark:text-slate-500">No active predictions for {c.name}</p>
                  <Link to="/create" className="text-xs text-violet-600 dark:text-violet-400 hover:underline mt-1 inline-block">Create one →</Link>
                </div>
              )}
            </section>
          )
        })}

        {/* Industry filter + Browse — hidden once user has favorites */}
        {!hasFavorites && (
          <>
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

            <section className="mb-6">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-4 h-4 text-gray-400 dark:text-slate-500" />
                <h2 className="text-sm font-semibold text-gray-700 dark:text-slate-300">Browse Companies</h2>
                <span className="text-xs bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-400 px-2 py-0.5 rounded-full">
                  {filtered.length}
                </span>
              </div>
              <div className="space-y-2">
                {filtered.map(c => (
                  <CompanyRow key={c.id} company={c} activeBets={activeEventsByCompany[c.id] ?? 0} topEvent={topEventByCompany[c.id]} isFav={favoriteCompanyIds.includes(c.id)} onStar={e => handleStar(e, c.id)} />
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
            <Link to="/login" className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white font-semibold px-6 py-2.5 rounded-xl transition-colors text-sm">
              Get Started — It's Free <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}
      </div>

    </Layout>
  )
}

const CompanyRow = ({
  company, activeBets, topEvent, isFav, onStar,
}: {
  company: ReturnType<typeof useStore.getState>['companies'][0]
  activeBets: number
  topEvent?: ReturnType<typeof useStore.getState>['events'][0]
  isFav: boolean
  onStar: (e: React.MouseEvent) => void
}) => {
  const prob = topEvent ? getProbability(topEvent.yesPool, topEvent.noPool) : null

  return (
    <Link
      to={`/${company.slug}`}
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
          {prob && <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">{prob.yes}% YES</span>}
        </div>
      </div>
      <button
        onClick={onStar}
        className={`flex-shrink-0 p-1.5 rounded-lg transition-colors ${isFav ? 'text-amber-400' : 'text-gray-200 dark:text-slate-700 group-hover:text-gray-300 dark:group-hover:text-slate-500 hover:text-amber-400'}`}
      >
        <Star className={`w-4 h-4 ${isFav ? 'fill-amber-400' : ''}`} />
      </button>
    </Link>
  )
}
