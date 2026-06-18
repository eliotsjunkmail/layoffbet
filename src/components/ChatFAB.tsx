import { MessageCircle } from 'lucide-react'

export const ChatFAB = ({ companyName, onClick, newMessageCount, shouldShake }: { companyName: string; onClick: () => void; newMessageCount?: number; shouldShake?: boolean }) => {
  return (
    <>
      <style>{`
        @keyframes fabShake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
          20%, 40%, 60%, 80% { transform: translateX(4px); }
        }
        .fab-shake {
          animation: fabShake 0.6s ease-in-out;
        }
      `}</style>
      <button
        onClick={onClick}
        className={`fixed bottom-6 right-6 z-50 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center gap-2 px-4 py-3 sm:px-5 sm:py-3.5 font-medium text-sm hover:scale-105 active:scale-95 ${shouldShake ? 'fab-shake' : ''}`}
        title={`${companyName} chat${newMessageCount ? ` (${newMessageCount} new ${newMessageCount === 1 ? 'message' : 'messages'})` : ''}`}
      >
        <MessageCircle className="w-5 h-5" />
        <span>{companyName} Chat</span>
        {newMessageCount !== undefined && newMessageCount > 0 && (
          <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-blue-500 text-white text-xs font-semibold ml-1">
            {newMessageCount > 99 ? '99+' : newMessageCount} new
          </span>
        )}
      </button>
    </>
  )
}
