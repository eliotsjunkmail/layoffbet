import { MessageCircle } from 'lucide-react'
import { useState, useEffect } from 'react'

export const ChatFAB = ({ companyName, onClick, newMessageCount, shouldShake, chatDisplayName, expiresAt }: { companyName: string; onClick: () => void; newMessageCount?: number; shouldShake?: boolean; chatDisplayName?: string; expiresAt?: string | null }) => {
  const displayText = chatDisplayName || `${companyName} Chat`
  const isCustomName = chatDisplayName && chatDisplayName !== `${companyName} Chat`
  const [timeRemaining, setTimeRemaining] = useState<string>('')

  useEffect(() => {
    if (!isCustomName || !expiresAt) {
      setTimeRemaining('')
      return
    }

    const updateTimeRemaining = () => {
      const now = new Date()
      const expiry = new Date(expiresAt)
      const diff = expiry.getTime() - now.getTime()

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

    updateTimeRemaining()
    const interval = setInterval(updateTimeRemaining, 60000) // Update every minute

    return () => clearInterval(interval)
  }, [expiresAt, isCustomName])
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
            background-color: rgb(107, 32, 32);
            box-shadow: 0 0 0 0 rgba(140, 46, 46, 0.5);
          }
          50% {
            box-shadow: 0 0 0 5px rgba(140, 46, 46, 0);
          }
        }
        .badge-pulse {
          animation: badgePulse 2.5s infinite;
        }
      `}</style>
      <button
        onClick={onClick}
        className={`fixed bottom-6 right-6 z-50 bg-slate-900 hover:bg-slate-800 text-slate-100 border border-blue-600 hover:border-blue-400 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 flex items-center gap-2 px-4 py-3 sm:px-5 sm:py-3.5 font-medium text-sm hover:scale-105 active:scale-95 ${shouldShake ? 'fab-shake' : ''}`}
        title={`${displayText}${timeRemaining ? ` (${timeRemaining})` : ''}${newMessageCount ? ` (${newMessageCount} new ${newMessageCount === 1 ? 'message' : 'messages'})` : ''}`}
      >
        <MessageCircle className="w-5 h-5 text-blue-400" />
        <div className="flex flex-col items-start">
          <span>{displayText}</span>
          {timeRemaining && <span className="text-xs text-slate-400 font-mono">{timeRemaining}</span>}
        </div>
        <span className="text-xs font-bold font-mono text-red-500">LIVE</span>
        {newMessageCount !== undefined && newMessageCount > 0 && (
          <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded-md bg-red-700 text-slate-100 text-xs font-bold font-mono ml-1 ${newMessageCount > 0 ? 'badge-pulse' : ''}`}>
            {newMessageCount > 99 ? '99+' : newMessageCount}
          </span>
        )}
      </button>
    </>
  )
}
