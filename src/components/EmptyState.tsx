import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

interface EmptyStateProps {
  icon: LucideIcon
  title?: string
  description: string
  action?: ReactNode
  size?: 'sm' | 'md'
  className?: string
}

export const EmptyState = ({ icon: Icon, title, description, action, size = 'md', className = '' }: EmptyStateProps) => {
  const padding = size === 'sm' ? 'py-6' : 'py-12 sm:py-16'
  const badgeSize = size === 'sm' ? 'w-12 h-12' : 'w-16 h-16'
  const iconSize = size === 'sm' ? 'w-5 h-5' : 'w-7 h-7'

  return (
    <div className={`flex flex-col items-center justify-center text-center ${padding} ${className}`}>
      <div className={`${badgeSize} rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center mb-3`}>
        <Icon className={`${iconSize} text-blue-400 dark:text-blue-500`} strokeWidth={1.5} />
      </div>
      {title && <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1.5">{title}</h3>}
      <p className="text-gray-400 dark:text-slate-500 text-sm max-w-xs">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
