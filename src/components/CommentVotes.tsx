import { ThumbsUp, Loader2 } from 'lucide-react'
import { useStore } from '../store/useStore'
import type { Comment } from '../types'

export const CommentVotes = ({ comment, size = 'sm' }: { comment: Comment; size?: 'sm' | 'md' }) => {
  const currentUser = useStore(s => s.currentUser)
  const users = useStore(s => s.users)
  const upvotedCommentIds = useStore(s => s.upvotedCommentIds)
  const pendingCommentVotes = useStore(s => s.pendingCommentVotes)
  const upvoteComment = useStore(s => s.upvoteComment)

  // Anonymous (not-logged-in) users can still vote, using their server-assigned anonymous identity
  const anonUserId = typeof window !== 'undefined' ? localStorage.getItem('lb-anon-user-id') : null
  const voterId = currentUser?.id || anonUserId || users.find(u => u.isAnonymous)?.id

  const canVote = !!voterId
  const hasUpvoted = upvotedCommentIds.includes(comment.id)
  const pending = pendingCommentVotes[comment.id]

  const iconCls = size === 'md' ? 'w-3.5 h-3.5' : 'w-3 h-3'
  const textCls = size === 'md' ? 'text-[11px]' : 'text-[10px]'
  const disabledCls = 'text-gray-200 dark:text-slate-700 opacity-60 cursor-not-allowed'

  return (
    <button
      onClick={ev => { ev.stopPropagation(); if (canVote) upvoteComment(comment.id) }}
      disabled={!canVote}
      className={`flex items-center gap-1 p-1.5 rounded-lg transition-colors flex-shrink-0 ${
        !canVote ? disabledCls : hasUpvoted ? 'text-blue-600 dark:text-blue-400' : 'text-gray-300 dark:text-slate-600 hover:text-blue-500'
      }`}
    >
      {pending ? <Loader2 className={`${iconCls} animate-spin`} /> : <ThumbsUp className={iconCls} />}
      {(comment.upvotes ?? 0) > 0 && <span className={`${textCls} font-medium`}>{comment.upvotes}</span>}
    </button>
  )
}
