import { useState } from 'react'
import { X, Bell, MessageSquare, Calendar, TrendingUp } from 'lucide-react'

const ALERT_PREFS_KEY = 'lb-alert-prefs'

interface AlertPrefs {
  newMessage: boolean
  newEvent: boolean
  likelihoodThreshold: boolean
  thresholdPct: number
}

const DEFAULT_PREFS: AlertPrefs = {
  newMessage: true,
  newEvent: true,
  likelihoodThreshold: false,
  thresholdPct: 80,
}

export const loadAlertPrefs = (): AlertPrefs => {
  try {
    const saved = localStorage.getItem(ALERT_PREFS_KEY)
    return saved ? { ...DEFAULT_PREFS, ...JSON.parse(saved) } : DEFAULT_PREFS
  } catch {
    return DEFAULT_PREFS
  }
}

const Toggle = ({ checked, onChange }: { checked: boolean; onChange: () => void }) => (
  <button
    type="button"
    onClick={onChange}
    className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${checked ? 'bg-blue-600' : 'bg-gray-300 dark:bg-slate-600'}`}
  >
    <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${checked ? 'translate-x-5' : ''}`} />
  </button>
)

export const AlertsModal = ({ onClose }: { onClose: () => void }) => {
  const [prefs, setPrefs] = useState<AlertPrefs>(loadAlertPrefs)
  const [saved, setSaved] = useState(false)

  const toggle = (key: 'newMessage' | 'newEvent' | 'likelihoodThreshold') => {
    setPrefs(p => ({ ...p, [key]: !p[key] }))
  }

  const handleSave = () => {
    localStorage.setItem(ALERT_PREFS_KEY, JSON.stringify(prefs))
    setSaved(true)
    setTimeout(onClose, 900)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-sm shadow-2xl p-5" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-1">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Bell className="w-4 h-4 text-blue-600 dark:text-blue-400" /> Get Alerts
          </h2>
          <button onClick={onClose} className="text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-sm text-gray-500 dark:text-slate-400 mb-4">Choose what you want to hear about for companies you follow.</p>

        <div className="space-y-3 mb-5">
          <label className="flex items-center justify-between gap-3 p-3 rounded-xl border border-gray-200 dark:border-slate-700 cursor-pointer">
            <span className="flex items-center gap-2 text-sm text-gray-900 dark:text-white">
              <MessageSquare className="w-4 h-4 text-gray-400 dark:text-slate-500" /> New chat messages
            </span>
            <Toggle checked={prefs.newMessage} onChange={() => toggle('newMessage')} />
          </label>

          <label className="flex items-center justify-between gap-3 p-3 rounded-xl border border-gray-200 dark:border-slate-700 cursor-pointer">
            <span className="flex items-center gap-2 text-sm text-gray-900 dark:text-white">
              <Calendar className="w-4 h-4 text-gray-400 dark:text-slate-500" /> New predictions
            </span>
            <Toggle checked={prefs.newEvent} onChange={() => toggle('newEvent')} />
          </label>

          <div className="p-3 rounded-xl border border-gray-200 dark:border-slate-700">
            <label className="flex items-center justify-between gap-3 cursor-pointer">
              <span className="flex items-center gap-2 text-sm text-gray-900 dark:text-white">
                <TrendingUp className="w-4 h-4 text-gray-400 dark:text-slate-500" /> Likelihood crosses a threshold
              </span>
              <Toggle checked={prefs.likelihoodThreshold} onChange={() => toggle('likelihoodThreshold')} />
            </label>
            {prefs.likelihoodThreshold && (
              <div className="flex items-center gap-2 mt-3 pl-6">
                <span className="text-xs text-gray-500 dark:text-slate-400">Alert me when likelihood is over</span>
                <input
                  type="number"
                  min={1}
                  max={99}
                  value={prefs.thresholdPct}
                  onChange={e => setPrefs(p => ({ ...p, thresholdPct: Math.min(99, Math.max(1, parseInt(e.target.value) || 0)) }))}
                  className="w-14 text-center bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg px-1 py-1 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-blue-500"
                />
                <span className="text-xs text-gray-500 dark:text-slate-400">%</span>
              </div>
            )}
          </div>
        </div>

        <button
          onClick={handleSave}
          className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl transition-colors text-sm"
        >
          {saved ? 'Saved!' : 'Save preferences'}
        </button>
      </div>
    </div>
  )
}
