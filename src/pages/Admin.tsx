import { useState } from 'react'
import { useStore } from '../store/useStore'
import { Layout } from '../components/Layout'
import { Trash2, Users, TrendingUp, MessageSquare, Building2, Plus, Pencil, Check, X, Settings } from 'lucide-react'

const GATE_CODE_REQUIRED_KEY = 'lb-gate-code-required'

type Tab = 'users' | 'bets' | 'comments' | 'companies' | 'settings'

export const Admin = () => {
  const currentUser = useStore(s => s.currentUser)
  const users = useStore(s => s.users)
  const bets = useStore(s => s.bets)
  const comments = useStore(s => s.comments)
  const companies = useStore(s => s.companies)
  const events = useStore(s => s.events)
  const hiddenCompanyIds = useStore(s => s.hiddenCompanyIds)
  const toggleHiddenCompany = useStore(s => s.toggleHiddenCompany)
  const getEffectiveStatus = useStore(s => s.getEffectiveStatus)
  const updateCompany = useStore(s => s.updateCompany)

  const [activeTab, setActiveTab] = useState<Tab>(() => {
    const stored = localStorage.getItem('admin-active-tab')
    return (stored as Tab) || 'companies'
  })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null)
  const [togglingCompanyId, setTogglingCompanyId] = useState<string | null>(null)
  const [showOnlyActive, setShowOnlyActive] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newCompany, setNewCompany] = useState({ name: '', description: '', industry: '', color: '#003DA5' })
  const [editingCompanyId, setEditingCompanyId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ name: '', description: '', industry: '' })
  const [codeRequired, setCodeRequired] = useState(() => localStorage.getItem(GATE_CODE_REQUIRED_KEY) !== 'false')

  if (!currentUser || !currentUser.isAdmin) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto px-4 py-12">
          <p className="text-center text-gray-600 dark:text-slate-400">Access denied. Admin only.</p>
        </div>
      </Layout>
    )
  }

  const deleteItem = async (type: string, id: string) => {
    if (!window.confirm(`Delete this ${type}?`)) return
    if (!currentUser) return

    setLoading(true)
    try {
      const response = await fetch(`/api/${type}/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: currentUser.username,
          password: currentUser.password,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || `Failed to delete ${type}`)
      }

      setMessage({ type: 'success', text: `${type} deleted successfully` })
      setTimeout(() => window.location.reload(), 1000)
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : `Failed to delete ${type}` })
    } finally {
      setLoading(false)
    }
  }

  const addCompany = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentUser || !newCompany.name.trim()) return

    setLoading(true)
    try {
      const response = await fetch('/api/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newCompany,
          username: currentUser.username,
          password: currentUser.password,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create company')
      }

      setMessage({ type: 'success', text: 'Company created successfully' })
      setNewCompany({ name: '', description: '', industry: '', color: '#003DA5' })
      setShowAddForm(false)
      setTimeout(() => window.location.reload(), 1000)
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to create company' })
    } finally {
      setLoading(false)
    }
  }

  const startEditCompany = (company: typeof companies[0]) => {
    setEditingCompanyId(company.id)
    setEditForm({ name: company.name, description: company.description || '', industry: company.industry || '' })
  }

  const saveEditCompany = async (companyId: string) => {
    if (!editForm.name.trim()) return
    setLoading(true)
    try {
      const response = await fetch(`/api/companies/${companyId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editForm.name.trim(), description: editForm.description.trim(), industry: editForm.industry.trim() }),
      })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to update company')
      }
      updateCompany(companyId, editForm.name.trim(), editForm.description.trim(), editForm.industry.trim())
      setEditingCompanyId(null)
      setMessage({ type: 'success', text: 'Company updated' })
      setTimeout(() => setMessage(null), 2000)
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to update company' })
    } finally {
      setLoading(false)
    }
  }

  const nonAdminUsers = users.filter(u => !u.isAdmin)
  const getEventTitle = (eventId?: string) => !eventId ? '-' : events.find(e => e.id === eventId)?.title || eventId
  const getUsername = (userId?: string) => !userId ? '-' : users.find(u => u.id === userId)?.username || userId
  const getCompanyName = (companyId?: string) => !companyId ? '-' : companies.find(c => c.id === companyId)?.name || companyId

  const toggleCodeRequired = () => {
    const next = !codeRequired
    setCodeRequired(next)
    localStorage.setItem(GATE_CODE_REQUIRED_KEY, next ? 'true' : 'false')
  }

  const tabs: { id: Tab; label: string; count?: number; icon: React.ReactNode }[] = [
    { id: 'companies', label: 'Companies', count: companies.length, icon: <Building2 className="w-4 h-4" /> },
    { id: 'users', label: 'Users', count: nonAdminUsers.length, icon: <Users className="w-4 h-4" /> },
    { id: 'bets', label: 'Bets', count: bets.length, icon: <TrendingUp className="w-4 h-4" /> },
    { id: 'comments', label: 'Comments', count: comments.length, icon: <MessageSquare className="w-4 h-4" /> },
    { id: 'settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> },
  ]

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-0 py-2">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-3 px-4">Admin Panel</h1>

        {message && (
          <div className={`rounded-xl p-4 mb-6 border mx-4 ${message.type === 'error'
            ? 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-700 text-red-600 dark:text-red-300'
            : 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-700 text-green-600 dark:text-green-300'
          }`}>
            {message.text}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-3 overflow-x-auto px-4">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id)
                localStorage.setItem('admin-active-tab', tab.id)
              }}
              className={`flex items-center gap-1 px-3 py-2 rounded-lg font-medium text-xs sm:text-sm transition-all duration-200 whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-blue-600 dark:bg-blue-500 text-white shadow-lg shadow-blue-600/30'
                  : 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700'
              }`}
            >
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span className={`px-1.5 py-0.5 rounded text-xs font-semibold ${
                  activeTab === tab.id
                    ? 'bg-white/30'
                    : 'bg-gray-300 dark:bg-slate-700 text-gray-700 dark:text-slate-300'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-slate-700/50 border-b border-gray-200 dark:border-slate-700">
                  <tr>
                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-600 dark:text-slate-300 uppercase">Username</th>
                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-600 dark:text-slate-300 uppercase">Password</th>
                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-600 dark:text-slate-300 uppercase">Coins</th>
                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-600 dark:text-slate-300 uppercase">Created</th>
                    <th className="sticky right-0 px-2 py-2 text-right text-xs font-medium text-gray-600 dark:text-slate-300 uppercase bg-gray-50 dark:bg-slate-700/50 z-10">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                  {nonAdminUsers.map(user => (
                    <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                      <td className="px-2 py-4 text-sm font-medium text-gray-900 dark:text-white">{user.username}</td>
                      <td className="px-2 py-4 text-sm text-gray-600 dark:text-slate-400 font-mono text-xs">{user.password || '-'}</td>
                      <td className="px-2 py-4 text-sm text-gray-600 dark:text-slate-400">{user.coins}</td>
                      <td className="px-2 py-4 text-sm text-gray-600 dark:text-slate-400">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td className="sticky right-0 px-2 py-4 text-right bg-white dark:bg-slate-800 z-10">
                        <button
                          onClick={() => deleteItem('users', user.id)}
                          disabled={loading}
                          className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors disabled:opacity-50"
                        >
                          <Trash2 className="w-4 h-4" /> Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {nonAdminUsers.length === 0 && <div className="p-6 text-center text-gray-600 dark:text-slate-400">No users</div>}
          </div>
        )}

        {/* Bets Tab */}
        {activeTab === 'bets' && (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden px-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-slate-700/50 border-b border-gray-200 dark:border-slate-700">
                  <tr>
                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-600 dark:text-slate-300 uppercase">User</th>
                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-600 dark:text-slate-300 uppercase">Event</th>
                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-600 dark:text-slate-300 uppercase">Side</th>
                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-600 dark:text-slate-300 uppercase">Amount</th>
                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-600 dark:text-slate-300 uppercase">Created</th>
                    <th className="sticky right-0 px-2 py-2 text-right text-xs font-medium text-gray-600 dark:text-slate-300 uppercase bg-gray-50 dark:bg-slate-700/50 z-10">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                  {bets.map(bet => (
                    <tr key={bet.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                      <td className="px-2 py-4 text-sm text-gray-900 dark:text-white">{getUsername(bet.userId)}</td>
                      <td className="px-2 py-4 text-sm text-gray-600 dark:text-slate-400 truncate max-w-xs">{getEventTitle(bet.eventId)}</td>
                      <td className="px-2 py-4 text-sm"><span className={`px-2 py-1 rounded text-xs font-medium ${bet.side === 'yes' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'}`}>{bet.side.toUpperCase()}</span></td>
                      <td className="px-2 py-4 text-sm text-gray-600 dark:text-slate-400">{bet.amount}</td>
                      <td className="px-2 py-4 text-sm text-gray-600 dark:text-slate-400">
                        {new Date(bet.createdAt).toLocaleDateString()}
                      </td>
                      <td className="sticky right-0 px-2 py-4 text-right bg-white dark:bg-slate-800 z-10">
                        <button
                          onClick={() => deleteItem('bets', bet.id)}
                          disabled={loading}
                          className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors disabled:opacity-50"
                        >
                          <Trash2 className="w-4 h-4" /> Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {bets.length === 0 && <div className="p-6 text-center text-gray-600 dark:text-slate-400">No bets</div>}
          </div>
        )}

        {/* Comments Tab */}
        {activeTab === 'comments' && (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden px-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-slate-700/50 border-b border-gray-200 dark:border-slate-700">
                  <tr>
                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-600 dark:text-slate-300 uppercase">User</th>
                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-600 dark:text-slate-300 uppercase">Comment</th>
                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-600 dark:text-slate-300 uppercase">Event</th>
                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-600 dark:text-slate-300 uppercase">Upvotes</th>
                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-600 dark:text-slate-300 uppercase">Created</th>
                    <th className="sticky right-0 px-2 py-2 text-right text-xs font-medium text-gray-600 dark:text-slate-300 uppercase bg-gray-50 dark:bg-slate-700/50 z-10">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                  {comments.map(comment => (
                    <tr key={comment.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                      <td className="px-2 py-4 text-sm text-gray-900 dark:text-white">{getUsername(comment.userId)}</td>
                      <td className="px-2 py-4 text-sm text-gray-600 dark:text-slate-400 max-w-xs truncate">{comment.content}</td>
                      <td className="px-2 py-4 text-sm text-gray-600 dark:text-slate-400 truncate max-w-xs">{getEventTitle(comment.eventId)}</td>
                      <td className="px-2 py-4 text-sm text-gray-600 dark:text-slate-400">{comment.upvotes || 0}</td>
                      <td className="px-2 py-4 text-sm text-gray-600 dark:text-slate-400">
                        {new Date(comment.createdAt).toLocaleDateString()}
                      </td>
                      <td className="sticky right-0 px-2 py-4 text-right bg-white dark:bg-slate-800 z-10">
                        <button
                          onClick={() => deleteItem('comments', comment.id)}
                          disabled={loading}
                          className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors disabled:opacity-50"
                        >
                          <Trash2 className="w-4 h-4" /> Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {comments.length === 0 && <div className="p-6 text-center text-gray-600 dark:text-slate-400">No comments</div>}
          </div>
        )}

        {/* Companies Tab */}
        {activeTab === 'companies' && (() => {
          const companiesWithActivity = companies.filter(c => {
            // Check if company has active events, bets, or comments
            const eventsForCompany = events.filter(e => e.companyId === c.id)
            const activeEventsForCompany = eventsForCompany.filter(e => getEffectiveStatus(e) === 'active')
            const betsOnCompanyEvents = bets.filter(b => eventsForCompany.some(e => e.id === b.eventId))
            const companyComments = comments.filter(c2 => c2.companyId === c.id)

            return activeEventsForCompany.length > 0 || betsOnCompanyEvents.length > 0 || companyComments.length > 0
          })

          // Sort companies: BNY first, then by name
          const sortedCompanies = (list: typeof companies) => {
            return [...list].sort((a, b) => {
              if (a.name === 'BNY') return -1
              if (b.name === 'BNY') return 1
              return a.name.localeCompare(b.name)
            })
          }

          const displayedCompanies = showOnlyActive ? sortedCompanies(companiesWithActivity) : sortedCompanies(companies)

          return (
            <>
              <div className="flex items-center justify-between gap-3 mb-4 px-0">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showOnlyActive}
                    onChange={(e) => setShowOnlyActive(e.target.checked)}
                    className="sr-only"
                  />
                  <div className={`relative w-11 h-6 rounded-full transition-colors ${showOnlyActive ? 'bg-green-500' : 'bg-gray-300 dark:bg-slate-600'}`}>
                    <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${showOnlyActive ? 'translate-x-5' : ''}`} />
                  </div>
                  <span className="ml-3 text-sm font-medium text-gray-700 dark:text-slate-300">Only companies with activity</span>
                </label>
                <button
                  onClick={() => setShowAddForm(!showAddForm)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  <Plus className="w-4 h-4" /> Add Company
                </button>
              </div>

              {showAddForm && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 mb-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Add New Company</h3>
                  <form onSubmit={addCompany} className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Company Name *</label>
                      <input
                        type="text"
                        value={newCompany.name}
                        onChange={(e) => setNewCompany({ ...newCompany, name: e.target.value })}
                        placeholder="e.g. Acme Corp"
                        className="w-full bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg px-3 py-2 text-gray-900 dark:text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Description</label>
                      <input
                        type="text"
                        value={newCompany.description}
                        onChange={(e) => setNewCompany({ ...newCompany, description: e.target.value })}
                        placeholder="Brief company description (optional)"
                        className="w-full bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg px-3 py-2 text-gray-900 dark:text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Industry</label>
                        <input
                          type="text"
                          value={newCompany.industry}
                          onChange={(e) => setNewCompany({ ...newCompany, industry: e.target.value })}
                          placeholder="e.g. Technology"
                          className="w-full bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg px-3 py-2 text-gray-900 dark:text-white focus:outline-none focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Color</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={newCompany.color}
                            onChange={(e) => setNewCompany({ ...newCompany, color: e.target.value })}
                            className="w-12 h-10 rounded cursor-pointer"
                          />
                          <span className="text-xs text-gray-600 dark:text-slate-400">{newCompany.color}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <button
                        type="submit"
                        disabled={loading || !newCompany.name.trim()}
                        className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {loading ? 'Creating...' : 'Create Company'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowAddForm(false)}
                        className="flex-1 px-4 py-2 bg-gray-300 dark:bg-slate-700 text-gray-900 dark:text-white font-medium rounded-lg hover:bg-gray-400 dark:hover:bg-slate-600 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              )}
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden px-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-slate-700/50 border-b border-gray-200 dark:border-slate-700">
                      <tr>
                        <th className="px-2 py-2 text-left text-xs font-medium text-gray-600 dark:text-slate-300 uppercase">Visible</th>
                        <th className="px-2 py-2 text-left text-xs font-medium text-gray-600 dark:text-slate-300 uppercase">Name</th>
                        <th className="px-2 py-2 text-left text-xs font-medium text-gray-600 dark:text-slate-300 uppercase">Description</th>
                        <th className="px-2 py-2 text-left text-xs font-medium text-gray-600 dark:text-slate-300 uppercase">Industry</th>
                        <th className="px-2 py-2 text-center text-xs font-medium text-gray-600 dark:text-slate-300 uppercase">Events</th>
                        <th className="sticky right-0 px-2 py-2 text-right text-xs font-medium text-gray-600 dark:text-slate-300 uppercase bg-gray-50 dark:bg-slate-700/50 z-10">Actions</th>
                      </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                  {displayedCompanies.map(company => {
                    const isHidden = hiddenCompanyIds.includes(company.id)
                    const isToggling = togglingCompanyId === company.id
                    const isEditing = editingCompanyId === company.id

                    const eventsForCompany = events.filter(e => e.companyId === company.id)
                    const activeEventsCount = eventsForCompany.filter(e => getEffectiveStatus(e) === 'active').length

                    const handleToggle = async () => {
                      setTogglingCompanyId(company.id)
                      try {
                        await toggleHiddenCompany(company.id)
                      } catch (err) {
                        console.error('Failed to toggle:', err)
                      } finally {
                        setTogglingCompanyId(null)
                      }
                    }
                    return (
                      <tr key={company.id} className={`hover:bg-gray-50 dark:hover:bg-slate-700/50 ${isHidden ? 'opacity-50' : ''}`}>
                        <td className="px-2 py-3">
                          <label className="flex items-center cursor-pointer">
                            <input type="checkbox" checked={!isHidden} onChange={handleToggle} disabled={isToggling} className="sr-only" />
                            <div className={`relative w-11 h-6 rounded-full transition-colors ${!isHidden ? 'bg-green-500' : 'bg-gray-300 dark:bg-slate-600'}`}>
                              <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${!isHidden ? 'translate-x-5' : ''}`} />
                            </div>
                          </label>
                        </td>
                        <td className="px-2 py-3 text-sm font-medium text-gray-900 dark:text-white">
                          {isEditing ? (
                            <input
                              value={editForm.name}
                              onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                              className="w-full bg-white dark:bg-slate-700 border border-blue-400 rounded-lg px-2 py-1 text-sm text-gray-900 dark:text-white focus:outline-none"
                              autoFocus
                            />
                          ) : company.name}
                        </td>
                        <td className="px-2 py-3 text-sm text-gray-600 dark:text-slate-400 max-w-[140px]">
                          {isEditing ? (
                            <input
                              value={editForm.description}
                              onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                              placeholder="Description"
                              className="w-full bg-white dark:bg-slate-700 border border-blue-400 rounded-lg px-2 py-1 text-sm text-gray-900 dark:text-white focus:outline-none"
                            />
                          ) : <span className="truncate block">{company.description || '—'}</span>}
                        </td>
                        <td className="px-2 py-3 text-sm text-gray-600 dark:text-slate-400">
                          {isEditing ? (
                            <input
                              value={editForm.industry}
                              onChange={e => setEditForm(f => ({ ...f, industry: e.target.value }))}
                              placeholder="Industry"
                              className="w-full bg-white dark:bg-slate-700 border border-blue-400 rounded-lg px-2 py-1 text-sm text-gray-900 dark:text-white focus:outline-none"
                            />
                          ) : company.industry || '—'}
                        </td>
                        <td className="px-2 py-3 text-center text-sm text-gray-600 dark:text-slate-400">{activeEventsCount}</td>
                        <td className="sticky right-0 px-2 py-3 text-right bg-white dark:bg-slate-800 z-10">
                          <div className="flex items-center justify-end gap-1">
                            {isEditing ? (
                              <>
                                <button onClick={() => saveEditCompany(company.id)} disabled={loading} className="inline-flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-lg transition-colors disabled:opacity-50">
                                  <Check className="w-3.5 h-3.5" /> Save
                                </button>
                                <button onClick={() => setEditingCompanyId(null)} className="inline-flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
                                  <X className="w-3.5 h-3.5" /> Cancel
                                </button>
                              </>
                            ) : (
                              <>
                                <button onClick={() => startEditCompany(company)} className="inline-flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors">
                                  <Pencil className="w-3.5 h-3.5" /> Edit
                                </button>
                                <button onClick={() => deleteItem('companies', company.id)} disabled={loading} className="inline-flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors disabled:opacity-50">
                                  <Trash2 className="w-3.5 h-3.5" /> Delete
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                    </tbody>
                  </table>
                </div>
                {displayedCompanies.length === 0 && <div className="p-6 text-center text-gray-600 dark:text-slate-400">{showOnlyActive ? 'No companies with activity' : 'No companies'}</div>}
              </div>
            </>
          )
        })()}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="space-y-4 px-0">
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Gate — Invite code</h3>
              <p className="text-xs text-gray-500 dark:text-slate-400 mb-4">When disabled, users can enter the gate without an invite code.</p>
              <button
                onClick={toggleCodeRequired}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-colors ${codeRequired ? 'bg-gray-50 dark:bg-slate-700 border-gray-200 dark:border-slate-600 text-gray-900 dark:text-white' : 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300'}`}
              >
                <span className="text-sm font-medium">{codeRequired ? 'Code required' : 'Open entry (no code needed)'}</span>
                <div className={`relative w-11 h-6 rounded-full transition-colors ${codeRequired ? 'bg-blue-600' : 'bg-gray-300 dark:bg-slate-600'}`}>
                  <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${codeRequired ? 'translate-x-5' : ''}`} />
                </div>
              </button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}
