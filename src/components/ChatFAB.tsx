import { MessageCircle } from 'lucide-react'

export const ChatFAB = ({ companyName, onClick, userCount }: { companyName: string; onClick: () => void; userCount?: number }) => {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-6 right-6 z-40 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center gap-2 px-4 py-3 sm:px-5 sm:py-3.5 font-medium text-sm hover:scale-105 active:scale-95 relative"
      title={`${companyName} chat${userCount ? ` (${userCount} ${userCount === 1 ? 'user' : 'users'})` : ''}`}
    >
      <MessageCircle className="w-5 h-5" />
      <span>{companyName} Chat</span>
      {userCount !== undefined && userCount > 0 && (
        <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-red-500 text-white text-xs font-bold ml-1">
          {userCount > 99 ? '99+' : userCount}
        </span>
      )}
    </button>
  )
}
