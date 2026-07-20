import { useState, useEffect, useMemo } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ChevronLeft, Users, UserCheck, UserX, Activity, Shield, Search, ArrowUpDown } from 'lucide-react'
import { Layout } from '../components/Layout'
import { useStore } from '../store/useStore'
import { api } from '../services/api'

// ---- payload shape (mirrors db.getAnalytics) ----
interface Split { anonymous: number; registered: number }
interface CompanyStat { id: string; name: string; slug: string; clicks: number; events: number; bets: number; comments: number; chatMessages: number; favorites: number }
interface Analytics {
  generatedAt: string
  rangeDays: number
  hasActivityData: boolean
  totals: { totalUsers: number; anonymousUsers: number; registeredUsers: number; admins: number }
  activeUsers: { dau: number; wau: number; mau: number }
  actionTotals: { events: number; bets: number; comments: number; chatMessages: number; favorites: number }
  actionTotalsByType: { events: Split; bets: Split; comments: Split; chatMessages: Split; favorites: Split }
  series: {
    newUsers: { date: string; anonymous: number; registered: number }[]
    actions: { date: string; events: number; bets: number; comments: number; chatMessages: number }[]
    activeUsers: { date: string; count: number }[]
  }
  companyStats: CompanyStat[]
}

const RANGES = [
  { label: '7 days', days: 7 },
  { label: '30 days', days: 30 },
  { label: '90 days', days: 90 },
]

// Validated categorical pair (dataviz skill): anonymous = blue slot 1, registered = green
// slot 2. Colorblind-safe adjacent pair; a legend + direct value labels accompany every
// use so identity is never carried by color alone.
const useColors = () => {
  const theme = useStore(s => s.theme)
  const isDark = theme === 'dark'
  return {
    isDark,
    anon: isDark ? '#3987e5' : '#2a78d6',
    reg: '#008300',
    line: isDark ? '#3987e5' : '#2a78d6',
    ink: isDark ? '#c3c2b7' : '#52514e',
    muted: '#898781',
    grid: isDark ? '#2c2c2a' : '#e1e0d9',
    axis: isDark ? '#383835' : '#c3c2b7',
  }
}

const fmt = (n: number) => n.toLocaleString('en-US')
const shortDate = (iso: string) => {
  const d = new Date(iso + 'T00:00:00Z')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
}

// ---- stat tile ----
const StatTile = ({ label, value, sub, icon: Icon }: { label: string; value: number; sub?: string; icon: React.ComponentType<{ className?: string }> }) => (
  <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-4">
    <div className="flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide">
      <Icon className="w-3.5 h-3.5" /> {label}
    </div>
    <div className="mt-1.5 text-2xl font-bold text-gray-900 dark:text-white tabular-nums">{fmt(value)}</div>
    {sub && <div className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">{sub}</div>}
  </div>
)

const Legend = ({ items }: { items: { color: string; label: string }[] }) => (
  <div className="flex items-center gap-4 flex-wrap">
    {items.map(it => (
      <div key={it.label} className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-slate-300">
        <span className="w-3 h-3 rounded-sm" style={{ background: it.color }} />
        {it.label}
      </div>
    ))}
  </div>
)

const ChartCard = ({ title, right, children }: { title: string; right?: React.ReactNode; children: React.ReactNode }) => (
  <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-4">
    <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h3>
      {right}
    </div>
    {children}
  </div>
)

// ---- stacked daily bars (new users: anonymous + registered) ----
const StackedBars = ({ data }: { data: { date: string; anonymous: number; registered: number }[] }) => {
  const c = useColors()
  const [hover, setHover] = useState<number | null>(null)
  const VBW = 720, VBH = 200, padB = 22, padT = 8
  const n = data.length
  if (n === 0) return <div className="h-32 flex items-center justify-center text-xs text-gray-400 dark:text-slate-500">No data in this range</div>
  const max = Math.max(1, ...data.map(d => d.anonymous + d.registered))
  const plotH = VBH - padB - padT
  const slot = VBW / n
  const gap = n > 60 ? 0.5 : 2
  const barW = Math.max(1, slot - gap)
  const anyData = data.some(d => d.anonymous + d.registered > 0)

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${VBW} ${VBH}`} className="w-full h-auto" onMouseLeave={() => setHover(null)}>
        {/* gridlines */}
        {[0, 0.5, 1].map(t => (
          <line key={t} x1={0} x2={VBW} y1={padT + plotH * t} y2={padT + plotH * t} stroke={c.grid} strokeWidth={1} />
        ))}
        {data.map((d, i) => {
          const x = i * slot + gap / 2
          const regH = (d.registered / max) * plotH
          const anonH = (d.anonymous / max) * plotH
          const regY = padT + plotH - regH
          const anonY = regY - anonH - (regH > 0 && anonH > 0 ? 2 : 0) // 2px surface gap between segments
          return (
            <g key={d.date}>
              {d.registered > 0 && <rect x={x} y={regY} width={barW} height={regH} rx={1.5} fill={c.reg} />}
              {d.anonymous > 0 && <rect x={x} y={Math.max(padT, anonY)} width={barW} height={anonH} rx={1.5} fill={c.anon} />}
              {/* hover hit target spans full column height */}
              <rect x={x - gap / 2} y={0} width={slot} height={VBH} fill="transparent"
                onMouseEnter={() => setHover(i)} />
            </g>
          )
        })}
        {/* x labels: first, middle, last */}
        {[0, Math.floor(n / 2), n - 1].map(i => (
          <text key={i} x={i * slot + slot / 2} y={VBH - 6} fontSize={10} fill={c.muted} textAnchor="middle">{shortDate(data[i].date)}</text>
        ))}
        {hover !== null && (
          <line x1={hover * slot + slot / 2} x2={hover * slot + slot / 2} y1={padT} y2={padT + plotH} stroke={c.axis} strokeWidth={1} strokeDasharray="3 3" />
        )}
      </svg>
      {!anyData && <div className="absolute inset-0 flex items-center justify-center text-xs text-gray-400 dark:text-slate-500">No new users in this range</div>}
      {hover !== null && (
        <div className="pointer-events-none absolute top-0 -translate-x-1/2 bg-gray-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs rounded-lg px-2.5 py-1.5 shadow-lg whitespace-nowrap"
          style={{ left: `${((hover + 0.5) / n) * 100}%` }}>
          <div className="font-semibold mb-0.5">{shortDate(data[hover].date)}</div>
          <div className="tabular-nums">Anonymous: {fmt(data[hover].anonymous)}</div>
          <div className="tabular-nums">Registered: {fmt(data[hover].registered)}</div>
        </div>
      )}
    </div>
  )
}

// ---- single-series area/line (daily active users) ----
const TrendArea = ({ data }: { data: { date: string; count: number }[] }) => {
  const c = useColors()
  const [hover, setHover] = useState<number | null>(null)
  const VBW = 720, VBH = 200, padB = 22, padT = 8
  const n = data.length
  if (n === 0) return <div className="h-32 flex items-center justify-center text-xs text-gray-400 dark:text-slate-500">No activity recorded yet</div>
  const max = Math.max(1, ...data.map(d => d.count))
  const plotH = VBH - padB - padT
  const x = (i: number) => n === 1 ? VBW / 2 : (i / (n - 1)) * VBW
  const y = (v: number) => padT + plotH - (v / max) * plotH
  const line = data.map((d, i) => `${i === 0 ? 'M' : 'L'}${x(i)},${y(d.count)}`).join(' ')
  const area = `${line} L${x(n - 1)},${padT + plotH} L${x(0)},${padT + plotH} Z`
  const anyData = data.some(d => d.count > 0)

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${VBW} ${VBH}`} className="w-full h-auto" onMouseLeave={() => setHover(null)}>
        {[0, 0.5, 1].map(t => (
          <line key={t} x1={0} x2={VBW} y1={padT + plotH * t} y2={padT + plotH * t} stroke={c.grid} strokeWidth={1} />
        ))}
        <path d={area} fill={c.line} fillOpacity={0.12} />
        <path d={line} fill="none" stroke={c.line} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {hover !== null && (
          <>
            <line x1={x(hover)} x2={x(hover)} y1={padT} y2={padT + plotH} stroke={c.axis} strokeWidth={1} strokeDasharray="3 3" />
            <circle cx={x(hover)} cy={y(data[hover].count)} r={4} fill={c.line} stroke={c.isDark ? '#1e293b' : '#ffffff'} strokeWidth={2} />
          </>
        )}
        {/* hover hit targets */}
        {data.map((d, i) => (
          <rect key={d.date} x={n === 1 ? 0 : x(i) - VBW / (2 * (n - 1))} y={0} width={n === 1 ? VBW : VBW / (n - 1)} height={VBH} fill="transparent" onMouseEnter={() => setHover(i)} />
        ))}
        {[0, Math.floor(n / 2), n - 1].map(i => (
          <text key={i} x={Math.min(VBW - 20, Math.max(20, x(i)))} y={VBH - 6} fontSize={10} fill={c.muted} textAnchor="middle">{shortDate(data[i].date)}</text>
        ))}
      </svg>
      {!anyData && <div className="absolute inset-0 flex items-center justify-center text-xs text-gray-400 dark:text-slate-500">No activity recorded yet</div>}
      {hover !== null && (
        <div className="pointer-events-none absolute top-0 -translate-x-1/2 bg-gray-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs rounded-lg px-2.5 py-1.5 shadow-lg whitespace-nowrap"
          style={{ left: `${(n === 1 ? 0.5 : hover / (n - 1)) * 100}%` }}>
          <div className="font-semibold mb-0.5">{shortDate(data[hover].date)}</div>
          <div className="tabular-nums">{fmt(data[hover].count)} active</div>
        </div>
      )}
    </div>
  )
}

// ---- horizontal ranked bars (action totals, single hue + value labels) ----
const RankBars = ({ rows }: { rows: { label: string; value: number; split: Split }[] }) => {
  const c = useColors()
  const max = Math.max(1, ...rows.map(r => r.value))
  return (
    <div className="space-y-3">
      {rows.map(r => (
        <div key={r.label}>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="font-medium text-gray-700 dark:text-slate-300">{r.label}</span>
            <span className="tabular-nums text-gray-500 dark:text-slate-400">
              {fmt(r.value)}
              <span className="text-gray-400 dark:text-slate-500"> · {fmt(r.split.anonymous)} anon / {fmt(r.split.registered)} reg</span>
            </span>
          </div>
          {/* stacked anon/registered proportion within the bar */}
          <div className="h-2.5 w-full rounded-full bg-gray-100 dark:bg-slate-700 overflow-hidden flex" style={{ width: `${Math.max(4, (r.value / max) * 100)}%` }}>
            <div style={{ background: c.anon, width: r.value ? `${(r.split.anonymous / r.value) * 100}%` : '0%' }} />
            <div style={{ background: c.reg, width: r.value ? `${(r.split.registered / r.value) * 100}%` : '0%' }} />
          </div>
        </div>
      ))}
    </div>
  )
}

// ---- per-company stats: sortable, filterable, scrollable table ----
type CompCol = 'clicks' | 'events' | 'bets' | 'comments' | 'chatMessages' | 'favorites'
const COMP_COLS: { key: CompCol; label: string }[] = [
  { key: 'clicks', label: 'Clicks' },
  { key: 'events', label: 'Events' },
  { key: 'bets', label: 'Bets' },
  { key: 'comments', label: 'Comments' },
  { key: 'chatMessages', label: 'Chat' },
  { key: 'favorites', label: 'Favorites' },
]

const CompanyTable = ({ rows }: { rows: CompanyStat[] }) => {
  const [sort, setSort] = useState<CompCol>('clicks')
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const base = q ? rows.filter(r => r.name.toLowerCase().includes(q)) : rows
    return [...base].sort((a, b) => b[sort] - a[sort] || a.name.localeCompare(b.name))
  }, [rows, query, sort])

  const Th = ({ col }: { col: { key: CompCol; label: string } }) => (
    <th className="px-2 py-2 text-right">
      <button onClick={() => setSort(col.key)} className={`inline-flex items-center gap-1 font-medium transition-colors ${sort === col.key ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200'}`}>
        {col.label}
        <ArrowUpDown className="w-3 h-3 opacity-60" />
      </button>
    </th>
  )

  return (
    <div>
      <div className="relative mb-3">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Filter companies…"
          className="w-full sm:w-64 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-500"
        />
      </div>
      <div className="overflow-x-auto max-h-96 overflow-y-auto rounded-lg border border-gray-100 dark:border-slate-700">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-gray-50 dark:bg-slate-700/60 backdrop-blur text-gray-500 dark:text-slate-400 uppercase tracking-wide">
            <tr>
              <th className="px-2 py-2 text-left font-medium">Company</th>
              {COMP_COLS.map(c => <Th key={c.key} col={c} />)}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
            {filtered.map(r => (
              <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/40">
                <td className="px-2 py-2 max-w-[180px]">
                  <Link to={`/${r.slug}`} className="text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 truncate block">{r.name}</Link>
                </td>
                {COMP_COLS.map(c => (
                  <td key={c.key} className={`px-2 py-2 text-right tabular-nums ${sort === c.key ? 'font-semibold text-gray-900 dark:text-white' : 'text-gray-600 dark:text-slate-300'}`}>{fmt(r[c.key])}</td>
                ))}
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={COMP_COLS.length + 1} className="px-2 py-6 text-center text-gray-400 dark:text-slate-500">No companies match “{query}”.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-400 dark:text-slate-500 mt-2">{fmt(filtered.length)} compan{filtered.length === 1 ? 'y' : 'ies'} · sorted by {COMP_COLS.find(c => c.key === sort)?.label} · click a column to re-sort</p>
    </div>
  )
}

export const UserAnalytics = () => {
  const navigate = useNavigate()
  const currentUser = useStore(s => s.currentUser)
  const colors = useColors()
  const [days, setDays] = useState(30)
  const [data, setData] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    api.getAnalytics(currentUser?.username || '', currentUser?.password || '', days)
      .then(d => { if (!cancelled) { setData(d); setLoading(false) } })
      .catch(e => { if (!cancelled) { setError(e instanceof Error ? e.message : 'Failed to load analytics'); setLoading(false) } })
    return () => { cancelled = true }
  }, [days, currentUser])

  const rangeButtons = (
    <div className="flex items-center gap-1 bg-gray-100 dark:bg-slate-700/50 rounded-lg p-0.5">
      {RANGES.map(r => (
        <button
          key={r.days}
          onClick={() => setDays(r.days)}
          className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${days === r.days ? 'bg-white dark:bg-slate-600 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200'}`}
        >
          {r.label}
        </button>
      ))}
    </div>
  )

  return (
    <Layout>
      <button onClick={() => navigate('/admin')} className="flex items-center gap-1 text-gray-400 dark:text-slate-400 hover:text-gray-600 dark:hover:text-slate-200 transition-colors mb-4 text-sm">
        <ChevronLeft className="w-4 h-4" /> Back to Admin
      </button>

      <div className="flex items-center justify-between gap-3 flex-wrap mb-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">User Analytics</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400">Anonymous &amp; registered activity across the platform.</p>
        </div>
        {rangeButtons}
      </div>

      {loading && (
        <div className="py-20 text-center text-sm text-gray-400 dark:text-slate-500">Loading analytics…</div>
      )}
      {error && !loading && (
        <div className="bg-rose-50 dark:bg-rose-900/30 border border-rose-200 dark:border-rose-700 rounded-xl px-4 py-3 text-rose-600 dark:text-rose-300 text-sm">{error}</div>
      )}

      {data && !loading && (
        <div className="space-y-4">
          {/* Totals */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatTile label="Total Users" value={data.totals.totalUsers} icon={Users} sub={`${fmt(data.totals.admins)} admin`} />
            <StatTile label="Anonymous" value={data.totals.anonymousUsers} icon={UserX} />
            <StatTile label="Registered" value={data.totals.registeredUsers} icon={UserCheck} />
            <StatTile label="Active Today" value={data.activeUsers.dau} icon={Activity} sub="DAU" />
          </div>

          {/* Active users */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <StatTile label="DAU" value={data.activeUsers.dau} icon={Activity} sub="Daily active" />
            <StatTile label="WAU" value={data.activeUsers.wau} icon={Activity} sub="Weekly active" />
            <StatTile label="MAU" value={data.activeUsers.mau} icon={Activity} sub="Monthly active" />
          </div>

          {!data.hasActivityData && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
              <Shield className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>Active-user metrics (DAU/WAU/MAU and the daily-active trend) begin accumulating from when activity tracking went live, so early numbers may read low. User counts and action history below are computed from all existing data.</span>
            </div>
          )}

          {/* New users growth */}
          <ChartCard title="New Users per Day" right={<Legend items={[{ color: colors.anon, label: 'Anonymous' }, { color: colors.reg, label: 'Registered' }]} />}>
            <StackedBars data={data.series.newUsers} />
          </ChartCard>

          {/* Active users trend */}
          <ChartCard title="Daily Active Users">
            <TrendArea data={data.series.activeUsers} />
          </ChartCard>

          {/* Action frequencies */}
          <ChartCard title="Platform Actions (all-time)" right={<Legend items={[{ color: colors.anon, label: 'Anonymous' }, { color: colors.reg, label: 'Registered' }]} />}>
            <RankBars rows={[
              { label: 'Betting events created', value: data.actionTotals.events, split: data.actionTotalsByType.events },
              { label: 'Bets placed', value: data.actionTotals.bets, split: data.actionTotalsByType.bets },
              { label: 'Comments made', value: data.actionTotals.comments, split: data.actionTotalsByType.comments },
              { label: 'Chat messages sent', value: data.actionTotals.chatMessages, split: data.actionTotalsByType.chatMessages },
              { label: 'Companies favorited', value: data.actionTotals.favorites, split: data.actionTotalsByType.favorites },
            ]} />
          </ChartCard>

          {/* Per-company breakdown */}
          <ChartCard title="Stats by Company">
            <CompanyTable rows={data.companyStats || []} />
          </ChartCard>

          <p className="text-xs text-gray-400 dark:text-slate-500 text-center">
            All betting and event activity on Layoff Live is for amusement only, using virtual coins with no real-world value.
          </p>
        </div>
      )}
    </Layout>
  )
}
