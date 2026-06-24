import { MessageCircle } from 'lucide-react'
import { useState, useEffect } from 'react'

export const ChatFAB = ({ companyName, onClick, newMessageCount, shouldShake, chatDisplayName, expiresAt }: { companyName: string; onClick: () => void; newMessageCount?: number; shouldShake?: boolean; chatDisplayName?: string; expiresAt?: string }) => {
  const displayText = chatDisplayName || `${companyName} Chat`
  const isCustomName = chatDisplayName && chatDisplayName !== `${companyName} Chat`
  const [timeRemaining, setTimeRemaining] = useState<string>('')

  useEffect(() => {
    if (!isCustomName || !expiresAt) return

    const updateTime = () => {
      const now = new Date().getTime()
      const expires = new Date(expiresAt).getTime()
      const diff = expires - now

      if (diff <= 0) {
        setTimeRemaining('')
        return
      }

      const hours = Math.floor(diff / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

      if (hours > 0) {
        setTimeRemaining(`${hours}h ${minutes}m left`)
      } else {
        setTimeRemaining(`${minutes}m left`)
      }
    }

    updateTime()
    const interval = setInterval(updateTime, 60000) // Update every minute

    return () => clearInterval(interval)
  }, [isCustomName, expiresAt])
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
        @keyframes badgePulse {
          0%, 100% {
            background-color: rgb(239, 68, 68);
            box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7);
          }
          50% {
            box-shadow: 0 0 0 6px rgba(239, 68, 68, 0);
          }
        }
        .badge-pulse {
          animation: badgePulse 2s infinite;
        }
      `}</style>
      <button
        onClick={onClick}
        className={`fixed bottom-6 right-6 z-50 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex flex-col items-start gap-0.5 px-4 py-3 sm:px-5 sm:py-3.5 font-medium text-sm hover:scale-105 active:scale-95 ${shouldShake ? 'fab-shake' : ''}`}
        title={`${displayText}${newMessageCount ? ` (${newMessageCount} new ${newMessageCount === 1 ? 'message' : 'messages'})` : ''}`}
      >
        <div className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5" />
          <span>{displayText}</span>
          <span className="text-xs font-bold text-red-400">LIVE</span>
          {newMessageCount !== undefined && newMessageCount > 0 && (
            <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-red-500 text-white text-xs font-bold ml-1 ${newMessageCount > 0 ? 'badge-pulse' : ''}`}>
              {newMessageCount > 99 ? '99+' : newMessageCount}
            </span>
          )}
        </div>
        {isCustomName && timeRemaining && (
          <span className="text-xs text-blue-100 ml-7">{timeRemaining}</span>
        )}
      </button>
    </>
  )
}
