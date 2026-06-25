import { useState } from 'react'
import { X } from 'lucide-react'

const ADS = [
  {
    brand: 'LinkedIn',
    tagline: 'Find your next role before the layoffs.',
    body: 'Land interviews at companies that are actually hiring. Join millions discovering opportunities while you\'re still employed.',
    cta: 'Explore jobs →',
    url: 'https://linkedin.com/jobs',
    color: 'linkedin',
    logo: (
      <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.475-2.236-1.986-2.236-1.081 0-1.722.722-2.004 1.424-.103.249-.129.597-.129.946v5.435h-3.554s.043-8.811 0-9.728h3.554v1.375c.427-.659 1.191-1.595 2.897-1.595 2.117 0 3.704 1.385 3.704 4.362v5.586zM5.337 8.855c-1.144 0-1.915-.762-1.915-1.715 0-.955.771-1.715 1.921-1.715 1.147 0 1.912.759 1.937 1.715 0 .953-.79 1.715-1.943 1.715zm1.581 11.597H3.635V9.724h3.283v10.728zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.225 0z" fill="#0A66C2"/>
      </svg>
    ),
  },
  {
    brand: 'Claude Code',
    tagline: 'Build faster with Claude.',
    body: 'Develop with AI that understands context. Write, refactor, and debug code 10x faster with Claude\'s advanced reasoning.',
    cta: 'Start coding →',
    url: 'https://claude.ai/code',
    color: 'claude',
    logo: (
      <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
        <circle cx="12" cy="12" r="10" fill="#9D4EDD"/>
        <path d="M12 5C8.13 5 5 8.13 5 12s3.13 7 7 7 7-3.13 7-7-3.13-7-7-7m0 12c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z" fill="white"/>
      </svg>
    ),
  },
  {
    brand: 'Google Vertex AI',
    tagline: 'Master AI at scale.',
    body: 'Google\'s enterprise AI training teaches you to build production AI systems. Stay ahead of the automation wave.',
    cta: 'Learn AI →',
    url: 'https://cloud.google.com/vertex-ai',
    color: 'google',
    logo: (
      <svg viewBox="0 0 24 24" className="w-6 h-6">
        <text x="12" y="16" textAnchor="middle" className="font-black text-xs fill-gray-900 dark:fill-white">G</text>
        <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-red-500"/>
      </svg>
    ),
  },
  {
    brand: 'ChatGPT Pro',
    tagline: 'Upgrade your AI assistant.',
    body: 'Get priority access to GPT-4, faster responses, and custom instructions. The upgrade that pays for itself in productivity.',
    cta: 'Go Pro →',
    url: 'https://chatgpt.com/auth/login',
    color: 'chatgpt',
    logo: (
      <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2m0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8m3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5m-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11m3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z" fill="#10A37F"/>
      </svg>
    ),
  },
]

const colorMap: Record<string, { border: string; bg: string; label: string; brand: string; cta: string; dismiss: string }> = {
  linkedin: {
    border: 'border-blue-200 dark:border-blue-900/60',
    bg: 'from-blue-50 to-cyan-50 dark:from-blue-950/40 dark:to-cyan-950/30',
    label: 'border-blue-300/50 dark:border-blue-800 text-blue-500/60 dark:text-blue-600',
    brand: 'text-blue-700 dark:text-blue-400',
    cta: 'text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300',
    dismiss: 'text-blue-400 dark:text-blue-700 hover:text-blue-600 dark:hover:text-blue-500',
  },
  claude: {
    border: 'border-purple-200 dark:border-purple-900/60',
    bg: 'from-purple-50 to-pink-50 dark:from-purple-950/40 dark:to-pink-950/30',
    label: 'border-purple-300/50 dark:border-purple-800 text-purple-500/60 dark:text-purple-600',
    brand: 'text-purple-700 dark:text-purple-400',
    cta: 'text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300',
    dismiss: 'text-purple-400 dark:text-purple-700 hover:text-purple-600 dark:hover:text-purple-500',
  },
  google: {
    border: 'border-red-200 dark:border-red-900/60',
    bg: 'from-red-50 to-yellow-50 dark:from-red-950/40 dark:to-yellow-950/30',
    label: 'border-red-300/50 dark:border-red-800 text-red-500/60 dark:text-red-600',
    brand: 'text-red-700 dark:text-red-400',
    cta: 'text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300',
    dismiss: 'text-red-400 dark:text-red-700 hover:text-red-600 dark:hover:text-red-500',
  },
  chatgpt: {
    border: 'border-green-200 dark:border-green-900/60',
    bg: 'from-green-50 to-emerald-50 dark:from-green-950/40 dark:to-emerald-950/30',
    label: 'border-green-300/50 dark:border-green-800 text-green-500/60 dark:text-green-600',
    brand: 'text-green-700 dark:text-green-400',
    cta: 'text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300',
    dismiss: 'text-green-400 dark:text-green-700 hover:text-green-600 dark:hover:text-green-500',
  },
}

export const AdBanner = () => {
  const [dismissed, setDismissed] = useState(false)
  const [idx] = useState(() => Math.floor(Math.random() * ADS.length))

  if (dismissed) return null

  const ad = ADS[idx]
  const c = colorMap[ad.color] ?? colorMap.chatgpt

  const handleCtaClick = () => {
    window.open(ad.url, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className={`block my-4 relative rounded-2xl overflow-hidden border ${c.border} bg-gradient-to-br ${c.bg} shadow-sm transition-shadow`}>
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className={`w-6 h-6 rounded-md flex items-center justify-center`}>{ad.logo}</div>
            <span className={`text-xs font-bold ${c.brand} tracking-tight`}>{ad.brand}</span>
            <span className={`text-[10px] border rounded px-1 py-px uppercase tracking-widest ${c.label}`}>Ad</span>
          </div>
          <button onClick={(e) => { e.preventDefault(); setDismissed(true) }} className={`${c.dismiss} transition-colors p-0.5`}>
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
        <p className="text-sm font-bold text-gray-900 dark:text-white leading-snug mb-1">{ad.tagline}</p>
        <p className="text-xs text-gray-500 dark:text-slate-400 leading-relaxed mb-3">{ad.body}</p>
        <button onClick={handleCtaClick} className={`text-xs font-semibold ${c.cta} transition-colors inline-block hover:opacity-80 cursor-pointer border-none bg-none p-0`}>{ad.cta}</button>
      </div>
    </div>
  )
}
