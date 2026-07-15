import { useMemo, useState } from 'react'
import { X, Merge, EyeOff } from 'lucide-react'
import type { Company } from '../types'
import { findPotentialDuplicateGroups, dedupePairKey, loadDismissedPairs, saveDismissedPairs } from '../utils/companyDuplicates'

export const DuplicateCompaniesModal = ({
  companies, username, password, onClose, onMerged,
}: {
  companies: Company[]
  username: string
  password: string
  onClose: () => void
  onMerged: () => void
}) => {
  const [dismissedPairs, setDismissedPairs] = useState<Set<string>>(loadDismissedPairs)
  const [primaryByGroup, setPrimaryByGroup] = useState<Record<string, string>>({})
  const [busyGroupId, setBusyGroupId] = useState<string | null>(null)
  const [error, setError] = useState('')

  const groups = useMemo(() => findPotentialDuplicateGroups(companies, dismissedPairs), [companies, dismissedPairs])

  const primaryFor = (groupId: string, companyIds: string[]) => primaryByGroup[groupId] ?? companyIds[0]

  const dismissGroup = (group: ReturnType<typeof findPotentialDuplicateGroups>[number]) => {
    const next = new Set(dismissedPairs)
    for (let i = 0; i < group.companies.length; i++) {
      for (let j = i + 1; j < group.companies.length; j++) {
        next.add(dedupePairKey(group.companies[i].id, group.companies[j].id))
      }
    }
    setDismissedPairs(next)
    saveDismissedPairs(next)
  }

  const mergeGroup = async (group: ReturnType<typeof findPotentialDuplicateGroups>[number]) => {
    const primaryId = primaryFor(group.id, group.companies.map(c => c.id))
    const duplicateCompanyIds = group.companies.map(c => c.id).filter(id => id !== primaryId)
    setBusyGroupId(group.id)
    setError('')
    try {
      const response = await fetch('/api/admin/companies/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ primaryCompanyId: primaryId, duplicateCompanyIds, username, password }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to merge companies')
      onMerged()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to merge companies')
    } finally {
      setBusyGroupId(null)
    }
  }

  return (
    <div className="fixed inset-0 z-[70] bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-2xl max-h-[85vh] shadow-2xl flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-slate-700 flex-shrink-0">
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">Potential Duplicate Companies</h2>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
              Companies that might be the same real-world entity, e.g. "ADP" and "Automatic Data Processing".
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-gray-500 dark:text-slate-400 flex-shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {error && (
            <div className="rounded-xl p-3 border bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-700 text-red-600 dark:text-red-300 text-sm">
              {error}
            </div>
          )}

          {groups.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-slate-400 text-center py-8">No potential duplicates found.</p>
          ) : (
            groups.map(group => {
              const companyIds = group.companies.map(c => c.id)
              const primaryId = primaryFor(group.id, companyIds)
              const busy = busyGroupId === group.id
              return (
                <div key={group.id} className="border border-gray-200 dark:border-slate-700 rounded-xl p-4">
                  <div className="flex flex-wrap items-center gap-1.5 mb-3">
                    {group.reasons.map(reason => (
                      <span key={reason} className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
                        {reason}
                      </span>
                    ))}
                  </div>
                  <div className="space-y-2 mb-3">
                    {group.companies.map(company => (
                      <label
                        key={company.id}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                          primaryId === company.id
                            ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                            : 'border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800'
                        }`}
                      >
                        <input
                          type="radio"
                          name={`primary-${group.id}`}
                          checked={primaryId === company.id}
                          onChange={() => setPrimaryByGroup(m => ({ ...m, [group.id]: company.id }))}
                          className="flex-shrink-0"
                        />
                        <span className="text-sm font-medium text-gray-900 dark:text-white">{company.name}</span>
                        {primaryId === company.id && (
                          <span className="text-[11px] text-blue-600 dark:text-blue-400 ml-auto flex-shrink-0">Keep as primary</span>
                        )}
                      </label>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => mergeGroup(group)}
                      disabled={busy}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors disabled:opacity-50"
                    >
                      <Merge className="w-3.5 h-3.5" /> {busy ? 'Merging...' : 'Merge into primary'}
                    </button>
                    <button
                      onClick={() => dismissGroup(group)}
                      disabled={busy}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300 rounded-lg transition-colors disabled:opacity-50"
                    >
                      <EyeOff className="w-3.5 h-3.5" /> Not a duplicate
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
