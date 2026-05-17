import { useState } from 'react'
import { MessageSquarePlus, X, Send } from 'lucide-react'
import { useStore } from '../store/useStore'

const TYPES = [
  { value: 'bug', label: '🐛 Bug' },
  { value: 'feature', label: '💡 Feature idea' },
  { value: 'other', label: '💬 Other' },
]

export const FeedbackButton = () => {
  const addFeedback = useStore(s => s.addFeedback)
  const [open, setOpen] = useState(false)
  const [type, setType] = useState('feature')
  const [text, setText] = useState('')
  const [sent, setSent] = useState(false)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!text.trim()) return
    addFeedback(text, type)
    setSent(true)
    setTimeout(() => { setOpen(false); setSent(false); setText(''); setType('feature') }, 1500)
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-20 right-4 z-30 w-11 h-11 bg-violet-600 hover:bg-violet-500 text-white rounded-full shadow-lg shadow-violet-500/30 flex items-center justify-center transition-all hover:scale-105 active:scale-95"
        title="Send feedback"
      >
        <MessageSquarePlus className="w-5 h-5" />
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4" onClick={() => setOpen(false)}>
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-sm shadow-2xl border border-gray-200 dark:border-slate-700" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100 dark:border-slate-800">
              <span className="font-semibold text-gray-900 dark:text-white text-sm">Share feedback</span>
              <button onClick={() => setOpen(false)} className="text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            {sent ? (
              <div className="px-5 py-8 text-center">
                <div className="text-2xl mb-2">🙌</div>
                <p className="font-semibold text-gray-900 dark:text-white text-sm">Thanks for the feedback!</p>
                <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">We read every single one.</p>
              </div>
            ) : (
              <form onSubmit={submit} className="p-5 space-y-3">
                <div className="flex gap-2">
                  {TYPES.map(t => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setType(t.value)}
                      className={`flex-1 py-2 rounded-xl text-xs font-medium border transition-all ${type === t.value ? 'bg-violet-600 border-violet-600 text-white' : 'bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-400 hover:border-violet-300'}`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
                <textarea
                  value={text}
                  onChange={e => setText(e.target.value)}
                  placeholder="What's on your mind?"
                  rows={4}
                  maxLength={500}
                  autoFocus
                  className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-600 focus:outline-none focus:border-violet-500 transition-colors resize-none"
                />
                <button
                  type="submit"
                  disabled={!text.trim()}
                  className="w-full flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-xl transition-colors text-sm"
                >
                  <Send className="w-4 h-4" /> Send feedback
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  )
}
