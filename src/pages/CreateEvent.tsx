import { useState, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ChevronLeft, Calendar } from 'lucide-react'
import { useStore } from '../store/useStore'
import { Layout } from '../components/Layout'

export const CreateEvent = () => {
  const companies = useStore(s => s.companies)
  const createEvent = useStore(s => s.createEvent)
  const navigate = useNavigate()

  const { state } = useLocation() as { state: { companyId?: string } | null }
  const sorted = [...companies].sort((a, b) => a.name.localeCompare(b.name))
  const minDate = new Date(Date.now() + 86400000).toISOString().split('T')[0]
  const maxDate = new Date(Date.now() + 730 * 86400000).toISOString().split('T')[0]
  const [companyId, setCompanyId] = useState(state?.companyId ?? sorted[0]?.id ?? '')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [error, setError] = useState('')
  const dateInputRef = useRef<HTMLInputElement>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!companyId) return setError('Select a company.')
    if (!title.trim() || title.trim().length < 10) return setError('Title must be at least 10 characters.')
    if (!expiresAt) return setError('Set an expiration date.')
    const company = companies.find(c => c.id === companyId)
    if (!company) return
    createEvent({ companyId, companyName: company.name, title: title.trim(), description: description.trim(), expiresAt: new Date(expiresAt).toISOString() })
    navigate('/')
  }

  const inputCls = "w-full bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-xl px-4 py-3 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-600 focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/10 transition-all"

  return (
    <Layout>
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-gray-400 dark:text-slate-400 hover:text-gray-600 dark:hover:text-slate-200 transition-colors mb-5 text-sm">
        <ChevronLeft className="w-4 h-4" /> Back
      </button>

      <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-1">Create Prediction</h1>
      <p className="text-gray-500 dark:text-slate-400 text-sm mb-6">Propose a verifiable prediction for the community to bet on.</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-gray-600 dark:text-slate-400 mb-1.5">Company</label>
          <select value={companyId} onChange={e => setCompanyId(e.target.value)} className={inputCls}>
            {sorted.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm text-gray-600 dark:text-slate-400 mb-1.5">Prediction Title</label>
          <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. ACME Inc will announce layoffs this quarter" maxLength={120} className={inputCls} />
          <div className="text-right text-xs text-gray-400 dark:text-slate-600 mt-1">{title.length}/120</div>
        </div>

        <div>
          <label className="block text-sm text-gray-600 dark:text-slate-400 mb-1.5">Description <span className="text-gray-400 dark:text-slate-500">(optional)</span></label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Provide context, sources, or reasoning..." rows={4} maxLength={500} className={`${inputCls} resize-none`} />
          <div className="text-right text-xs text-gray-400 dark:text-slate-600 mt-1">{description.length}/500</div>
        </div>

        <div>
          <label className="block text-sm text-gray-600 dark:text-slate-400 mb-1.5">Expiration Date</label>
          <div className="relative">
            <input type="date" ref={dateInputRef} value={expiresAt} min={minDate} max={maxDate} onChange={e => setExpiresAt(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
            <div className={`${inputCls} flex items-center justify-between`}>
              <span className={`${expiresAt ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-slate-600'} pointer-events-none`}>
                {expiresAt ? new Date(expiresAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Select a date'}
              </span>
              <Calendar className="w-5 h-5 text-gray-400 dark:text-slate-500 flex-shrink-0 pointer-events-none" />
            </div>
          </div>
          <div className="text-xs text-gray-400 dark:text-slate-500 mt-1">Max 2 years from today</div>
        </div>

        {error && (
          <div className="bg-rose-50 dark:bg-rose-900/30 border border-rose-200 dark:border-rose-700 rounded-xl px-4 py-3 text-rose-600 dark:text-rose-300 text-sm">
            {error}
          </div>
        )}

        <div className="bg-gray-50 dark:bg-slate-800/60 border border-gray-200 dark:border-slate-700 rounded-xl p-4 text-xs text-gray-500 dark:text-slate-400">
          <p className="font-medium text-gray-700 dark:text-slate-300 mb-1">Before you submit:</p>
          <ul className="space-y-1 list-disc list-inside">
            <li>No personal or confidential data</li>
            <li>No harassment or targeted content</li>
            <li>Keep it factual and verifiable</li>
          </ul>
        </div>

        <button type="submit" className="w-full bg-violet-600 hover:bg-violet-500 text-white font-semibold py-3 rounded-xl transition-colors shadow-md shadow-violet-200 dark:shadow-violet-900/30">
          Create Prediction
        </button>
      </form>
    </Layout>
  )
}
