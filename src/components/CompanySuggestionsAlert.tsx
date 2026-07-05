import { useEffect, useRef, useState } from 'react'
import { X, Building2 } from 'lucide-react'
import { useStore } from '../store/useStore'
import { api } from '../services/api'
import { AddCompanyModal } from './AddCompanyModal'

export const CompanySuggestionsAlert = () => {
  const currentUser = useStore(s => s.currentUser)
  const companySuggestions = useStore(s => s.companySuggestions)
  const resolveCompanySuggestionLocally = useStore(s => s.resolveCompanySuggestionLocally)
  const [show, setShow] = useState(false)
  const [accepting, setAccepting] = useState<{ id: string; name: string } | null>(null)
  const hasShownRef = useRef(false)

  const pending = companySuggestions.filter(cs => cs.status === 'pending')

  useEffect(() => {
    if (hasShownRef.current) return
    if (currentUser?.isAdmin && pending.length > 0) {
      setShow(true)
      hasShownRef.current = true
    }
  }, [currentUser?.isAdmin, pending.length])

  if (!currentUser?.isAdmin) return null

  const handleReject = async (id: string) => {
    resolveCompanySuggestionLocally(id, 'rejected')
    try {
      await api.resolveCompanySuggestion(id, 'rejected', currentUser.username || '', currentUser.password || '')
    } catch {}
  }

  const handleCompanyCreated = async () => {
    if (accepting) {
      resolveCompanySuggestionLocally(accepting.id, 'accepted')
      try {
        await api.resolveCompanySuggestion(accepting.id, 'accepted', currentUser.username || '', currentUser.password || '')
      } catch {}
    }
    setAccepting(null)
  }

  if (accepting) {
    return (
      <AddCompanyModal
        initialName={accepting.name}
        onClose={() => setAccepting(null)}
        onCreated={handleCompanyCreated}
      />
    )
  }

  if (!show || pending.length === 0) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShow(false)}>
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-sm shadow-2xl p-5 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Building2 className="w-4 h-4 text-blue-600 dark:text-blue-400" /> Company suggestions
          </h2>
          <button onClick={() => setShow(false)} className="text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-sm text-gray-500 dark:text-slate-400 mb-4">
          {pending.length} {pending.length === 1 ? 'company' : 'companies'} suggested by users.
        </p>
        <div className="space-y-2">
          {pending.map(cs => (
            <div key={cs.id} className="flex items-center justify-between gap-2 bg-gray-50 dark:bg-slate-800 rounded-xl px-3 py-2.5">
              <span className="text-sm font-medium text-gray-900 dark:text-white truncate">{cs.name}</span>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button
                  onClick={() => handleReject(cs.id)}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-500 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors"
                >
                  Reject
                </button>
                <button
                  onClick={() => setAccepting({ id: cs.id, name: cs.name })}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white transition-colors"
                >
                  Accept
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
