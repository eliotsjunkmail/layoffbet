import { CheckCircle } from 'lucide-react'

export const CompanyCreatedModal = ({ companyName, onCreateEvent, onClose }: { companyName: string; onCreateEvent: () => void; onClose: () => void }) => (
  <div className="fixed inset-0 z-[70] bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
    <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-sm shadow-2xl p-5" onClick={e => e.stopPropagation()}>
      <div className="flex items-start gap-3 mb-5">
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
          <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-1">Company created</h2>
          <p className="text-sm text-gray-500 dark:text-slate-400">
            "{companyName}" was added. Want to add a prediction event for it now?
          </p>
        </div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={onClose}
          className="flex-1 py-2.5 rounded-xl bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300 text-sm font-medium transition-colors"
        >
          Not now
        </button>
        <button
          onClick={onCreateEvent}
          className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors"
        >
          Add Event
        </button>
      </div>
    </div>
  </div>
)
