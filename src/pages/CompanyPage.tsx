import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { ChevronLeft, PlusCircle, Eye, Star } from 'lucide-react'
import { useStore } from '../store/useStore'
import { Layout } from '../components/Layout'
import { CompanyLogo } from '../components/CompanyLogo'
import { AuthModal } from '../components/AuthModal'
import { getProbability, timeUntil, formatDate } from '../utils/odds'

const fmtViews = (n: number) => {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}K`
  return String(n)
}

export const CompanyPage = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const companies = useStore(s => s.companies)
  const events = useStore(s => s.events)
  const getEffectiveStatus = useStore(s => s.getEffectiveStatus)

  const favoriteCompanyIds = useStore(s => s.favoriteCompanyIds)
  const toggleFavoriteCompany = useStore(s => s.toggleFavoriteCompany)
  const currentUser = useStore(s => s.currentUser)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [pendingFavorite, setPendingFavorite] = useState(false)

  const company = companies.find(c => c.id === id)
  if (!company) return (
    <Layout>
      <div className="text-center py-20 text-gray-400 dark:text-slate-400">Company not found.</div>
    </Layout>
  )

  const isFavorite = favoriteCompanyIds.includes(company.id)
  const companyEvents = events.filter(e => e.companyId === id)
  const active = companyEvents.filter(e => getEffectiveStatus(e) === 'active')
  const past = companyEvents.filter(e => ['expired', 'resolved', 'archived'].includes(getEffectiveStatus(e)))

  const avgYes = active.length > 0
    ? Math.round(active.reduce((sum, e) => sum + getProbability(e.yesPool, e.noPool).yes, 0) / active.length)
    : null

  return (
    <Layout>
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-gray-400 dark:text-slate-400 hover:text-gray-600 dark:hover:text-slate-200 transition-colors mb-5 text-sm">
        <ChevronLeft className="w-4 h-4" /> Back
      </button>

      <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl p-5 mb-5 shadow-sm dark:shadow-none">
        <div className="flex items-start gap-4">
          <CompanyLogo name={company.name} id={company.id} size="xl" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">{company.name}</h1>
              {currentUser && (
                <button
                  onClick={() => {
                    if (!currentUser) { setPendingFavorite(true); setShowAuthModal(true); return }
                    toggleFavoriteCompany(company.id)
                  }}
                  className={`flex-shrink-0 p-2 rounded-xl transition-colors ${isFavorite ? 'text-amber-400 bg-amber-50 dark:bg-amber-900/20' : 'text-gray-300 dark:text-slate-600 hover:text-amber-400'}`}
                  title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                >
                  <Star className={`w-5 h-5 ${isFavorite ? 'fill-amber-400' : ''}`} />
                </button>
              )}
            </div>
            <div className="text-xs text-gray-400 dark:text-slate-500 mt-0.5 mb-2">{company.industry}</div>
            <p className="text-gray-500 dark:text-slate-400 text-sm">{company.description}</p>
            <div className="flex items-center gap-1.5 mt-3 text-xs text-gray-400 dark:text-slate-500">
              <Eye className="w-3.5 h-3.5" />
              <span>{fmtViews(company.viewCount)} views</span>
            </div>
          </div>
        </div>
        {avgYes !== null && (
          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-700">
            <div className="text-xs text-gray-400 dark:text-slate-400 mb-1.5">Avg. layoff sentiment across active predictions</div>
            <div className="h-2 rounded-full bg-gray-100 dark:bg-slate-700 overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${avgYes}%` }} />
            </div>
            <div className="flex justify-between text-xs mt-1">
              <span className="text-emerald-600 dark:text-emerald-400">YES {avgYes}%</span>
              <span className="text-rose-600 dark:text-rose-400">NO {100 - avgYes}%</span>
            </div>
          </div>
        )}
      </div>

      {active.length > 0 && (
        <section className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-slate-300">Active Predictions</h2>
            <span className="text-xs text-gray-400 dark:text-slate-500 bg-gray-100 dark:bg-slate-700 px-2 py-0.5 rounded-full">{active.length}</span>
          </div>
          <div className="space-y-3">
            {active.map(event => {
              const prob = getProbability(event.yesPool, event.noPool)
              return (
                <Link key={event.id} to={`/event/${event.id}`} className="block bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-4 hover:border-violet-300 dark:hover:border-violet-700 hover:shadow-sm transition-all">
                  <p className="text-sm text-gray-900 dark:text-white font-medium mb-2 leading-snug">{event.title}</p>
                  <div className="h-1.5 rounded-full bg-gray-100 dark:bg-slate-700 overflow-hidden mb-1.5">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${prob.yes}%` }} />
                  </div>
                  <div className="flex justify-between text-xs text-gray-400 dark:text-slate-500">
                    <span className="text-emerald-600 dark:text-emerald-400">YES {prob.yes}%</span>
                    <span>{timeUntil(event.expiresAt)}</span>
                    <span className="text-rose-600 dark:text-rose-400">NO {prob.no}%</span>
                  </div>
                </Link>
              )
            })}
          </div>
        </section>
      )}

      {past.length > 0 && (
        <section className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-slate-300">Past Events</h2>
            <span className="text-xs text-gray-400 dark:text-slate-500 bg-gray-100 dark:bg-slate-700 px-2 py-0.5 rounded-full">{past.length}</span>
          </div>
          <div className="space-y-3">
            {past.map(event => {
              const prob = getProbability(event.yesPool, event.noPool)
              const s = getEffectiveStatus(event)
              return (
                <Link key={event.id} to={`/event/${event.id}`} className="block bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700/50 rounded-xl p-4 hover:border-violet-300 dark:hover:border-violet-700 transition-all">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s === 'resolved' ? 'bg-violet-50 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400' : 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'}`}>
                      {s === 'resolved' && event.outcome ? `Resolved ${event.outcome.toUpperCase()}` : 'Expired'}
                    </span>
                    <span className="text-xs text-gray-400 dark:text-slate-500">{formatDate(event.expiresAt)}</span>
                  </div>
                  <p className="text-sm text-gray-700 dark:text-slate-300 leading-snug">{event.title}</p>
                  <div className="flex justify-between text-xs text-gray-400 dark:text-slate-600 mt-2">
                    <span>YES {prob.yes}%</span>
                    <span>NO {prob.no}%</span>
                  </div>
                </Link>
              )
            })}
          </div>
        </section>
      )}

      {companyEvents.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-400 dark:text-slate-500 text-sm mb-4">No predictions yet for this company.</p>
          <Link to="/create" className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors">
            <PlusCircle className="w-4 h-4" /> Create a Prediction
          </Link>
        </div>
      )}
      {showAuthModal && (
        <AuthModal
          onClose={() => {
            setShowAuthModal(false)
            if (pendingFavorite && useStore.getState().currentUser) {
              toggleFavoriteCompany(company.id)
              setPendingFavorite(false)
            }
          }}
          promptTitle="Save this company"
          prompt={`Star ${company.name} to track it from your home screen.`}
          anonNote="Just pick a username and password — no email, no personal info required. It takes 5 seconds."
        />
      )}
    </Layout>
  )
}
