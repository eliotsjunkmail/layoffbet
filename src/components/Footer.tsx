import { Link } from 'react-router-dom'

export const Footer = () => (
  <>
    <footer className="border-t border-gray-200 dark:border-slate-800 py-4 text-center text-xs text-gray-400 dark:text-slate-500">
      <Link to="/guidelines" className="hover:text-gray-600 dark:hover:text-slate-300 transition-colors">Content Guidelines</Link>
      <span className="mx-3 text-gray-300 dark:text-slate-700">·</span>
      <Link to="/privacy" className="hover:text-gray-600 dark:hover:text-slate-300 transition-colors">Privacy Policy</Link>
    </footer>
    <div className="text-center text-xs text-gray-400 dark:text-slate-500 py-3 border-t border-gray-200 dark:border-slate-800 px-4 leading-relaxed max-w-2xl mx-auto">
      For amusement only. All predictions and bets use virtual coins with no real-world or monetary value — not financial, legal, or gambling advice. An anonymous open forum; posts by current and former employees are user-generated and not endorsed by Layoff Chat.
    </div>
  </>
)
