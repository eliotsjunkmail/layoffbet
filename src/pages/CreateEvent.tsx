import { useState, useRef, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ChevronLeft, Calendar } from 'lucide-react'
import { useStore } from '../store/useStore'
import { Layout } from '../components/Layout'
import { ModerationWarningModal } from '../components/ModerationWarningModal'
import { StateTypeahead } from '../components/StateTypeahead'
import { EventCreatedModal } from '../components/EventCreatedModal'
import { checkContentModeration } from '../utils/moderation'

export const CreateEvent = () => {
  const currentUser = useStore(s => s.currentUser)
  const companies = useStore(s => s.companies)
  const createEvent = useStore(s => s.createEvent)
  const hiddenCompanyIds = useStore(s => s.hiddenCompanyIds)
  const favoriteCompanyIds = useStore(s => s.favoriteCompanyIds)
  const navigate = useNavigate()

  const { state } = useLocation() as { state: { companyId?: string } | null }
  const sorted = [...companies]
    .filter(c => !hiddenCompanyIds.includes(c.id))
    .sort((a, b) => {
      const aIsFav = favoriteCompanyIds.includes(a.id)
      const bIsFav = favoriteCompanyIds.includes(b.id)
      if (aIsFav !== bIsFav) return aIsFav ? -1 : 1
      return a.name.localeCompare(b.name)
    })
  const minDate = new Date(Date.now() + 86400000).toISOString().split('T')[0]
  const maxDate = new Date(Date.now() + 730 * 86400000).toISOString().split('T')[0]
  const [companyId, setCompanyId] = useState(state?.companyId ?? sorted[0]?.id ?? '')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [side, setSide] = useState<'yes' | 'no' | null>(null)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')
  const [moderationWarning, setModerationWarning] = useState<string | null>(null)
  const [createdWarnEvent, setCreatedWarnEvent] = useState<{ id: string; companyId: string; companySlug: string; companyName: string } | null>(null)
  const dateInputRef = useRef<HTMLInputElement>(null)

  // Admin-only: mark this as a sourced WARN Act notice instead of a personal prediction.
  // The title is generated from these fields rather than typed freely, matching the Admin
  // panel's own "Add New Event" form.
  const [isWarnActNotice, setIsWarnActNotice] = useState(false)
  const [warnState, setWarnState] = useState('')
  const [warnWorkerCount, setWarnWorkerCount] = useState('')
  const [warnByDate, setWarnByDate] = useState('')

  const selectedCompany = companies.find(c => c.id === companyId)
  const titlePlaceholder = selectedCompany ? `e.g. ${selectedCompany.name} will announce layoffs this quarter` : "e.g. Company will announce layoffs this quarter"

  useEffect(() => {
    if (!isWarnActNotice) return
    if (!selectedCompany || !warnState.trim() || !warnWorkerCount || !warnByDate) return
    const formattedDate = new Date(`${warnByDate}T00:00:00`).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    const generatedTitle = `${selectedCompany.name} layoff in ${warnState.trim()} of ${warnWorkerCount} workers by ${formattedDate}`
    setTitle(prev => prev === generatedTitle ? prev : generatedTitle)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isWarnActNotice, selectedCompany, warnState, warnWorkerCount, warnByDate])

  // Defaults "Expiration Date" to the WARN notice's "by" date — still editable afterward.
  useEffect(() => {
    if (!isWarnActNotice || !warnByDate) return
    setExpiresAt(prev => prev === warnByDate ? prev : warnByDate)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isWarnActNotice, warnByDate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!companyId) return setError('Select a company.')

    if (isWarnActNotice) {
      if (!warnState.trim() || !warnWorkerCount || !warnByDate) return setError('Fill in state, worker count, and by-date.')
      if (!expiresAt) return setError('Set an expiration date.')
      await submitWarnEvent()
      return
    }

    if (!title.trim() || title.trim().length < 10) return setError('Title must be at least 10 characters.')
    if (!expiresAt) return setError('Set an expiration date.')
    if (!side) return setError('Choose YES or NO for your prediction.')

    const moderation = checkContentModeration(`${title.trim()} ${description.trim()}`)
    if (moderation) {
      setModerationWarning(moderation.reason)
      return
    }
    await submitEvent()
  }

  // Admin-only path: a WARN Act notice is a sourced fact, not a personal stake, so it's
  // created directly (like the Admin panel's own form) instead of going through
  // createEvent's coin-cost-and-place-a-bet flow.
  const submitWarnEvent = async () => {
    const company = companies.find(c => c.id === companyId)
    if (!company || !currentUser) return
    try {
      const response = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId,
          companyName: company.name,
          title: title.trim(),
          description: description.trim(),
          expiresAt: new Date(expiresAt).toISOString(),
          status: 'active',
          creatorId: currentUser.id,
          creatorName: currentUser.username,
          yesPool: 0,
          noPool: 0,
          createdAt: new Date().toISOString(),
          isWarnActNotice: true,
        }),
      })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create event')
      }
      const newEvent = await response.json()
      setCreatedWarnEvent({ id: newEvent.id, companyId: company.id, companySlug: company.slug, companyName: company.name })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create event')
    }
  }

  const submitEvent = async () => {
    const company = companies.find(c => c.id === companyId)
    if (!company) return
    const newEvent = await createEvent({ companyId, companyName: company.name, title: title.trim(), description: description.trim(), expiresAt: new Date(expiresAt).toISOString(), initialSide: side! })
    if (newEvent && typeof newEvent === 'object' && 'pending' in newEvent) {
      setToast('Submitted for admin review.')
      setTimeout(() => navigate('/'), 2500)
      return
    }
    if (!newEvent) return setError('Not enough coins to create prediction. (Costs 10 coins)')
    navigate(`/${company.slug}`, { state: { newEventId: newEvent.id, showToast: true } })
  }

  const inputCls = "w-full bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-xl px-4 py-3 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all"

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

        {currentUser?.isAdmin && (
          <label className="flex items-center justify-between cursor-pointer bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-xl px-4 py-3">
            <span className="text-sm font-medium text-gray-700 dark:text-slate-300">Source is a WARN Act notice</span>
            <input
              type="checkbox"
              checked={isWarnActNotice}
              onChange={e => setIsWarnActNotice(e.target.checked)}
              className="sr-only"
            />
            <div className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${isWarnActNotice ? 'bg-green-500' : 'bg-gray-300 dark:bg-slate-600'}`}>
              <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${isWarnActNotice ? 'translate-x-5' : ''}`} />
            </div>
          </label>
        )}

        {isWarnActNotice ? (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-gray-600 dark:text-slate-400 mb-1.5">State</label>
                <StateTypeahead value={warnState} onChange={setWarnState} placeholder="e.g. New Jersey" className={inputCls} />
              </div>
              <div>
                <label className="block text-sm text-gray-600 dark:text-slate-400 mb-1.5"># Workers</label>
                <input type="number" min="1" value={warnWorkerCount} onChange={e => setWarnWorkerCount(e.target.value)} placeholder="e.g. 140" className={inputCls} />
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-600 dark:text-slate-400 mb-1.5">By date</label>
              <input type="date" value={warnByDate} onChange={e => setWarnByDate(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-sm text-gray-600 dark:text-slate-400 mb-1.5">Title (generated)</label>
              <div className="w-full bg-gray-100 dark:bg-slate-700/50 border border-gray-300 dark:border-slate-600 rounded-xl px-4 py-3 text-gray-600 dark:text-slate-400 text-sm italic">
                {title || 'Fill in company, state, workers, and date above'}
              </div>
            </div>
          </>
        ) : (
          <div>
            <label className="block text-sm text-gray-600 dark:text-slate-400 mb-1.5">Prediction Title</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder={titlePlaceholder} maxLength={120} className={inputCls} />
            <div className="text-right text-xs text-gray-400 dark:text-slate-600 mt-1">{title.length}/120</div>
          </div>
        )}

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

        {!isWarnActNotice && (
          <div>
            <label className="block text-sm text-gray-600 dark:text-slate-400 mb-1.5">Your Prediction <span className="text-rose-500">*</span></label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setSide('yes')}
                className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-all border-2 ${
                  side === 'yes'
                    ? 'bg-green-500 text-white border-green-600'
                    : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-300 border-gray-300 dark:border-slate-700 hover:border-green-500 dark:hover:border-green-500'
                }`}
              >
                YES - 10 coins
              </button>
              <button
                type="button"
                onClick={() => setSide('no')}
                className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-all border-2 ${
                  side === 'no'
                    ? 'bg-red-500 text-white border-red-600'
                    : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-300 border-gray-300 dark:border-slate-700 hover:border-red-500 dark:hover:border-red-500'
                }`}
              >
                NO - 10 coins
              </button>
            </div>
            <div className="text-xs text-gray-400 dark:text-slate-500 mt-1">Creating a prediction costs 10 coins and places that bet</div>
          </div>
        )}

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

        <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded-xl transition-colors shadow-md shadow-blue-200 dark:shadow-blue-900/30">
          {isWarnActNotice ? 'Create Event' : 'Create Prediction'}
        </button>
      </form>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white dark:bg-slate-100 text-gray-900 dark:text-slate-900 px-5 py-2.5 rounded-full text-sm font-medium shadow-lg z-50 max-w-[90vw] text-center">
          {toast}
        </div>
      )}

      {moderationWarning && (
        <ModerationWarningModal
          reason={moderationWarning}
          onEdit={() => setModerationWarning(null)}
          onSubmitAnyway={() => { setModerationWarning(null); submitEvent() }}
        />
      )}

      {createdWarnEvent && (
        <EventCreatedModal
          companyName={createdWarnEvent.companyName}
          onSkip={() => navigate(`/${createdWarnEvent.companySlug}`, { state: { newEventId: createdWarnEvent.id, showToast: true } })}
          onAddTopic={() => navigate(`/${createdWarnEvent.companySlug}`, { state: { newEventId: createdWarnEvent.id, showToast: true, openChatNewTopic: true } })}
        />
      )}
    </Layout>
  )
}
