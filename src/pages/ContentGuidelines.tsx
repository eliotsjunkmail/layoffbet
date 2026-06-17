import { ChevronLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Layout } from '../components/Layout'
import { useStore } from '../store/useStore'

export const ContentGuidelines = () => {
  const navigate = useNavigate()
  const currentUser = useStore(s => s.currentUser)

  const section = (title: string, items: string[]) => (
    <div className="mb-6">
      <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-3">{title}</h2>
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2.5 text-sm text-gray-500 dark:text-slate-400">
            <span className="text-rose-500 mt-0.5 flex-shrink-0">✕</span>
            {item}
          </li>
        ))}
      </ul>
    </div>
  )

  return (
    <Layout hideHeader={!currentUser}>
      {currentUser && (
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-gray-400 dark:text-slate-400 hover:text-gray-600 dark:hover:text-slate-200 transition-colors mb-5 text-sm">
          <ChevronLeft className="w-4 h-4" /> Back
        </button>
      )}

      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Content Guidelines</h1>
      <p className="text-gray-500 dark:text-slate-400 text-sm mb-6">
        Layoff Live is an anonymous platform built on good-faith participation. These guidelines protect all users and ensure the platform remains valuable and safe.
      </p>

      {section('Prohibited Content', [
        'Illegal content of any kind',
        'Harassment, threats, or targeted bullying of individuals',
        'Personal identifying information or confidential company data',
        'Impersonating other users, companies, or public figures',
        'Sexually explicit or NSFW content',
        'Spam, coordinated manipulation, or bot activity',
      ])}

      {section('Event Quality Standards', [
        'Events must be specific and verifiable — vague claims will be removed',
        'Events tied to real companies only, not individuals',
        'No events designed to manipulate stock prices or spread misinformation',
        'No duplicate events for the same prediction',
      ])}

      <div className="mb-6">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-3">Encouraged Behavior</h2>
        <ul className="space-y-2">
          {[
            'Base predictions on publicly available signals and observable patterns',
            'Provide context and sources in event descriptions',
            'Use discussion threads constructively',
            'Report content that violates these guidelines',
          ].map((item, i) => (
            <li key={i} className="flex items-start gap-2.5 text-sm text-gray-500 dark:text-slate-400">
              <span className="text-emerald-500 mt-0.5 flex-shrink-0">✓</span>
              {item}
            </li>
          ))}
        </ul>
      </div>

      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-xl p-4 mb-6">
        <h2 className="text-sm font-semibold text-amber-700 dark:text-amber-300 mb-2">Enforcement</h2>
        <p className="text-sm text-gray-500 dark:text-slate-400">
          Content violating these guidelines may be removed at any time. Users who repeatedly violate guidelines may be banned. Admins have final authority on all content decisions.
        </p>
      </div>

      <p className="text-xs text-gray-400 dark:text-slate-500">
        These guidelines may be updated at any time. Continued use of the platform constitutes acceptance of current guidelines.
      </p>
    </Layout>
  )
}
