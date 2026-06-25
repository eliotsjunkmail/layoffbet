import { useEffect, useState } from 'react'

const CONFETTI_TICKERS = ['META', 'SNAP', 'JPM', 'GOOG', 'AMZN', 'TSLA', 'NFLX', 'UBER', 'INTC', 'AMD', 'MSFT', 'IBM', 'ORCL', 'CRM', 'PYPL', 'COIN', 'ABNB', 'LYFT', 'DIS', 'GS', 'SPOT', 'RBLX', 'SHOP', 'ZM']

interface BetConfettiProps {
  count?: number
  onComplete?: () => void
}

export const BetConfetti = ({ count = 20, onComplete }: BetConfettiProps) => {
  const [pieces, setPieces] = useState<Array<{
    id: number
    ticker: string
    width: number
    height: number
    left: number
    delay: number
    duration: number
    opacity: number
    sway: number
  }>>([])

  useEffect(() => {
    const newPieces = Array.from({ length: count }).map((_, i) => ({
      id: i,
      ticker: CONFETTI_TICKERS[Math.floor(Math.random() * CONFETTI_TICKERS.length)],
      width: Math.random() * 16 + 42,
      height: Math.random() * 8 + 20,
      left: Math.random() * 90,
      delay: (Math.random() > 0.5 ? 1 : -1) * (Math.random() * 15),
      duration: Math.random() * 8 + 8,
      opacity: 0.6 + Math.random() * 0.3,
      sway: (Math.random() > 0.5 ? 1 : -1) * (Math.random() * 30 + 20),
    }))
    setPieces(newPieces)

    // Call onComplete after confetti is done
    const maxDuration = Math.max(...newPieces.map(p => Math.abs(p.delay) + p.duration))
    const timer = setTimeout(() => {
      onComplete?.()
    }, maxDuration * 1000)

    return () => clearTimeout(timer)
  }, [count, onComplete])

  return (
    <>
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {pieces.map((p) => (
          <div
            key={p.id}
            className="absolute bg-pink-400/60 rounded-sm flex items-center justify-center"
            style={{
              width: `${p.width}px`,
              height: `${p.height}px`,
              left: `${p.left}%`,
              top: '50%',
              opacity: p.opacity,
              ['--sway' as string]: `${p.sway}px`,
              ['--rot' as string]: `${Math.random() * 15 + 8}deg`,
              animation: `confettiFall ${p.duration}s linear ${p.delay}s forwards`,
              transform: 'translateY(-50%)',
            }}
          >
            <span className="text-[8px] font-bold tracking-wider text-pink-950/80">{p.ticker}</span>
          </div>
        ))}
      </div>
      <style>{`
        @keyframes confettiFall {
          0% {
            transform: translateY(-8vh) translateX(0px);
            opacity: 0.6;
          }
          100% {
            transform: translateY(112vh) translateX(var(--sway, 24px));
            opacity: 0;
          }
        }
      `}</style>
    </>
  )
}
