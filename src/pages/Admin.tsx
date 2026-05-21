import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Shield, Building2, Layers, MessageSquare, Users, Plus, Edit2, Trash2, CheckCircle, X, Save } from 'lucide-react'
import { useStore } from '../store/useStore'
import { Layout } from '../components/Layout'
import { CompanyLogo } from '../components/CompanyLogo'
import { getProbability, formatDate } from '../utils/odds'

type Tab = 'events' | 'companies' | 'users' | 'feedback'

const INDUSTRIES = ['Tech', 'Software', 'AI & Machine Learning', 'Finance', 'Healthcare', 'Retail', 'Media & Entertainment', 'Energy', 'Consulting', 'Logistics', 'Food & Beverage', 'Manufacturing', 'Other']

export const Admin = () => {
  const currentUser = useStore(s => s.currentUser)
  const events = useStore(s => s.events)
  const companies = useStore(s => s.companies)
  const users = useStore(s => s.users)
  const comments = useStore(s => s.comments)
  const bets = useStore(s => s.bets)
  const deleteEvent = useStore(s => s.deleteEvent)
  const updateEvent = useStore(s => s.updateEvent)
  const resolveEvent = useStore(s => s.resolveEvent)
  const archiveEvent = useStore(s => s.archiveEvent)
  const addCompany = useStore(s => s.addCompany)
  const updateCompany = useStore(s => s.updateCompany)
  const deleteCompany = useStore(s => s.deleteCompany)
  const deleteComment = useStore(s => s.deleteComment)
  const banUser = useStore(s => s.banUser)
  const feedback = useStore(s => s.feedback)
  const deleteFeedback = useStore(s => s.deleteFeedback)
  const getEffectiveStatus = useStore(s => s.getEffectiveStatus)

  const [tab, setTab] = useState<Tab>('events')
  const [toast, setToast] = useState('')

  // Company add form
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newIndustry, setNewIndustry] = useState('Tech')

  // Company edit
  const [editingCompanyId, setEditingCompanyId] = useState<string | null>(null)
  const [editCompanyName, setEditCompanyName] = useState('')
  const [editCompanyDesc, setEditCompanyDesc] = useState('')
  const [editCompanyIndustry, setEditCompanyIndustry] = useState('')

  // Event edit
  const [editingEventId, setEditingEventId] = useState<string | null>(null)
  const [editEventTitle, setEditEventTitle] = useState('')
  const [editEventDesc, setEditEventDesc] = useState('')
  const [editEventExpires, setEditEventExpires] = useState('')
  const [editEventCompanyId, setEditEventCompanyId] = useState('')

  // Comments expand
  const [showComments, setShowComments] = useState<string | null>(null)

  if (!currentUser?.isAdmin) return (
    <Layout><div className="text-center py-20 text-gray-400 dark:text-slate-400">Access denied.</div></Layout>
  )

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 5000) }

  const inputCls = "w-full bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-600 focus:outline-none focus:border-violet-500 transition-colors"

  // --- Company handlers ---
  const handleAddCompany = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim()) return
    addCompany(newName, newDesc, newIndustry)
    setNewName(''); setNewDesc('')
    showToast('Company added')
  }

  const startEditCompany = (c: typeof companies[0]) => {
    setEditingCompanyId(c.id)
    setEditCompanyName(c.name)
    setEditCompanyDesc(c.description)
    setEditCompanyIndustry(c.industry)
  }

  const saveEditCompany = () => {
    if (!editingCompanyId) return
    updateCompany(editingCompanyId, editCompanyName, editCompanyDesc, editCompanyIndustry)
    setEditingCompanyId(null)
    showToast('Company updated')
  }

  // --- Event handlers ---
  const startEditEvent = (ev: typeof events[0]) => {
    setEditingEventId(ev.id)
    setEditEventTitle(ev.title)
    setEditEventDesc(ev.description)
    // format for datetime-local input
    setEditEventExpires(ev.expiresAt.slice(0, 16))
    setEditEventCompanyId(ev.companyId)
  }

  const saveEditEvent = () => {
    if (!editingEventId) return
    const company = companies.find(c => c.id === editEventCompanyId)
    if (!company) return
    updateEvent(editingEventId, {
      title: editEventTitle,
      description: editEventDesc,
      expiresAt: new Date(editEventExpires).toISOString(),
      companyId: company.id,
      companyName: company.name,
    })
    setEditingEventId(null)
    showToast('Prediction updated')
  }

  return (
    <Layout>
      <div className="flex items-center gap-2 mb-5">
        <Shield className="w-5 h-5 text-violet-600 dark:text-violet-400" />
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Admin Panel</h1>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: 'Events', value: events.length, icon: <Layers className="w-4 h-4" /> },
          { label: 'Users', value: users.length, icon: <Users className="w-4 h-4" /> },
          { label: 'Comments', value: comments.length, icon: <MessageSquare className="w-4 h-4" /> },
        ].map(({ label, value, icon }) => (
          <div key={label} className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-3 text-center shadow-sm dark:shadow-none">
            <div className="flex justify-center text-violet-600 dark:text-violet-400 mb-1">{icon}</div>
            <div className="text-xl font-bold text-gray-900 dark:text-white">{value}</div>
            <div className="text-xs text-gray-400 dark:text-slate-500">{label}</div>
          </div>
        ))}
      </div>

      <div className="flex bg-gray-100 dark:bg-slate-800 rounded-xl p-1 mb-5 gap-1">
        {(['events', 'companies', 'users', 'feedback'] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`flex-1 py-2 text-sm font-medium rounded-lg capitalize transition-all ${tab === t ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow' : 'text-gray-400 dark:text-slate-400 hover:text-gray-600 dark:hover:text-slate-200'}`}>
            {t}
          </button>
        ))}
      </div>

      {/* ── Events tab ── */}
      {tab === 'events' && (
        <div className="space-y-3">
          {events.map(event => {
            const status = getEffectiveStatus(event)
            const prob = getProbability(event.yesPool, event.noPool)
            const eventComments = comments.filter(c => c.eventId === event.id)
            const isEditing = editingEventId === event.id

            return (
              <div key={event.id} className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-4 shadow-sm dark:shadow-none">
                {isEditing ? (
                  /* ── Edit form ── */
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide">Title</label>
                    <textarea
                      value={editEventTitle}
                      onChange={e => setEditEventTitle(e.target.value)}
                      rows={2}
                      className={inputCls}
                    />
                    <label className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide">Description</label>
                    <textarea
                      value={editEventDesc}
                      onChange={e => setEditEventDesc(e.target.value)}
                      rows={3}
                      className={inputCls}
                    />
                    <label className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide">Company</label>
                    <select value={editEventCompanyId} onChange={e => setEditEventCompanyId(e.target.value)} className={inputCls}>
                      {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <label className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide">Expires</label>
                    <input
                      type="datetime-local"
                      value={editEventExpires}
                      onChange={e => setEditEventExpires(e.target.value)}
                      className={inputCls}
                    />
                    <div className="flex gap-2 pt-1">
                      <button onClick={saveEditEvent} className="flex items-center gap-1.5 text-xs px-3 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg transition-colors font-medium">
                        <Save className="w-3 h-3" /> Save
                      </button>
                      <button onClick={() => setEditingEventId(null)} className="text-xs px-3 py-2 bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-400 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors">
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  /* ── Read view ── */
                  <>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1">
                        <span className="text-xs text-gray-400 dark:text-slate-500">{event.companyName} · {formatDate(event.expiresAt)}</span>
                        <p className="text-sm text-gray-900 dark:text-white mt-0.5 leading-snug">{event.title}</p>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${status === 'active' ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' : status === 'resolved' ? 'bg-violet-50 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400' : 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'}`}>
                        {status}{event.outcome ? ` · ${event.outcome.toUpperCase()}` : ''}
                      </span>
                    </div>
                    <div className="text-xs text-gray-400 dark:text-slate-500 mb-3">
                      YES {prob.yes}% · NO {prob.no}% · {event.yesPool + event.noPool} coins · {bets.filter(b => b.eventId === event.id).length} bettors
                    </div>
                    {(status === 'active' || status === 'expired') && (
                      <div className="flex gap-2 mb-2">
                        <button onClick={() => { resolveEvent(event.id, 'yes'); showToast('Resolved YES') }} className="text-xs px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors">Resolve YES</button>
                        <button onClick={() => { resolveEvent(event.id, 'no'); showToast('Resolved NO') }} className="text-xs px-3 py-1.5 bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-900/50 transition-colors">Resolve NO</button>
                      </div>
                    )}
                    <div className="flex gap-2 flex-wrap">
                      <button onClick={() => startEditEvent(event)} className="flex items-center gap-1 text-xs px-3 py-1.5 bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors">
                        <Edit2 className="w-3 h-3" /> Edit
                      </button>
                      {status === 'resolved' && (
                        <button onClick={() => { archiveEvent(event.id); showToast('Archived') }} className="text-xs px-3 py-1.5 bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-400 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors">Archive</button>
                      )}
                      <button onClick={() => setShowComments(showComments === event.id ? null : event.id)} className="text-xs px-3 py-1.5 bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-400 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors flex items-center gap-1">
                        <MessageSquare className="w-3 h-3" /> {eventComments.length}
                      </button>
                      <Link to={`/event/${event.id}`} className="text-xs px-3 py-1.5 bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-400 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors">View</Link>
                      <button onClick={() => { if (confirm('Delete?')) { deleteEvent(event.id); showToast('Deleted') } }} className="text-xs px-3 py-1.5 bg-rose-50 dark:bg-rose-900/20 text-rose-500 dark:text-rose-400 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-colors ml-auto">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                    {showComments === event.id && eventComments.length > 0 && (
                      <div className="mt-3 space-y-2 border-t border-gray-100 dark:border-slate-700 pt-3">
                        {eventComments.map(c => (
                          <div key={c.id} className="flex items-start gap-2 bg-gray-50 dark:bg-slate-900 rounded-lg p-2.5 group">
                            <p className="text-xs text-gray-600 dark:text-slate-300 flex-1 leading-relaxed">{c.content}</p>
                            <button onClick={() => { deleteComment(c.id); showToast('Removed') }} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-rose-500 transition-all flex-shrink-0">
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ── Companies tab ── */}
      {tab === 'companies' && (
        <div>
          <form onSubmit={handleAddCompany} className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-4 mb-4 shadow-sm dark:shadow-none">
            <div className="text-sm font-medium text-gray-700 dark:text-slate-300 mb-3 flex items-center gap-2">
              <Plus className="w-4 h-4 text-violet-600 dark:text-violet-400" /> Add Company
            </div>
            <input type="text" value={newName} onChange={e => setNewName(e.target.value)} placeholder="Company name" className={`${inputCls} mb-2`} />
            <textarea rows={2} value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Short description" className={`${inputCls} mb-2`} />
            <select value={newIndustry} onChange={e => setNewIndustry(e.target.value)} className={`${inputCls} mb-3`}>
              {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
            </select>
            <button type="submit" className="w-full bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium py-2.5 rounded-xl transition-colors">Add Company</button>
          </form>

          <div className="space-y-3">
            {companies.map(c => (
              <div key={c.id} className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-4 shadow-sm dark:shadow-none">
                {editingCompanyId === c.id ? (
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide">Name</label>
                    <input value={editCompanyName} onChange={e => setEditCompanyName(e.target.value)} className={inputCls} />
                    <label className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide">Description</label>
                    <textarea rows={3} value={editCompanyDesc} onChange={e => setEditCompanyDesc(e.target.value)} className={inputCls} />
                    <label className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide">Industry</label>
                    <select value={editCompanyIndustry} onChange={e => setEditCompanyIndustry(e.target.value)} className={inputCls}>
                      {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
                    </select>
                    <div className="flex gap-2 pt-1">
                      <button onClick={saveEditCompany} className="flex items-center gap-1.5 text-xs px-3 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg transition-colors font-medium">
                        <Save className="w-3 h-3" /> Save
                      </button>
                      <button onClick={() => setEditingCompanyId(null)} className="text-xs px-3 py-2 bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-400 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors">
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start gap-3">
                      <CompanyLogo name={c.name} id={c.id} industry={c.industry} size="sm" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">{c.name}</div>
                        <div className="text-xs text-gray-400 dark:text-slate-500">{c.industry}</div>
                        <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 leading-relaxed">{c.description}</p>
                        <div className="text-xs text-gray-400 dark:text-slate-600 mt-1">{events.filter(e => e.companyId === c.id).length} events</div>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <button onClick={() => startEditCompany(c)} className="flex items-center gap-1 text-xs px-3 py-1.5 bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors">
                        <Edit2 className="w-3 h-3" /> Edit
                      </button>
                      <button onClick={() => { if (confirm('Delete company + events?')) { deleteCompany(c.id); showToast('Deleted') } }} className="text-xs px-3 py-1.5 bg-rose-50 dark:bg-rose-900/20 text-rose-500 dark:text-rose-400 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-colors ml-auto">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Users tab ── */}
      {tab === 'users' && (
        <div className="space-y-3">
          {users.map(u => (
            <div key={u.id} className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-4 flex items-center justify-between shadow-sm dark:shadow-none">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{u.username}</span>
                  {u.isAdmin && <span className="text-xs bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-300 px-2 py-0.5 rounded-full">Admin</span>}
                </div>
                <div className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">
                  {bets.filter(b => b.userId === u.id).length} bets · {u.coins.toLocaleString()} coins
                </div>
              </div>
              {u.id !== currentUser.id && !u.isAdmin && (
                <button onClick={() => { if (confirm(`Ban ${u.username}?`)) { banUser(u.id); showToast('Banned') } }} className="text-xs px-3 py-1.5 bg-rose-50 dark:bg-rose-900/20 text-rose-500 dark:text-rose-400 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-colors">
                  Ban
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Feedback tab ── */}
      {tab === 'feedback' && (
        <div className="space-y-3">
          {feedback.length === 0 && <p className="text-gray-400 dark:text-slate-500 text-sm text-center py-8">No feedback yet</p>}
          {[...feedback].reverse().map(f => (
            <div key={f.id} className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-4 shadow-sm dark:shadow-none">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium mb-2 inline-block ${f.type === 'bug' ? 'bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400' : f.type === 'feature' ? 'bg-violet-50 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400' : 'bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-400'}`}>
                    {f.type === 'bug' ? '🐛 Bug' : f.type === 'feature' ? '💡 Feature' : '💬 Other'}
                  </span>
                  <p className="text-sm text-gray-700 dark:text-slate-200 leading-relaxed">{f.text}</p>
                  <p className="text-xs text-gray-400 dark:text-slate-500 mt-2">{new Date(f.createdAt).toLocaleString()}</p>
                </div>
                <button onClick={() => deleteFeedback(f.id)} className="text-gray-300 dark:text-slate-600 hover:text-rose-500 transition-colors flex-shrink-0">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-gray-800 dark:bg-slate-700 text-white px-5 py-2.5 rounded-full text-sm font-medium shadow-lg z-50">
          {toast}
        </div>
      )}
    </Layout>
  )
}
