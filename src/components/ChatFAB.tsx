import { MessageCircle } from 'lucide-react'

export const ChatFAB = ({ companyName, onClick }: { companyName: string; onClick: () => void }) => {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-6 right-6 z-40 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center gap-2 px-4 py-3 sm:px-5 sm:py-3.5 font-medium text-sm hover:scale-105 active:scale-95"
      title={`${companyName} chat`}
    >
      <MessageCircle className="w-5 h-5" />
      <span>{companyName} Chat</span>
    </button>
  )
}
