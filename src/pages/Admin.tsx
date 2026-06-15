import { useState } from 'react'
import { useStore } from '../store/useStore'
import { Layout } from '../components/Layout'
import { Trash2, Users, TrendingUp, MessageSquare, Building2 } from 'lucide-react'

type Tab = 'users' | 'bets' | 'comments' | 'companies'

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

  const [activeTab, setActiveTab] = useState<Tab>('companies')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null)
  const [togglingCompanyId, setTogglingCompanyId] = useState<string | null>(null)
  const [showOnlyActive, setShowOnlyActive] = useState(false)

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

    setLoading(true)
    try {
      const response = await fetch(`/api/${type}/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      })

      if (!response.ok) throw new Error(`Failed to delete ${type}`)

      setMessage({ type: 'success', text: `${type} deleted successfully` })
      setTimeout(() => window.location.reload(), 1000)
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : `Failed to delete ${type}` })
    } finally {
      setLoading(false)
    }
  }

  const nonAdminUsers = users.filter(u => !u.isAdmin)
  const getEventTitle = (eventId?: string) => !eventId ? '-' : events.find(e => e.id === eventId)?.title || eventId
  const getUsername = (userId?: string) => !userId ? '-' : users.find(u => u.id === userId)?.username || userId
  const getCompanyName = (companyId?: string) => !companyId ? '-' : companies.find(c => c.id === companyId)?.name || companyId

  const tabs: { id: Tab; label: string; count: number; icon: React.ReactNode }[] = [
    { id: 'companies', label: 'Companies', count: companies.length, icon: <Building2 className="w-4 h-4" /> },
    { id: 'users', label: 'Users', count: nonAdminUsers.length, icon: <Users className="w-4 h-4" /> },
    { id: 'bets', label: 'Bets', count: bets.length, icon: <TrendingUp className="w-4 h-4" /> },
    { id: 'comments', label: 'Comments', count: comments.length, icon: <MessageSquare className="w-4 h-4" /> },
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
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1 px-3 py-2 rounded-lg font-medium text-xs sm:text-sm transition-all duration-200 whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-blue-600 dark:bg-blue-500 text-white shadow-lg shadow-blue-600/30'
                  : 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`px-1.5 py-0.5 rounded text-xs font-semibold ${
                activeTab === tab.id
                  ? 'bg-white/30'
                  : 'bg-gray-300 dark:bg-slate-700 text-gray-700 dark:text-slate-300'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden mx-4">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-slate-700/50 border-b border-gray-200 dark:border-slate-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-slate-300 uppercase">Username</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-slate-300 uppercase">Password</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-slate-300 uppercase">Coins</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-slate-300 uppercase">Created</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-600 dark:text-slate-300 uppercase">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                  {nonAdminUsers.map(user => (
                    <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">{user.username}</td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-slate-400 font-mono text-xs">{user.password || '-'}</td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-slate-400">{user.coins}</td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-slate-400">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right">
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
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-slate-700/50 border-b border-gray-200 dark:border-slate-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-slate-300 uppercase">User</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-slate-300 uppercase">Event</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-slate-300 uppercase">Side</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-slate-300 uppercase">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-slate-300 uppercase">Created</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-600 dark:text-slate-300 uppercase">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                  {bets.map(bet => (
                    <tr key={bet.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">{getUsername(bet.userId)}</td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-slate-400 truncate max-w-xs">{getEventTitle(bet.eventId)}</td>
                      <td className="px-6 py-4 text-sm"><span className={`px-2 py-1 rounded text-xs font-medium ${bet.side === 'yes' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'}`}>{bet.side.toUpperCase()}</span></td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-slate-400">{bet.amount}</td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-slate-400">
                        {new Date(bet.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right">
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
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-slate-700/50 border-b border-gray-200 dark:border-slate-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-slate-300 uppercase">User</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-slate-300 uppercase">Comment</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-slate-300 uppercase">Event</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-slate-300 uppercase">Upvotes</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-slate-300 uppercase">Created</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-600 dark:text-slate-300 uppercase">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                  {comments.map(comment => (
                    <tr key={comment.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">{getUsername(comment.userId)}</td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-slate-400 max-w-xs truncate">{comment.content}</td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-slate-400 truncate max-w-xs">{getEventTitle(comment.eventId)}</td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-slate-400">{comment.upvotes || 0}</td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-slate-400">
                        {new Date(comment.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right">
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
            // Check if company has bets on any of its events
            const eventsForCompany = events.filter(e => e.companyId === c.id)
            const betsOnCompanyEvents = bets.filter(b => eventsForCompany.some(e => e.id === b.eventId))
            const companyComments = comments.filter(c2 => c2.companyId === c.id)

            return betsOnCompanyEvents.length > 0 || companyComments.length > 0
          })

          const displayedCompanies = showOnlyActive ? companiesWithActivity : companies

          return (
            <>
              <div className="flex items-center gap-3 mb-4 px-4">
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
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden mx-4">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-slate-700/50 border-b border-gray-200 dark:border-slate-700">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-slate-300 uppercase">Visible</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-slate-300 uppercase">Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-slate-300 uppercase">Slug</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-slate-300 uppercase">Industry</th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-600 dark:text-slate-300 uppercase">Bets</th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-600 dark:text-slate-300 uppercase">Comments</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-slate-300 uppercase">Created</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-600 dark:text-slate-300 uppercase">Action</th>
                      </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                  {displayedCompanies.map(company => {
                    const isHidden = hiddenCompanyIds.includes(company.id)
                    const isToggling = togglingCompanyId === company.id

                    // Calculate bets and comments for this company
                    const eventsForCompany = events.filter(e => e.companyId === company.id)
                    const allBetsCount = bets.filter(b => eventsForCompany.some(e => e.id === b.eventId)).length
                    const activeEventsForCompany = eventsForCompany.filter(e => getEffectiveStatus(e) === 'active')
                    const activeBetsCount = bets.filter(b => activeEventsForCompany.some(e => e.id === b.eventId)).length
                    const commentsCount = comments.filter(c => c.companyId === company.id).length

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
                        <td className="px-6 py-4">
                          <label className="flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={!isHidden}
                              onChange={handleToggle}
                              disabled={isToggling}
                              className="sr-only"
                            />
                            <div className={`relative w-11 h-6 rounded-full transition-colors ${!isHidden ? 'bg-green-500' : 'bg-gray-300 dark:bg-slate-600'}`}>
                              <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${!isHidden ? 'translate-x-5' : ''}`} />
                            </div>
                          </label>
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">{company.name}</td>
                        <td className="px-6 py-4 text-sm text-gray-600 dark:text-slate-400">{company.slug}</td>
                        <td className="px-6 py-4 text-sm text-gray-600 dark:text-slate-400">{company.industry}</td>
                        <td className="px-6 py-4 text-center text-sm text-gray-600 dark:text-slate-400">{activeBetsCount}</td>
                        <td className="px-6 py-4 text-center text-sm text-gray-600 dark:text-slate-400">{commentsCount}</td>
                        <td className="px-6 py-4 text-sm text-gray-600 dark:text-slate-400">
                          {new Date(company.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => deleteItem('companies', company.id)}
                            disabled={loading}
                            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors disabled:opacity-50"
                          >
                            <Trash2 className="w-4 h-4" /> Delete
                          </button>
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
      </div>
    </Layout>
  )
}
