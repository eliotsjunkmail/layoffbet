import { useState } from 'react'
import { X } from 'lucide-react'

const ADS = [
  {
    brand: 'NextGig',
    tagline: 'Your next job is already posted.',
    body: 'Stop refreshing Slack waiting for good news. 50,000+ companies are hiring — none of them have a "workforce evolution" program.',
    cta: 'Browse jobs →',
    color: 'blue',
  },
  {
    brand: 'VibeCoder AI',
    tagline: 'Code 10x faster. Get fired 10x sooner.',
    body: 'Our AI writes your code so confidently wrong that your manager will think you did it yourself.',
    cta: 'Try for free →',
    color: 'teal',
  },
  {
    brand: 'ResumeGPT',
    tagline: 'Your resume, but make it lie tastefully.',
    body: '"Leveraged cross-functional synergies to drive impact." We turn your work history into a buzzword symphony HR can\'t ignore.',
    cta: 'Polish my resume →',
    color: 'violet',
  },
]

const colorMap: Record<string, { border: string; bg: string; logo: string; label: string; brand: string; cta: string; dismiss: string }> = {
  blue: {
    border: 'border-blue-200 dark:border-blue-900/60',
    bg: 'from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/30',
    logo: 'from-blue-400 to-indigo-500',
    label: 'border-blue-300/50 dark:border-blue-800 text-blue-500/60 dark:text-blue-600',
    brand: 'text-blue-700 dark:text-blue-400',
    cta: 'text-blue-600 dark:text-blue-400 hover:text-blue-500',
    dismiss: 'text-blue-400 dark:text-blue-700 hover:text-blue-600 dark:hover:text-blue-500',
  },
  teal: {
    border: 'border-teal-200 dark:border-teal-900/60',
    bg: 'from-teal-50 to-cyan-50 dark:from-teal-950/40 dark:to-cyan-950/30',
    logo: 'from-teal-400 to-cyan-500',
    label: 'border-teal-300/50 dark:border-teal-800 text-teal-500/60 dark:text-teal-600',
    brand: 'text-teal-700 dark:text-teal-400',
    cta: 'text-teal-600 dark:text-teal-400 hover:text-teal-500',
    dismiss: 'text-teal-400 dark:text-teal-700 hover:text-teal-600 dark:hover:text-teal-500',
  },
  violet: {
    border: 'border-violet-200 dark:border-violet-900/60',
    bg: 'from-violet-50 to-purple-50 dark:from-violet-950/40 dark:to-purple-950/30',
    logo: 'from-violet-400 to-purple-500',
    label: 'border-violet-300/50 dark:border-violet-800 text-violet-500/60 dark:text-violet-600',
    brand: 'text-violet-700 dark:text-violet-400',
    cta: 'text-violet-600 dark:text-violet-400 hover:text-violet-500',
    dismiss: 'text-violet-400 dark:text-violet-700 hover:text-violet-600 dark:hover:text-violet-500',
  },
}

export const AdBanner = () => {
  const [dismissed, setDismissed] = useState(false)
  const [idx] = useState(() => Math.floor(Math.random() * ADS.length))

  if (dismissed) return null

  const ad = ADS[idx]
  const c = colorMap[ad.color] ?? colorMap.teal
  const initials = ad.brand.split(' ').map(w => w[0]).join('').slice(0, 2)

  return (
    <div className={`my-4 relative rounded-2xl overflow-hidden border ${c.border} bg-gradient-to-br ${c.bg} shadow-sm`}>
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className={`w-6 h-6 bg-gradient-to-br ${c.logo} rounded-md flex items-center justify-center text-white text-[10px] font-black leading-none`}>{initials}</div>
            <span className={`text-xs font-bold ${c.brand} tracking-tight`}>{ad.brand}</span>
            <span className={`text-[10px] border rounded px-1 py-px uppercase tracking-widest ${c.label}`}>Ad</span>
          </div>
          <button onClick={() => setDismissed(true)} className={`${c.dismiss} transition-colors p-0.5`}>
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
        <p className="text-sm font-bold text-gray-900 dark:text-white leading-snug mb-1">{ad.tagline}</p>
        <p className="text-xs text-gray-500 dark:text-slate-400 leading-relaxed mb-3">{ad.body}</p>
        <button className={`text-xs font-semibold ${c.cta} transition-colors`}>{ad.cta}</button>
      </div>
    </div>
  )
}
