import { AlertTriangle } from 'lucide-react'

export const ModerationWarningModal = ({ reason, onEdit, onSubmitAnyway }: { reason: string; onEdit: () => void; onSubmitAnyway: () => void }) => (
  <div className="fixed inset-0 z-[70] bg-black/50 flex items-center justify-center p-4" onClick={onEdit}>
    <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-sm shadow-2xl p-5" onClick={e => e.stopPropagation()}>
      <div className="flex items-start gap-3 mb-5">
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-1">This might need a review</h2>
          <p className="text-sm text-gray-500 dark:text-slate-400">
            Your text may contain {reason}. You can edit it, or submit it for admin approval before it's visible to others.
          </p>
        </div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={onEdit}
          className="flex-1 py-2.5 rounded-xl bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300 text-sm font-medium transition-colors"
        >
          Edit
        </button>
        <button
          onClick={onSubmitAnyway}
          className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors"
        >
          Submit for approval
        </button>
      </div>
    </div>
  </div>
)
