import { useState } from 'react'
import { Lock, Loader2 } from 'lucide-react'

// Companies that require an access code before their content (company page or any of their
// event pages) can be viewed. Enforced for everyone including admins, asked once per browser.
const COMPANY_ACCESS_CODES: Record<string, string> = { bny: 'hello' }

export const requiredCompanyCode = (c: { name: string; slug: string }): string | null =>
  COMPANY_ACCESS_CODES[c.name.trim().toLowerCase()] || COMPANY_ACCESS_CODES[c.slug] || null

export const companyCodeStorageKey = (id: string) => `lb-company-code-${id}`

// True if this company needs no code, or the code was already entered in this browser.
export const isCompanyUnlocked = (c: { id: string; name: string; slug: string }): boolean => {
  if (!requiredCompanyCode(c)) return true
  try { return localStorage.getItem(companyCodeStorageKey(c.id)) === '1' } catch { return false }
}

export const CompanyCodePrompt = ({ company, requiredCode, onUnlock }: { company: { id: string; name: string }; requiredCode: string; onUnlock: () => void }) => {
  const [input, setInput] = useState('')
  const [error, setError] = useState(false)
  const [unlocking, setUnlocking] = useState(false)

  return (
    <div className="max-w-sm mx-auto mt-12 sm:mt-20 text-center px-4">
      <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
        <Lock className="w-6 h-6 text-blue-600 dark:text-blue-400" />
      </div>
      <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-1">{company.name}</h1>
      <p className="text-sm text-gray-500 dark:text-slate-400 mb-6">This company requires an access code to view.</p>
      <form
        onSubmit={e => {
          e.preventDefault()
          if (unlocking) return
          if (input.trim().toLowerCase() === requiredCode) {
            try { localStorage.setItem(companyCodeStorageKey(company.id), '1') } catch { /* ignore */ }
            setUnlocking(true)
            // Brief spinner so the unlock reads as intentional before the content swaps in.
            setTimeout(onUnlock, 500)
          } else {
            setError(true)
          }
        }}
        className="space-y-3"
      >
        <input
          value={input}
          onChange={e => { setInput(e.target.value); setError(false) }}
          placeholder="Enter access code"
          autoFocus
          disabled={unlocking}
          className={`w-full bg-white dark:bg-slate-800 border rounded-xl px-4 py-3 text-center text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-600 focus:outline-none transition-colors ${error ? 'border-rose-400 focus:border-rose-500' : 'border-gray-300 dark:border-slate-700 focus:border-blue-500'}`}
        />
        {error && <p className="text-xs text-rose-500">That's not the right code.</p>}
        <button type="submit" disabled={!input.trim() || unlocking} className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
          {unlocking && <Loader2 className="w-4 h-4 animate-spin" />}
          {unlocking ? 'Unlocking…' : 'Unlock'}
        </button>
      </form>
    </div>
  )
}
