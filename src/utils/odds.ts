export const getProbability = (
  yesPool: number,
  noPool: number
): { yes: number; no: number } => {
  const total = yesPool + noPool
  if (total === 0) return { yes: 50, no: 50 }
  const yes = Math.round((yesPool / total) * 100)
  return { yes, no: 100 - yes }
}

export const formatDate = (iso: string): string => {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export const isExpired = (expiresAt: string): boolean => {
  return new Date(expiresAt) < new Date()
}

export const timeUntil = (iso: string): string => {
  const diff = new Date(iso).getTime() - Date.now()
  if (diff <= 0) return 'Expired'
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  if (days > 0) return `${days}d ${hours}h left`
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  if (hours > 0) return `${hours}h ${mins}m left`
  return `${mins}m left`
}

export const uid = (): string =>
  Math.random().toString(36).slice(2) + Date.now().toString(36)

/** Returns a formatted string describing how much a bet moved the probability. */
export const betMovementStr = (
  yesPool: number,
  noPool: number,
  side: 'yes' | 'no',
  amount: number,
): string => {
  const before = getProbability(yesPool, noPool).yes
  const after  = side === 'yes'
    ? getProbability(yesPool + amount, noPool).yes
    : getProbability(yesPool, noPool + amount).yes
  const delta = after - before            // positive for YES bets, negative for NO bets
  const abs   = Math.abs(delta)
  if (abs === 0) return '< 1% change'
  return delta > 0
    ? `+${abs}% more likely`
    : `${abs}% less likely`
}

export const makeSlug = (text: string): string => {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 50)
}
