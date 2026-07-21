import { Link } from 'react-router-dom'
import { X } from 'lucide-react'
import { useCookieNoticeDismissed, dismissCookieNotice } from '../hooks/useCookieNotice'

// One-time, dismissible notice that anonymous sessions and interactions are tracked for
// analytics. Kept out of the pre-login gate (it renders inside the router on the main app).
// While it's showing, the chat FAB stays hidden (see useCookieNoticeDismissed) so they
// don't overlap at the bottom of the screen.
export const CookieBanner = () => {
  const dismissed = useCookieNoticeDismissed()
  if (dismissed) return null

  return (
    <div className="fixed bottom-0 inset-x-0 z-40 p-3 sm:p-4">
      <div className="mx-auto max-w-2xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-lg px-4 py-3 flex items-start gap-3">
        <p className="flex-1 text-xs text-gray-600 dark:text-slate-300 leading-relaxed">
          We use first-party cookies and local storage to keep you signed in and to remember an anonymous session. Anonymous sessions and platform interactions are tracked in aggregate for operational and amusement-purpose analytics. See our{' '}
          <Link to="/privacy" className="text-blue-600 dark:text-blue-400 hover:underline font-medium">Privacy Policy</Link>.
        </p>
        <button
          onClick={dismissCookieNotice}
          className="flex-shrink-0 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
        >
          Got it
        </button>
        <button onClick={dismissCookieNotice} aria-label="Dismiss" className="flex-shrink-0 text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
