import { useEffect, useState, useRef, useMemo } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useStore } from './store/useStore'
import { api } from './services/api'
import { X, Search as SearchIcon, MessageSquare, Users, User } from 'lucide-react'
import { APP_VERSION } from './constants'
import { CompanyLogo } from './components/CompanyLogo'
import { AddCompanyModal } from './components/AddCompanyModal'
import { CompanyCreatedModal } from './components/CompanyCreatedModal'
import { CompanyCodePrompt, requiredCompanyCode, isCompanyUnlocked } from './components/CompanyCodePrompt'
import type { ReactNode } from 'react'

const API_BASE = ''
const GATE_KEY = 'lb-gate-v2'
const GATE_CODES = ['pershing', 'hello']
const LAUNCH_DATE_KEY = 'lb-launch-date'
const DEFAULT_LAUNCH = '2026-09-01'
const GATE_ADMIN_USER = 'admin'
const GATE_ADMIN_PASS = 'admin'
const ANON_FAVORITE_COMPANY_KEY = 'lb-anon-favorite-company'
const REFERRAL_SLUG_KEY = 'lb-referral-slug'
const REFERRAL_PATH_KEY = 'lb-referral-path'
const GATE_SKIP_PATHS = new Set(['', 'login', 'create', 'search', 'bets', 'profile', 'admin', 'settings', 'feedback', 'content-guidelines', 'privacy-policy'])

const pad = (n: number) => String(n).padStart(2, '0')

const useCountdown = (targetDate: string) => {
  const calc = () => {
    const diff = new Date(targetDate + 'T00:00:00').getTime() - Date.now()
    if (diff <= 0) return { days: 0, hours: 0, mins: 0, secs: 0 }
    return {
      days:  Math.floor(diff / 86400000),
      hours: Math.floor((diff % 86400000) / 3600000),
      mins:  Math.floor((diff % 3600000)  / 60000),
      secs:  Math.floor((diff % 60000)    / 1000),
    }
  }
  const [tick, setTick] = useState(calc)
  useEffect(() => {
    setTick(calc())
    const id = setInterval(() => setTick(calc()), 1000)
    return () => clearInterval(id)
  }, [targetDate])
  return tick
}

const GATE_SCROLL_PX_PER_SEC = 12 // a very slow ambient drift
// Each row drifts at a slightly different pace so they don't all move in lockstep.
const GATE_ROW_SPEED_FACTORS = [1, 0.78, 1.25]

const CompanyRow = ({ row, speedFactor, selectedCompanyId, onSelectCompany }: { row: { id: string; name: string }[]; speedFactor: number; selectedCompanyId?: string; onSelectCompany?: (companyId: string) => void }) => {
  const trackRef = useRef<HTMLDivElement>(null)
  const [duration, setDuration] = useState(40)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    if (!trackRef.current) return
    // The track renders the row twice back-to-back; one set's width is exactly half of it.
    const setWidth = trackRef.current.scrollWidth / 2
    if (setWidth > 0) setDuration(setWidth / (GATE_SCROLL_PX_PER_SEC * speedFactor))
  }, [row, speedFactor])

  const pause = () => setPaused(true)
  const resume = () => setPaused(false)

  return (
    <div
      className="overflow-hidden pb-2"
      onMouseEnter={pause}
      onMouseLeave={resume}
      onTouchStart={pause}
      onTouchEnd={resume}
    >
      <div
        ref={trackRef}
        className="gate-company-track flex gap-2 w-max"
        style={{ animationDuration: `${duration}s`, animationPlayState: paused ? 'paused' : 'running' }}
      >
        {[...row, ...row].map((c, i) => (
          <button
            key={`${c.id}-${i}`}
            onClick={() => onSelectCompany?.(c.id)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm whitespace-nowrap border transition-colors cursor-pointer appearance-none user-select-none ${
              selectedCompanyId === c.id
                ? 'bg-blue-600 border-blue-500 text-white'
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-600'
            }`}
          >
            {c.name}
          </button>
        ))}
      </div>
    </div>
  )
}

const CompanyGrid = ({ selectedCompanyId, onSelectCompany }: { selectedCompanyId?: string; onSelectCompany?: (companyId: string) => void }) => {
  const companies = useStore(s => s.companies)
  const hiddenCompanyIds = useStore(s => s.hiddenCompanyIds)

  const sorted = companies
    .filter(c => !hiddenCompanyIds.includes(c.id))
    .sort((a, b) => a.name.localeCompare(b.name))

  const rowSize = Math.ceil(sorted.length / 3)
  const rows = [
    sorted.slice(0, rowSize),
    sorted.slice(rowSize, rowSize * 2),
    sorted.slice(rowSize * 2),
  ]

  return (
    <div className="space-y-2">
      {rows.map((row, rowIdx) => (
        <CompanyRow
          key={rowIdx}
          row={row}
          speedFactor={GATE_ROW_SPEED_FACTORS[rowIdx % GATE_ROW_SPEED_FACTORS.length]}
          selectedCompanyId={selectedCompanyId}
          onSelectCompany={onSelectCompany}
        />
      ))}
    </div>
  )
}

const PICK_LIMIT = 4

const PickCompanyModal = ({ onSelect, onClose }: { onSelect: (id: string) => void; onClose: () => void }) => {
  const companies = useStore(s => s.companies)
  const events = useStore(s => s.events)
  const hiddenCompanyIds = useStore(s => s.hiddenCompanyIds)
  const getEffectiveStatus = useStore(s => s.getEffectiveStatus)
  const currentUser = useStore(s => s.currentUser)
  const syncCommentsFromServer = useStore(s => s.syncCommentsFromServer)
  const toggleFavoriteCompany = useStore(s => s.toggleFavoriteCompany)
  const [search, setSearch] = useState('')
  const [showAll, setShowAll] = useState(false)
  const [showAddCompanyModal, setShowAddCompanyModal] = useState(false)
  const [createdCompany, setCreatedCompany] = useState<{ id: string; name: string } | null>(null)
  // A code-gated company (e.g. BNY) picked here always re-asks for its code before following.
  const [pendingCodeCompany, setPendingCodeCompany] = useState<{ id: string; name: string; slug: string } | null>(null)
  const [toast, setToast] = useState('')

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 4000) }

  const handleSuggestCompany = async () => {
    const name = search.trim()
    setSearch('')
    try {
      await api.suggestCompany(name, currentUser?.id)
      showToast(`Thanks! We'll look into adding ${name}.`)
    } catch {
      showToast('Failed to send suggestion — try again later')
    }
  }

  const handleCompanyCreated = (company: { id: string; name: string }) => {
    setShowAddCompanyModal(false)
    setSearch('')
    toggleFavoriteCompany(company.id)
    syncCommentsFromServer()
    setCreatedCompany(company)
  }

  const activeByCompany = useMemo(() => {
    const map: Record<string, number> = {}
    events.forEach(e => {
      if (getEffectiveStatus(e) === 'active') map[e.companyId] = (map[e.companyId] ?? 0) + 1
    })
    return map
  }, [events, getEffectiveStatus])

  const visible = useMemo(() =>
    companies
      .filter(c => !hiddenCompanyIds.includes(c.id))
      .sort((a, b) => {
        const diff = (activeByCompany[b.id] ?? 0) - (activeByCompany[a.id] ?? 0)
        return diff !== 0 ? diff : a.name.localeCompare(b.name)
      }),
    [companies, hiddenCompanyIds, activeByCompany]
  )

  const filtered = search.trim()
    ? visible.filter(c => {
        const q = search.toLowerCase()
        return c.name.toLowerCase().includes(q) || c.aliases?.some(alias => alias.toLowerCase().includes(q))
      })
    : visible

  const displayed = showAll || search.trim() ? filtered : filtered.slice(0, PICK_LIMIT)
  const hasMore = !search.trim() && !showAll && filtered.length > PICK_LIMIT

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center p-4 pt-6" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-sm shadow-2xl p-5 flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-1">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">Follow a company</h2>
          <button onClick={onClose} aria-label="Close" className="-mr-1.5 -mt-0.5 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors flex-shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-sm text-gray-500 dark:text-slate-400 mb-3">Pick one to see its predictions on your home feed.</p>

        <div className="relative mb-3">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            autoFocus
            value={search}
            onChange={e => { setSearch(e.target.value); setShowAll(false) }}
            placeholder="Search for a company..."
            className="w-full pl-9 pr-3 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 transition-colors"
          />
        </div>

        <div className="rounded-xl border border-gray-200 dark:border-slate-700 overflow-y-auto flex-1 min-h-0">
          {displayed.length === 0 ? (
            <div className="px-4 py-3 text-center">
              <p className="text-sm text-gray-400 dark:text-slate-500 mb-1.5">No companies found.</p>
              {search.trim() && (
                currentUser?.isAdmin ? (
                  <button
                    onClick={() => setShowAddCompanyModal(true)}
                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline font-medium"
                  >
                    + Add "{search.trim()}" as a new company
                  </button>
                ) : (
                  <button
                    onClick={handleSuggestCompany}
                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline font-medium"
                  >
                    Suggest adding "{search.trim()}"
                  </button>
                )
              )}
            </div>
          ) : displayed.map((c, i) => {
            const activeCount = activeByCompany[c.id] ?? 0
            return (
              <button
                key={c.id}
                onClick={() => { if (requiredCompanyCode(c)) setPendingCodeCompany(c); else onSelect(c.id) }}
                className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors text-left ${i > 0 ? 'border-t border-gray-100 dark:border-slate-800' : ''}`}
              >
                <CompanyLogo name={c.name} id={c.id} industry={c.industry} color={c.color} size="md" />
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-gray-900 dark:text-white">{c.name}</div>
                  {activeCount > 0 && (
                    <div className="text-xs text-blue-600 dark:text-blue-400">{activeCount} active</div>
                  )}
                </div>
              </button>
            )
          })}
          {hasMore && (
            <button
              onClick={() => setShowAll(true)}
              className="w-full px-4 py-3 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors border-t border-gray-100 dark:border-slate-800 text-left"
            >
              all results →
            </button>
          )}
        </div>

        <p className="mt-4 text-center text-xs text-gray-400 dark:text-slate-500">
          Have an account?{' '}
          <a href="/login?gate=1" className="text-blue-600 dark:text-blue-400 hover:underline">Sign in</a>
        </p>
      </div>

      {showAddCompanyModal && (
        <AddCompanyModal
          initialName={search.trim()}
          onClose={() => setShowAddCompanyModal(false)}
          onCreated={handleCompanyCreated}
        />
      )}

      {createdCompany && (
        <CompanyCreatedModal
          companyName={createdCompany.name}
          onClose={() => setCreatedCompany(null)}
          // No router context is mounted this early (this modal lives above BrowserRouter),
          // so a full navigation is used instead of useNavigate.
          onCreateEvent={() => { window.location.href = `/admin?tab=events&newEventCompanyId=${createdCompany.id}` }}
        />
      )}

      {pendingCodeCompany && (
        <div className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center p-4" onClick={() => setPendingCodeCompany(null)}>
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-end p-2">
              <button onClick={() => setPendingCodeCompany(null)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-2 pb-6">
              <CompanyCodePrompt
                company={pendingCodeCompany}
                requiredCode={requiredCompanyCode(pendingCodeCompany)!}
                onUnlock={() => { const id = pendingCodeCompany.id; setPendingCodeCompany(null); onSelect(id) }}
              />
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white dark:bg-slate-100 text-gray-900 dark:text-slate-900 px-5 py-2.5 rounded-full text-sm font-medium shadow-lg z-[60] pointer-events-none">
          {toast}
        </div>
      )}
    </div>
  )
}

const SiteGate = ({ children }: { children: ReactNode }) => {
  const currentUser = useStore(s => s.currentUser)
  const companies = useStore(s => s.companies)
  const events = useStore(s => s.events)
  const syncCommentsFromServer = useStore(s => s.syncCommentsFromServer)
  // Whether the invite code is required is a global server setting (synced on mount), so an
  // admin toggling it applies to everyone — not just their own browser.
  const codeRequired = useStore(s => s.appSettings.codeRequired)
  const [unlocked, setUnlocked] = useState(() => localStorage.getItem(GATE_KEY) === '1')
  const [launchDate, setLaunchDate] = useState(() => localStorage.getItem(LAUNCH_DATE_KEY) || DEFAULT_LAUNCH)
  const [input, setInput] = useState('')
  const [error, setError] = useState(false)
  const [shake, setShake] = useState(false)
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>()
  // A company picked on the gate that first needs its access code (e.g. BNY).
  const [pendingCodeCompany, setPendingCodeCompany] = useState<{ id: string; name: string; slug: string } | null>(null)
  const [anonUsername, setAnonUsername] = useState<string>('')
  const [loadingAnonId, setLoadingAnonId] = useState(true)
  const [showPolicies, setShowPolicies] = useState(false)
  const [policiesTab, setPoliciesTab] = useState<'guidelines' | 'privacy'>('guidelines')
  const [showPickCompany, setShowPickCompany] = useState(false)

  // Gate admin state
  const [adminOpen, setAdminOpen] = useState(false)
  const [adminStep, setAdminStep] = useState<'login' | 'settings'>('login')
  const [adminUser, setAdminUser] = useState('')
  const [adminPass, setAdminPass] = useState('')
  const [adminErr, setAdminErr] = useState(false)
  const [newDate, setNewDate] = useState(launchDate)
  const [saved, setSaved] = useState(false)

  const { days, hours, mins, secs } = useCountdown(launchDate)

  const launchLabel = new Date(launchDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

  // Capture referral slug + full deep-link path from URL before showing gate
  useEffect(() => {
    if (!unlocked) {
      const slug = window.location.pathname.replace(/^\//, '').split('/')[0]
      if (slug && !GATE_SKIP_PATHS.has(slug)) {
        sessionStorage.setItem(REFERRAL_SLUG_KEY, slug)
        sessionStorage.setItem(REFERRAL_PATH_KEY, window.location.pathname + window.location.search)
      }
    }
  }, [])

  // Load public data on the gate itself so the company grid isn't empty on a first visit.
  // DataSync (which normally syncs) only mounts after the gate is unlocked; on return visits
  // the persisted store already has companies, but a brand-new browser starts empty.
  useEffect(() => {
    if (!unlocked) syncCommentsFromServer()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Auto-select referral company pill once companies load
  useEffect(() => {
    if (unlocked || !companies.length) return
    const slug = sessionStorage.getItem(REFERRAL_SLUG_KEY)
    if (!slug) return
    const company = companies.find(c => c.slug === slug)
    if (company) setSelectedCompanyId(company.id)
  }, [companies, unlocked])

  // Prevent code input from being auto-focused on mount
  useEffect(() => {
    const blurActive = () => {
      if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
    }
    requestAnimationFrame(blurActive)
    const timer = setTimeout(blurActive, 150)
    return () => clearTimeout(timer)
  }, [])

  // Fetch next anonymous username on mount
  useEffect(() => {
    const fetchAnonId = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/next-anon-id`)
        const data = await res.json()
        setAnonUsername(data.username)
      } catch (err) {
        console.error('Failed to fetch anonymous ID:', err)
        // Fallback: use timestamp as the sequential number, padded to 7 digits
        const timestamp = Date.now().toString().slice(-7)
        const paddedNum = String(parseInt(timestamp) % 10000000).padStart(7, '0')
        setAnonUsername(`Anon${paddedNum}`)
      } finally {
        setLoadingAnonId(false)
      }
    }
    if (!unlocked) {
      fetchAnonId()
    } else {
      setLoadingAnonId(false)
    }
  }, [unlocked])

  // If user logs in, bypass the gate. Reset gate when user logs out.
  useEffect(() => {
    if (currentUser) {
      setUnlocked(true)
      requestAnimationFrame(() => {
        window.scrollTo(0, 0)
        document.documentElement.scrollTop = 0
        document.body.scrollTop = 0
      })
    } else {
      // When user logs out, always reset gate to locked so next user must enter password
      setUnlocked(false)
    }
  }, [currentUser])

  // The 5 most recent WARN Act notices for the preview table. Worker counts live inside the
  // generated title ("… of 1,200 workers by …"), so parse them out; sort newest-first by
  // when the notice was posted. Falls back to representative samples on a fresh/empty DB so
  // the gate never renders a blank table. Declared before the early return below so hook
  // order stays stable across the locked/unlocked renders.
  const recentWarnNotices = useMemo(() => {
    const parseWorkers = (title: string): string => {
      const m = title.replace(/,/g, '').match(/of\s+(\d+)\s+workers?/i)
      return m ? Number(m[1]).toLocaleString() : '—'
    }
    const real = events
      .filter(e => e.isWarnActNotice)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5)
      .map(e => ({ company: e.companyName, companyId: e.companyId as string | undefined, employees: parseWorkers(e.title), date: new Date(e.createdAt) }))
    if (real.length > 0) return real
    // Sample rows — still clickable when the named company happens to exist in the store.
    const byName = (name: string) => companies.find(c => c.name.toLowerCase() === name.toLowerCase())?.id
    return [
      { company: 'Acme Inc', companyId: byName('Acme Inc'), employees: '1,240', date: new Date('2026-07-18T00:00:00') },
      { company: 'Verizon', companyId: byName('Verizon'), employees: '860', date: new Date('2026-07-11T00:00:00') },
      { company: 'Conduent', companyId: byName('Conduent'), employees: '540', date: new Date('2026-07-03T00:00:00') },
      { company: 'BNSF', companyId: byName('BNSF'), employees: '410', date: new Date('2026-06-24T00:00:00') },
      { company: 'ADP', companyId: byName('ADP'), employees: '295', date: new Date('2026-06-15T00:00:00') },
    ]
  }, [events, companies])

  const fmtNoticeDate = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  // Clicking a WARN-notice row enters the site with that company pre-selected. Code-gated
  // companies (e.g. BNY) prompt for their code first, matching the gate pill behavior.
  const handleNoticeClick = (companyId?: string) => {
    if (loadingAnonId) return
    if (!companyId) return enterSite()
    const c = companies.find(x => x.id === companyId)
    if (c && requiredCompanyCode(c) && !isCompanyUnlocked(c)) { setPendingCodeCompany(c); return }
    enterSite(companyId)
  }

  if (unlocked || window.location.pathname === '/login') return (
    <>
      {children}
      {showPickCompany && (
        <PickCompanyModal
          onSelect={(companyId) => {
            localStorage.setItem(ANON_FAVORITE_COMPANY_KEY, companyId)
            useStore.getState().toggleFavoriteCompany(companyId)
            setShowPickCompany(false)
          }}
          onClose={() => setShowPickCompany(false)}
        />
      )}
    </>
  )

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    enterSite()
  }

  // Shared entry path used by the main gate form, the bottom CTA, and the WARN-notice rows.
  // An optional companyIdOverride enters the site with that company pre-selected (favorited),
  // exactly as if the user had entered and then picked it.
  const enterSite = async (companyIdOverride?: string) => {
    if (!codeRequired || GATE_CODES.includes(input.trim().toLowerCase())) {
      try {
        setLoadingAnonId(true)
        console.log('[Gate] Starting anonymous user creation flow...')

        // Create a fresh anonymous user server-side (handles sequential numbering atomically)
        console.log('[Gate] Sending POST request to /api/users/anonymous...')
        const res = await fetch(`${API_BASE}/api/users/anonymous`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) })
        console.log('[Gate] Response status:', res.status, res.statusText)

        let data
        try {
          data = await res.json()
          console.log('[Gate] Response JSON:', data)
        } catch (parseErr) {
          console.error('[Gate] Failed to parse response JSON:', parseErr)
          throw new Error(`Invalid response from server: ${res.status}`)
        }

        if (!res.ok) {
          const errorMsg = data?.error || `HTTP ${res.status}: ${res.statusText}`
          console.error('[Gate] Server returned error status. Message:', errorMsg)
          throw new Error(errorMsg)
        }

        const user = data
        console.log('[Gate] Successfully created anonymous user:', user.username, user.id)

        // Store in localStorage. Persist the anon id under the key the migration path reads
        // (`lb-anon-user-id`) so that if this anonymous visitor later registers, their bets,
        // favorites and history are transitioned onto the new registered account.
        console.log('[Gate] Storing user in localStorage...')
        localStorage.setItem('layoff-bets-currentUser', JSON.stringify(user))
        localStorage.setItem('lb-anon-user-id', user.id)

        // Don't lock the gate permanently - allow others to enter
        // localStorage.setItem(GATE_KEY, '1')

        // Sync data from server BEFORE setting currentUser so Home has data ready
        await syncCommentsFromServer()

        // Now set currentUser and navigate to home
        useStore.setState({ currentUser: user })

        // Resolve effective company: gate selection OR referral slug from URL
        let effectiveCompanyId = companyIdOverride ?? selectedCompanyId
        const referralSlug = sessionStorage.getItem(REFERRAL_SLUG_KEY)
        const referralPath = sessionStorage.getItem(REFERRAL_PATH_KEY)
        if (!effectiveCompanyId && referralSlug) {
          const referred = useStore.getState().companies.find(c => c.slug === referralSlug)
          if (referred) effectiveCompanyId = referred.id
        }
        sessionStorage.removeItem(REFERRAL_SLUG_KEY)
        sessionStorage.removeItem(REFERRAL_PATH_KEY)

        if (effectiveCompanyId) {
          localStorage.setItem(ANON_FAVORITE_COMPANY_KEY, effectiveCompanyId)
          useStore.getState().toggleFavoriteCompany(effectiveCompanyId)
        }

        if (referralPath) {
          // Shared company/bet/chat link — take the user straight to that screen
          window.history.pushState({}, '', referralPath)
          setShowPickCompany(false)
        } else {
          // Always reset — SiteGate persists across sessions so stale true must be cleared
          setShowPickCompany(!effectiveCompanyId)
        }
        setUnlocked(true)
        requestAnimationFrame(() => {
          window.scrollTo(0, 0)
          document.documentElement.scrollTop = 0
          document.body.scrollTop = 0
        })
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err)
        console.error('[Gate] ERROR during anonymous user creation:', errorMsg, err)
        console.error('[Gate] Stack:', err instanceof Error ? err.stack : 'N/A')
        setError(true); setShake(true); setInput('')
        setTimeout(() => setShake(false), 500)
      } finally {
        setLoadingAnonId(false)
      }
    } else {
      setError(true); setShake(true); setInput('')
      setTimeout(() => setShake(false), 500)
    }
  }

  const adminLogin = (e: React.FormEvent) => {
    e.preventDefault()
    if (adminUser.trim().toLowerCase() === GATE_ADMIN_USER && adminPass.toLowerCase() === GATE_ADMIN_PASS) {
      setAdminStep('settings'); setAdminErr(false)
    } else {
      setAdminErr(true); setAdminPass('')
    }
  }

  const saveDate = (e: React.FormEvent) => {
    e.preventDefault()
    localStorage.setItem(LAUNCH_DATE_KEY, newDate)
    setLaunchDate(newDate)
    setSaved(true)
    setTimeout(() => { setSaved(false); setAdminOpen(false); setAdminStep('login'); setAdminUser(''); setAdminPass('') }, 1200)
  }

  // Reused by the top entry area and the repeated CTA above the disclaimer.
  const enterButton = (
    <button type="submit" disabled={loadingAnonId} className="w-full bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed">
      {loadingAnonId ? 'Loading...' : 'Enter anonymously'}
    </button>
  )
  const signInLink = (
    <p className="text-center mt-3">
      <a href="/login?gate=1" className="text-xs text-slate-500 transition-colors">
        Have an account? <span className="text-blue-400 hover:text-blue-300">Sign in</span>
      </a>
    </p>
  )

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        {/* Tagline */}
        <div className="flex justify-center mb-10">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1.5 mb-2">
              <div className="relative w-6 h-6 flex-shrink-0">
                <MessageSquare className="absolute left-0 top-0 w-4 h-4 text-gray-500 dark:text-slate-400 opacity-80" strokeWidth={2.5} />
                <MessageSquare className="absolute right-0 bottom-0 w-4 h-4 text-blue-600 dark:text-blue-400 opacity-80 -scale-x-100" strokeWidth={2.5} />
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-semibold text-gray-600 dark:text-slate-300 tracking-tight">Layoff</span>
                <span className="text-2xl font-black text-blue-600 dark:text-blue-400 tracking-tight">Chat</span>
              </div>
            </div>
            <div className="text-sm text-slate-400 tracking-wide uppercase">See it coming</div>
          </div>
        </div>

        {/* Company selection grid */}
        <div className="mb-6">
          <CompanyGrid selectedCompanyId={selectedCompanyId} onSelectCompany={(id) => {
            if (selectedCompanyId === id) { setSelectedCompanyId(undefined); return }
            const c = companies.find(x => x.id === id)
            // A code-gated company (e.g. BNY) must have its code entered before it can be
            // selected on the gate, the same as visiting its page.
            if (c && requiredCompanyCode(c) && !isCompanyUnlocked(c)) { setPendingCodeCompany(c); return }
            setSelectedCompanyId(id)
          }} />
        </div>

        {/* Entry: a card wrapper only when an invite code is required; otherwise just the
            button + sign-in, no container. */}
        {codeRequired ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl">
            <form onSubmit={submit} className="space-y-3">
              <div className={shake ? 'animate-[wiggle_0.4s_ease-in-out]' : ''}>
                <input
                  type="text"
                  value={input}
                  onChange={e => { setInput(e.target.value); setError(false) }}
                  placeholder="Enter invite code"
                  autoComplete="off"
                  className={`w-full bg-slate-800 border ${error ? 'border-rose-500' : 'border-slate-700 focus:border-blue-500'} rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors text-sm`}
                />
              </div>
              {error && (
                <p className="text-xs text-rose-400 flex items-center gap-1.5">
                  <span className="inline-block w-1.5 h-1.5 bg-rose-400 rounded-full" />
                  That's not right — try again
                </p>
              )}
              {enterButton}
              {signInLink}
            </form>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            {enterButton}
            {signInLink}
          </form>
        )}

        {/* ── Preview blocks: a taste of what's inside, each with a CTA to enter ── */}

        {/* 1. Recent WARN notices */}
        <div className="mt-6 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl">
          <div className="mb-3">
            <div className="text-sm font-semibold text-white leading-tight">Latest layoff notices</div>
          </div>
          <div className="overflow-hidden rounded-xl border border-slate-800">
            <table className="w-full text-left">
              <tbody>
                {recentWarnNotices.map((n, i) => (
                  <tr
                    key={i}
                    onClick={() => handleNoticeClick(n.companyId)}
                    className={`text-xs cursor-pointer hover:bg-slate-800/60 transition-colors ${i > 0 ? 'border-t border-slate-800' : ''}`}
                  >
                    <td className="px-3 py-2">
                      <span className="inline-block max-w-[120px] truncate align-middle px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-200 text-[11px] font-medium">{n.company}</span>
                    </td>
                    <td className="px-2 py-2">
                      <span className="flex items-center justify-end gap-1 tabular-nums text-slate-300">
                        <User className="w-3 h-3 text-slate-500 flex-shrink-0" />{n.employees}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-slate-400 whitespace-nowrap">{fmtNoticeDate(n.date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 2. Sample chat — secondary (dimmer than the WARN block above) */}
        <div className="mt-6 bg-slate-900/40 border border-slate-800/60 rounded-2xl p-5">
          <div className="mb-3">
            <div className="text-sm font-semibold text-white leading-tight">Inside the break room</div>
          </div>
          <div className="space-y-2.5">
            <div className="flex justify-start">
              <div className="bg-slate-800 text-slate-200 text-xs rounded-2xl rounded-tl-sm px-3 py-2 max-w-[85%]">Badge readers went quiet on the 4th floor this morning. Seen this movie before.</div>
            </div>
            <div className="flex justify-end">
              <div className="bg-slate-600 text-white text-xs rounded-2xl rounded-tr-sm px-3 py-2 max-w-[85%]">All-hands got moved to Friday at 4pm. Nobody schedules good news for a Friday afternoon.</div>
            </div>
            <div className="flex justify-start">
              <div className="bg-slate-800 text-slate-200 text-xs rounded-2xl rounded-tl-sm px-3 py-2 max-w-[85%]">Reorg deck already leaked. Severance line item's back. Buckle up.</div>
            </div>
          </div>
        </div>

        {/* 3. Sample bet — secondary (dimmer than the WARN block above) */}
        <div className="mt-6 bg-slate-900/40 border border-slate-800/60 rounded-2xl p-5">
          <div className="mb-3">
            <div className="text-sm font-semibold text-white leading-tight">Live predictions</div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-800/40 p-3.5">
            <div className="text-sm font-semibold text-slate-100 mb-2.5">Will Acme Inc announce layoffs by Sep 30?</div>
            <div className="flex h-2.5 rounded-full overflow-hidden mb-2">
              <div className="bg-emerald-500" style={{ width: '68%' }} />
              <div className="bg-rose-500" style={{ width: '32%' }} />
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-emerald-400">YES 68%</span>
              <span className="font-semibold text-rose-400">NO 32%</span>
            </div>
            <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-slate-800 text-[11px] text-slate-400">
              <Users className="w-3.5 h-3.5" />
              <span>412 predictions · 38.6k coins in play</span>
            </div>
          </div>
        </div>

        {/* Repeated entry CTA at the foot of the previews */}
        <button type="button" onClick={() => enterSite()} disabled={loadingAnonId} className="mt-6 w-full bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed">
          {loadingAnonId ? 'Loading...' : 'Enter anonymously'}
        </button>

        <div className="text-center mt-6 space-y-3">
          <p className="text-xs text-slate-500 leading-relaxed">All predictions and bets use virtual coins with no real-world or monetary value — not financial, legal, or gambling activity. An anonymous open forum; posts are user-generated and not endorsed by Layoff Chat. Anonymous sessions and interactions are tracked for analytics.</p>
          <p className="text-xs text-slate-600">{APP_VERSION}</p>
          <div className="flex items-center justify-center gap-2 text-xs">
            <button onClick={() => { setShowPolicies(true); setPoliciesTab('guidelines') }} className="text-slate-600 hover:text-slate-500 transition-colors">Content Guidelines</button>
            <span className="text-slate-600">·</span>
            <button onClick={() => { setShowPolicies(true); setPoliciesTab('privacy') }} className="text-slate-600 hover:text-slate-500 transition-colors">Privacy Policy</button>
          </div>
        </div>
      </div>

      {/* Access-code prompt when a gated company (e.g. BNY) is picked on the gate */}
      {pendingCodeCompany && (
        <div className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center p-4" onClick={() => setPendingCodeCompany(null)}>
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-end p-2">
              <button onClick={() => setPendingCodeCompany(null)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-2 pb-6">
              <CompanyCodePrompt
                company={pendingCodeCompany}
                requiredCode={requiredCompanyCode(pendingCodeCompany)!}
                onUnlock={() => { setSelectedCompanyId(pendingCodeCompany.id); setPendingCodeCompany(null) }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Admin modal */}
      {adminOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-6 z-50" onClick={() => setAdminOpen(false)}>
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-xs shadow-2xl" onClick={e => e.stopPropagation()}>
            {adminStep === 'login' ? (
              <>
                <p className="text-sm font-semibold text-white mb-4">Admin access</p>
                <form onSubmit={adminLogin} className="space-y-3">
                  <input value={adminUser} onChange={e => { setAdminUser(e.target.value); setAdminErr(false) }} placeholder="Username" autoFocus className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-colors" />
                  <input type="password" value={adminPass} onChange={e => { setAdminPass(e.target.value); setAdminErr(false) }} placeholder="Password" className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-colors" />
                  {adminErr && <p className="text-xs text-rose-400">Incorrect credentials</p>}
                  <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors">Sign in</button>
                </form>
              </>
            ) : (
              <>
                <p className="text-sm font-semibold text-white mb-1">Launch date</p>
                <p className="text-xs text-slate-500 mb-4">Set the public launch date shown on the gate</p>
                <form onSubmit={saveDate} className="space-y-3">
                  <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors" />
                  <button type="submit" className={`w-full text-sm font-semibold py-2.5 rounded-xl transition-colors ${saved ? 'bg-emerald-600 text-white' : 'bg-blue-600 hover:bg-blue-500 text-white'}`}>
                    {saved ? '✓ Saved' : 'Save date'}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      {/* Policies Bottom Sheet with Tabs */}
      {showPolicies && (
        <>
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" onClick={() => setShowPolicies(false)} />
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-slate-900 rounded-t-2xl shadow-2xl border-t border-gray-200 dark:border-slate-800 max-h-[80vh] overflow-y-auto flex flex-col">
            <div className="sticky top-0 bg-white dark:bg-slate-900 flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-800">
              <div className="flex gap-4">
                <button onClick={() => setPoliciesTab('guidelines')} className={`font-medium transition-colors ${policiesTab === 'guidelines' ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-slate-500'}`}>
                  Content Guidelines
                </button>
                <button onClick={() => setPoliciesTab('privacy')} className={`font-medium transition-colors ${policiesTab === 'privacy' ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-slate-500'}`}>
                  Privacy Policy
                </button>
              </div>
              <button onClick={() => setShowPolicies(false)} className="p-1 rounded-lg text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-4 space-y-4 text-sm text-gray-700 dark:text-slate-300">
              {policiesTab === 'guidelines' ? (
                <>
                  <p className="text-gray-600 dark:text-slate-400">
                    Layoff Chat is an anonymous open forum built on good-faith participation. Current and former employees can post anonymously. These guidelines protect all users and keep the platform valuable and safe.
                  </p>
                  <p className="text-gray-600 dark:text-slate-400">
                    All predictions and bets use virtual coins with no real-world or monetary value — not financial, legal, or gambling advice. Posts are user-generated and not endorsed by Layoff Chat.
                  </p>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Prohibited Content</h3>
                    <ul className="space-y-1 text-gray-600 dark:text-slate-400">
                      <li>• Illegal content of any kind</li>
                      <li>• Harassment, threats, or targeted bullying</li>
                      <li>• Personal identifying information or confidential data</li>
                      <li>• Impersonating users, companies, or public figures</li>
                      <li>• Sexually explicit or NSFW content</li>
                      <li>• Spam, coordinated manipulation, or bot activity</li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Event Quality Standards</h3>
                    <ul className="space-y-1 text-gray-600 dark:text-slate-400">
                      <li>• Events must be specific and verifiable</li>
                      <li>• Events tied to real companies only</li>
                      <li>• No events designed to manipulate or spread misinformation</li>
                      <li>• No duplicate events for the same prediction</li>
                    </ul>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <p className="text-gray-500 dark:text-slate-500 text-xs mb-2">Last updated: July 2026</p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Our Commitment to Anonymity</h3>
                    <p className="text-gray-600 dark:text-slate-400">
                      Layoff Chat is built anonymous-first. We do not require your real name, email address, employer, or any identifying information. Your username is the only identity associated with your activity.
                    </p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Data We Collect</h3>
                    <ul className="space-y-1 text-gray-600 dark:text-slate-400">
                      <li>• IP address (fraud prevention)</li>
                      <li>• First-party cookies &amp; an anonymous session id</li>
                      <li>• Interaction analytics (events, bets, comments, chat, favorites, active usage)</li>
                      <li>• Account data (username, password, virtual coins)</li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Analytics &amp; Tracking</h3>
                    <p className="text-gray-600 dark:text-slate-400">
                      Anonymous sessions and platform interactions are tracked in aggregate (user counts and active-usage trends). We do not use third-party advertising or cross-site tracking cookies.
                    </p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Data We Do Not Collect</h3>
                    <ul className="space-y-1 text-gray-600 dark:text-slate-400">
                      <li>• Real names or personal identifiers</li>
                      <li>• Email addresses</li>
                      <li>• Employer or employment status</li>
                      <li>• Location data beyond region</li>
                      <li>• Financial or payment information</li>
                    </ul>
                  </div>
                </>
              )}
            </div>
          </div>
        </>
      )}

      <style>{`
        @keyframes wiggle {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-6px); }
          40% { transform: translateX(6px); }
          60% { transform: translateX(-4px); }
          80% { transform: translateX(4px); }
        }
        @keyframes gate-company-scroll {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        .gate-company-track {
          animation-name: gate-company-scroll;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
        }
      `}</style>
    </div>
  )
}

import { Home } from './pages/Home'
import { Login } from './pages/Login'
import { Feed } from './pages/Feed'
import { Bets } from './pages/Bets'
import { EventDetail } from './pages/EventDetail'
import { CreateEvent } from './pages/CreateEvent'
import { CompanyPage } from './pages/CompanyPage'
import { Search } from './pages/Search'
import { Profile } from './pages/Profile'
import { Admin } from './pages/Admin'
import { UserAnalytics } from './pages/UserAnalytics'
import { FeedbackAdmin } from './pages/FeedbackAdmin'
import { Settings } from './pages/Settings'
import { ContentGuidelines } from './pages/ContentGuidelines'
import { PrivacyPolicy } from './pages/PrivacyPolicy'
import { CookieBanner } from './components/CookieBanner'
import { CompanySuggestionsAlert } from './components/CompanySuggestionsAlert'
import { ModerationQueueAlert } from './components/ModerationQueueAlert'
import { CompanyDuplicatesAlert } from './components/CompanyDuplicatesAlert'

const Protected = ({ children }: { children: ReactNode }) => {
  const currentUser = useStore(s => s.currentUser)
  return currentUser ? <>{children}</> : <Navigate to="/login" replace />
}

const AdminOnly = ({ children }: { children: ReactNode }) => {
  const currentUser = useStore(s => s.currentUser)
  if (!currentUser) return <Navigate to="/login" replace />
  if (!currentUser.isAdmin) return <Navigate to="/" replace />
  return <>{children}</>
}

const ThemeEffect = () => {
  const theme = useStore(s => s.theme)
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])
  return null
}

import { useLocation } from 'react-router-dom'

const ScrollToTop = () => {
  const { pathname } = useLocation()
  useEffect(() => {
    // Scroll to top on next frame to ensure DOM is ready
    requestAnimationFrame(() => {
      window.scrollTo(0, 0)
      document.documentElement.scrollTop = 0
      document.body.scrollTop = 0
    })
  }, [pathname])
  return null
}

const DataSync = () => {
  const syncCommentsFromServer = useStore(s => s.syncCommentsFromServer)
  const restoreSession = useStore(s => s.restoreSession)
  const initializeAnonymousUser = useStore(s => s.initializeAnonymousUser)

  useEffect(() => {
    const initApp = async () => {
      // Wait for store rehydration to complete
      // This ensures persist middleware has fully loaded saved state
      await new Promise(r => setTimeout(r, 100))

      // Restore user session from localStorage
      restoreSession()

      // Initialize anonymous user with server-side storage
      const currentUser = useStore.getState().currentUser
      if (!currentUser) {
        await initializeAnonymousUser()
      }

      // For anonymous users, fallback to cookie if localStorage has no favorites
      // (persist middleware handles normal restore via 'layoff-bets-store-v6' key)
      const currentFavs = useStore.getState().favoriteCompanyIds
      if (!currentUser && (!currentFavs || currentFavs.length === 0)) {
        // Only restore from cookie if no favorites in store
        const cookies = document.cookie.split(';')
        const cookieFav = cookies.find(c => c.trim().startsWith('lb-anon-favorites='))
        if (cookieFav) {
          try {
            const favStr = cookieFav.split('=')[1]
            const favs = JSON.parse(favStr)
            if (Array.isArray(favs) && favs.length > 0) {
              useStore.setState({ favoriteCompanyIds: favs })
            }
          } catch (e) {
            console.error('Failed to restore anonymous favorites from cookie:', e)
          }
        }
      }

      // Wait a moment for registration API to complete if in progress
      const registering = localStorage.getItem('layoff-bets-registering')
      if (registering) {
        console.log('[DataSync] Registration in progress, waiting...')
        // Wait up to 5 seconds for registration to complete
        for (let i = 0; i < 50; i++) {
          if (!localStorage.getItem('layoff-bets-registering')) {
            console.log('[DataSync] Registration completed')
            break
          }
          await new Promise(r => setTimeout(r, 100))
        }
      }

      // Sync from server to get latest data
      await syncCommentsFromServer()

      // Record this viewer as active today (DAU/WAU/MAU). Fire once now that identity is
      // resolved, then on a slow interval so long sessions crossing midnight still count.
      pingActivity()
    }

    initApp()

    // Sync every 5 seconds to keep data updated
    const interval = setInterval(() => {
      syncCommentsFromServer()
    }, 5000)

    // Activity ping every 5 minutes (the upsert is idempotent per day, so this is cheap).
    const activityInterval = setInterval(pingActivity, 5 * 60 * 1000)

    return () => { clearInterval(interval); clearInterval(activityInterval) }
  }, [syncCommentsFromServer, restoreSession, initializeAnonymousUser])

  return null
}

// Resolves the current viewer's identity (registered or anonymous) and records a daily
// activity ping. Best-effort — the api wrapper swallows errors so this never disrupts the app.
const pingActivity = () => {
  const s = useStore.getState()
  const cu = s.currentUser
  const anonId = typeof window !== 'undefined' ? localStorage.getItem('lb-anon-user-id') : null
  const anon = anonId ? s.users.find(u => u.id === anonId) : s.users.find(u => u.isAnonymous)
  const userId = cu?.id || anon?.id
  if (!userId) return
  const isAnonymous = cu ? !!cu.isAnonymous : true
  api.pingActivity(userId, isAnonymous)
}

export const App = () => (
  <SiteGate>
  <BrowserRouter>
    <ThemeEffect />
    <ScrollToTop />
    <DataSync />
    <CompanySuggestionsAlert />
    <ModerationQueueAlert />
    <CompanyDuplicatesAlert />
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/guidelines" element={<ContentGuidelines />} />
      <Route path="/privacy" element={<PrivacyPolicy />} />

      <Route path="/:slug" element={<CompanyPage />} />
      <Route path="/:slug/bet/:id/*" element={<EventDetail />} />
      <Route path="/event/:id" element={<EventDetail />} />
      <Route path="/search" element={<Search />} />

      <Route path="/feed" element={<Protected><Feed /></Protected>} />
      <Route path="/bets" element={<Bets />} />
      <Route path="/create" element={<CreateEvent />} />
      <Route path="/profile" element={<Protected><Profile /></Protected>} />
      <Route path="/settings" element={<Protected><Settings /></Protected>} />
      <Route path="/admin" element={<AdminOnly><Admin /></AdminOnly>} />
      <Route path="/user-analytics" element={<AdminOnly><UserAnalytics /></AdminOnly>} />
      <Route path="/feedback-admin" element={<AdminOnly><FeedbackAdmin /></AdminOnly>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    <CookieBanner />
  </BrowserRouter>
  </SiteGate>
)
