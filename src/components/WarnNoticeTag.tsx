export const WarnNoticeTag = ({ className = '' }: { className?: string }) => (
  <span className={`inline-block align-middle text-[10px] font-bold bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 px-1.5 py-0.5 rounded-full whitespace-nowrap ${className}`}>
    Warn Notice
  </span>
)
