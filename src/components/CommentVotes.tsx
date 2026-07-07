import { ThumbsUp, ThumbsDown, Loader2 } from 'lucide-react'
import { useStore } from '../store/useStore'
import type { Comment } from '../types'

export const CommentVotes = ({ comment, size = 'sm' }: { comment: Comment; size?: 'sm' | 'md' }) => {
  const currentUser = useStore(s => s.currentUser)
  const upvotedCommentIds = useStore(s => s.upvotedCommentIds)
  const downvotedCommentIds = useStore(s => s.downvotedCommentIds)
  const pendingCommentVotes = useStore(s => s.pendingCommentVotes)
  const upvoteComment = useStore(s => s.upvoteComment)
  const downvoteComment = useStore(s => s.downvoteComment)

  const isOwnComment = !!currentUser && comment.userId === currentUser.id
  const hasUpvoted = upvotedCommentIds.includes(comment.id)
  const hasDownvoted = downvotedCommentIds.includes(comment.id)
  const pending = pendingCommentVotes[comment.id]

  const iconCls = size === 'md' ? 'w-3.5 h-3.5' : 'w-3 h-3'
  const textCls = size === 'md' ? 'text-[11px]' : 'text-[10px]'
  const disabledCls = 'text-gray-200 dark:text-slate-700 opacity-60 cursor-not-allowed'

  return (
    <div className="flex items-center gap-0.5 flex-shrink-0">
      <button
        onClick={ev => { ev.stopPropagation(); if (!isOwnComment) upvoteComment(comment.id) }}
        disabled={isOwnComment}
        className={`flex items-center gap-1 p-1.5 rounded-lg transition-colors ${
          isOwnComment ? disabledCls : hasUpvoted ? 'text-blue-600 dark:text-blue-400' : 'text-gray-300 dark:text-slate-600 hover:text-blue-500'
        }`}
      >
        {pending === 'up' ? <Loader2 className={`${iconCls} animate-spin`} /> : <ThumbsUp className={iconCls} />}
        {(comment.upvotes ?? 0) > 0 && <span className={`${textCls} font-medium`}>{comment.upvotes}</span>}
      </button>
      <button
        onClick={ev => { ev.stopPropagation(); if (!isOwnComment) downvoteComment(comment.id) }}
        disabled={isOwnComment}
        className={`flex items-center gap-1 p-1.5 rounded-lg transition-colors ${
          isOwnComment ? disabledCls : hasDownvoted ? 'text-rose-600 dark:text-rose-400' : 'text-gray-300 dark:text-slate-600 hover:text-rose-500'
        }`}
      >
        {pending === 'down' ? <Loader2 className={`${iconCls} animate-spin`} /> : <ThumbsDown className={iconCls} />}
        {(comment.downvotes ?? 0) > 0 && <span className={`${textCls} font-medium`}>{comment.downvotes}</span>}
      </button>
    </div>
  )
}
