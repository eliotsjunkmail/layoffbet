import { useState } from 'react'
import { useStore } from '../store/useStore'
import { Layout } from '../components/Layout'
import { Trash2 } from 'lucide-react'

export const Admin = () => {
  const currentUser = useStore(s => s.currentUser)
  const users = useStore(s => s.users)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  if (!currentUser || !currentUser.isAdmin) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto px-4 py-12">
          <p className="text-center text-gray-600 dark:text-slate-400">Access denied. Admin only.</p>
        </div>
      </Layout>
    )
  }

  const deleteUser = async (userId: string) => {
    if (!window.confirm('Are you sure? This will delete the user and all their comments.')) return

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      })

      if (!response.ok) {
        throw new Error('Failed to delete user')
      }

      setSuccess('User deleted successfully')
      setTimeout(() => window.location.reload(), 1000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete user')
    } finally {
      setLoading(false)
    }
  }

  const nonAdminUsers = users.filter(u => !u.isAdmin)

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">Admin Panel</h1>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-xl p-4 mb-6 text-red-600 dark:text-red-300">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-xl p-4 mb-6 text-green-600 dark:text-green-300">
            {success}
          </div>
        )}

        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
          <div className="p-6 border-b border-gray-200 dark:border-slate-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Manage Users</h2>
            <p className="text-sm text-gray-600 dark:text-slate-400 mt-1">
              Total users: {nonAdminUsers.length}
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-slate-700/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-slate-300 uppercase">Username</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-slate-300 uppercase">Created</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-slate-300 uppercase">Coins</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-600 dark:text-slate-300 uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                {nonAdminUsers.map(user => (
                  <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">{user.username}</td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-slate-400">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-slate-400">{user.coins}</td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => deleteUser(user.id)}
                        disabled={loading}
                        className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors disabled:opacity-50"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {nonAdminUsers.length === 0 && (
            <div className="p-6 text-center text-gray-600 dark:text-slate-400">
              No users to manage
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}
