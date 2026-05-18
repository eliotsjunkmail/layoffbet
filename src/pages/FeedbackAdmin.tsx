import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronDown, ChevronUp, Trash2 } from 'lucide-react'
import { useStore } from '../store/useStore'
import { Layout } from '../components/Layout'
import { SwipeCard } from '../components/SwipeCard'

export const FeedbackAdmin = () => {
  const navigate = useNavigate()
  const feedback = useStore(s => s.feedback)
  const markFeedback = useStore(s => s.markFeedback)
  const clearAllFeedback = useStore(s => s.clearAllFeedback)
  const deleteFeedback = useStore(s => s.deleteFeedback)

  const [showCompleted, setShowCompleted] = useState(false)
  const [showIgnored, setShowIgnored] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)

  const active = feedback
    .filter(f => (f.status ?? 'active') === 'active')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  const completed = feedback
    .filter(f => f.status === 'completed')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  const ignored = feedback
    .filter(f => f.status === 'ignored')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })

  const FeedbackTile = ({ item }: { item: typeof feedback[0] }) => (
    <div className="bg-gray-50 dark:bg-slate-900 rounded-xl p-3">
      <p className="text-sm text-gray-700 dark:text-slate-200 leading-relaxed">{item.text}</p>
      <div className="flex items-center justify-between mt-2">
        <span className="text-xs text-gray-400 dark:text-slate-600">{fmt(item.createdAt)}</span>
        <button onClick={() => deleteFeedback(item.id)} className="text-gray-300 dark:text-slate-700 hover:text-rose-500 transition-colors">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )

  return (
    <Layout>
      <div className="flex items-center justify-between mb-5">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-gray-400 dark:text-slate-400 hover:text-gray-600 dark:hover:text-slate-200 transition-colors text-sm"
        >
          <ChevronLeft className="w-4 h-4" /> Back
        </button>

        {feedback.length > 0 && (
          confirmClear ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 dark:text-slate-400">Clear all?</span>
              <button
                onClick={() => { clearAllFeedback(); setConfirmClear(false) }}
                className="text-xs font-semibold text-rose-600 dark:text-rose-400 hover:text-rose-500 transition-colors"
              >
                Yes, clear
              </button>
              <button
                onClick={() => setConfirmClear(false)}
                className="text-xs text-gray-400 dark:text-slate-500 hover:text-gray-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmClear(true)}
              className="text-xs text-gray-400 dark:text-slate-500 hover:text-rose-500 dark:hover:text-rose-400 transition-colors"
            >
              Clear all
            </button>
          )
        )}
      </div>

      <h1 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Feedback</h1>
      <p className="text-xs text-gray-400 dark:text-slate-500 mb-5">
        Swipe right to complete · swipe left to ignore
      </p>

      {/* Active */}
      {active.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-gray-400 dark:text-slate-500 text-sm">No active feedback</p>
        </div>
      ) : (
        <div className="space-y-2.5 mb-8">
          {active.map((item, idx) => (
            <SwipeCard
              key={item.id}
              onSwipeYes={() => markFeedback(item.id, 'completed')}
              onSwipeNo={() => markFeedback(item.id, 'ignored')}
              demoActive={idx === 0}
              rightHint={{ label: '✓ Done', sublabel: 'Mark complete' }}
              leftHint={{ label: '✕ Ignore', sublabel: 'Dismiss' }}
              cardClassName="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-4 select-none cursor-grab"
            >
              <p className="text-sm text-gray-800 dark:text-slate-200 leading-relaxed">{item.text}</p>
              <p className="text-xs text-gray-400 dark:text-slate-600 mt-2">{fmt(item.createdAt)}</p>
            </SwipeCard>
          ))}
        </div>
      )}

      {/* Completed */}
      {completed.length > 0 && (
        <div className="mb-4">
          <button
            onClick={() => setShowCompleted(v => !v)}
            className="w-full flex items-center justify-between px-4 py-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl text-sm font-medium text-emerald-700 dark:text-emerald-400 transition-colors hover:bg-emerald-100 dark:hover:bg-emerald-900/30"
          >
            <span>Completed <span className="font-normal opacity-70">({completed.length})</span></span>
            {showCompleted ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {showCompleted && (
            <div className="mt-2 space-y-2 pl-1">
              {completed.map(item => <FeedbackTile key={item.id} item={item} />)}
            </div>
          )}
        </div>
      )}

      {/* Ignored */}
      {ignored.length > 0 && (
        <div className="mb-4">
          <button
            onClick={() => setShowIgnored(v => !v)}
            className="w-full flex items-center justify-between px-4 py-3 bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm font-medium text-gray-500 dark:text-slate-400 transition-colors hover:bg-gray-200 dark:hover:bg-slate-700"
          >
            <span>Ignored <span className="font-normal opacity-70">({ignored.length})</span></span>
            {showIgnored ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {showIgnored && (
            <div className="mt-2 space-y-2 pl-1">
              {ignored.map(item => <FeedbackTile key={item.id} item={item} />)}
            </div>
          )}
        </div>
      )}
    </Layout>
  )
}
