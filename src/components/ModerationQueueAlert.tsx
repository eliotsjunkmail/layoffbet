import { useEffect, useRef, useState } from 'react'
import { X, ShieldAlert } from 'lucide-react'
import { useStore } from '../store/useStore'
import { api } from '../services/api'

const previewFor = (item: { contentType: string; payload: Record<string, any> }) => {
  if (item.contentType === 'comment') return item.payload.content
  if (item.contentType === 'chat_message') return item.payload.text
  if (item.contentType === 'event') return item.payload.title
  return ''
}

const labelFor = (contentType: string) => {
  if (contentType === 'comment') return 'Comment'
  if (contentType === 'chat_message') return 'Chat message'
  if (contentType === 'event') return 'Prediction'
  return 'Content'
}

export const ModerationQueueAlert = () => {
  const currentUser = useStore(s => s.currentUser)
  const moderationQueue = useStore(s => s.moderationQueue)
  const resolveModerationItemLocally = useStore(s => s.resolveModerationItemLocally)
  const [show, setShow] = useState(false)
  const [resolvingId, setResolvingId] = useState<string | null>(null)
  const hasShownRef = useRef(false)

  const pending = moderationQueue.filter(m => m.status === 'pending')

  useEffect(() => {
    if (hasShownRef.current) return
    if (currentUser?.isAdmin && pending.length > 0) {
      setShow(true)
      hasShownRef.current = true
    }
  }, [currentUser?.isAdmin, pending.length])

  if (!currentUser?.isAdmin) return null
  if (!show || pending.length === 0) return null

  const resolve = async (id: string, status: 'approved' | 'rejected') => {
    setResolvingId(id)
    resolveModerationItemLocally(id, status)
    try {
      await api.resolveModerationItem(id, status, currentUser.username || '', currentUser.password || '')
    } catch {}
    setResolvingId(null)
  }

  // Group by company name for display
  const byCompany = new Map<string, typeof pending>()
  for (const item of pending) {
    const key = item.companyName || 'Unknown'
    if (!byCompany.has(key)) byCompany.set(key, [])
    byCompany.get(key)!.push(item)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShow(false)}>
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-sm shadow-2xl p-5 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400" /> Flagged content
          </h2>
          <button onClick={() => setShow(false)} className="text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-sm text-gray-500 dark:text-slate-400 mb-4">
          {pending.length} item{pending.length === 1 ? '' : 's'} awaiting review.
        </p>
        <div className="space-y-4">
          {[...byCompany.entries()].map(([companyName, items]) => (
            <div key={companyName}>
              <h3 className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-2">{companyName}</h3>
              <div className="space-y-2">
                {items.map(item => (
                  <div key={item.id} className="bg-gray-50 dark:bg-slate-800 rounded-xl px-3 py-2.5">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-slate-500">{labelFor(item.contentType)}</span>
                      <span className="text-[10px] text-amber-600 dark:text-amber-400">· flagged for {item.reason}</span>
                    </div>
                    <p className="text-sm text-gray-900 dark:text-white break-words line-clamp-3 mb-2">{previewFor(item)}</p>
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => resolve(item.id, 'rejected')}
                        disabled={resolvingId === item.id}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-500 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => resolve(item.id, 'approved')}
                        disabled={resolvingId === item.id}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white transition-colors disabled:opacity-50"
                      >
                        Approve
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
