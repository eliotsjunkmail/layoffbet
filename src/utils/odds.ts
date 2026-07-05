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
  if (days > 0) {
    const dayText = days === 1 ? 'day' : 'days'
    return `${days} ${dayText} left`
  }
  const hourText = hours === 1 ? 'hour' : 'hours'
  return `${hours} ${hourText} left`
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

export const timeAgo = (iso: string | Date): string => {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} min${mins === 1 ? '' : 's'} ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months} month${months === 1 ? '' : 's'} ago`
  const years = Math.floor(months / 12)
  return `${years} year${years === 1 ? '' : 's'} ago`
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


