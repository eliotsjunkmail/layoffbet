import type { Company } from '../types'

const STOPWORDS = new Set(['the', 'a', 'of', 'and', 'for', 'in', 'at', 'inc', 'incorporated', 'corp', 'corporation', 'co', 'company', 'llc', 'ltd', 'limited', 'group', 'holdings', 'holding', 'plc'])

const normalize = (name: string) =>
  name.toLowerCase().replace(/[.,'’&]/g, '').replace(/[-_/]/g, ' ').replace(/\s+/g, ' ').trim()

const significantWords = (name: string) =>
  normalize(name).split(' ').filter(w => w && !STOPWORDS.has(w))

const initials = (name: string) =>
  significantWords(name).map(w => w[0]).join('')

const levenshtein = (a: string, b: string): number => {
  const m = a.length, n = b.length
  if (m === 0) return n
  if (n === 0) return m
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))
  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
    }
  }
  return dp[m][n]
}

const similarity = (a: string, b: string): number => {
  if (!a.length && !b.length) return 1
  return 1 - levenshtein(a, b) / Math.max(a.length, b.length)
}

// Returns a short human-readable reason when two companies look like the same
// real-world entity (e.g. "ADP" / "Automatic Data Processing"), or null.
export const matchDuplicateCompanies = (a: Company, b: Company): string | null => {
  const normA = normalize(a.name)
  const normB = normalize(b.name)
  if (!normA || !normB) return null
  if (normA === normB) return 'Identical name'

  const wordsA = significantWords(a.name)
  const wordsB = significantWords(b.name)

  if (wordsA.length >= 2 && wordsB.length >= 2) {
    const [shorter, longer] = wordsA.length <= wordsB.length ? [wordsA, wordsB] : [wordsB, wordsA]
    const longerSet = new Set(longer)
    if (shorter.every(w => longerSet.has(w))) return 'One name contains the other'
  }

  // Catches both a pure acronym name ("ADP" vs "Automatic Data Processing") and a
  // hybrid one where the acronym is just one word of a longer name ("BNY Mellon"
  // vs "The Bank of New York" — "bny" is the initials of "Bank New York").
  const initA = initials(a.name)
  const initB = initials(b.name)
  if (initA.length >= 2 && wordsB.includes(initA)) return 'Possible acronym match'
  if (initB.length >= 2 && wordsA.includes(initB)) return 'Possible acronym match'

  if (Math.min(normA.length, normB.length) >= 4 && similarity(normA, normB) >= 0.85) {
    return 'Similar spelling'
  }

  return null
}

export interface DuplicateGroup {
  id: string
  companies: Company[]
  reasons: string[]
}

// Union-find over pairwise matches so a chain like "ADP" / "ADP Inc" / "Automatic
// Data Processing" surfaces as one group instead of overlapping pairs.
export const findPotentialDuplicateGroups = (companies: Company[], dismissedPairKeys: Set<string>): DuplicateGroup[] => {
  const n = companies.length
  const parent = Array.from({ length: n }, (_, i) => i)
  const find = (x: number): number => {
    while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x] }
    return x
  }
  const union = (x: number, y: number) => {
    const rx = find(x), ry = find(y)
    if (rx !== ry) parent[rx] = ry
  }

  const pairReasons = new Map<string, string>()
  const pairKey = (idA: string, idB: string) => [idA, idB].sort().join('|')

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const key = pairKey(companies[i].id, companies[j].id)
      if (dismissedPairKeys.has(key)) continue
      const reason = matchDuplicateCompanies(companies[i], companies[j])
      if (reason) {
        union(i, j)
        pairReasons.set(key, reason)
      }
    }
  }

  const groupsByRoot = new Map<number, number[]>()
  for (let i = 0; i < n; i++) {
    const root = find(i)
    if (!groupsByRoot.has(root)) groupsByRoot.set(root, [])
    groupsByRoot.get(root)!.push(i)
  }

  const groups: DuplicateGroup[] = []
  for (const indices of groupsByRoot.values()) {
    if (indices.length < 2) continue
    const groupCompanies = indices.map(i => companies[i]).sort((x, y) => x.name.localeCompare(y.name))
    const reasons = new Set<string>()
    for (let a = 0; a < indices.length; a++) {
      for (let b = a + 1; b < indices.length; b++) {
        const r = pairReasons.get(pairKey(companies[indices[a]].id, companies[indices[b]].id))
        if (r) reasons.add(r)
      }
    }
    groups.push({ id: groupCompanies.map(c => c.id).join('-'), companies: groupCompanies, reasons: Array.from(reasons) })
  }

  return groups.sort((a, b) => a.companies[0].name.localeCompare(b.companies[0].name))
}

export const dedupePairKey = (idA: string, idB: string) => [idA, idB].sort().join('|')

const DISMISSED_PAIRS_KEY = 'lb-dismissed-duplicate-pairs'

export const loadDismissedPairs = (): Set<string> => {
  try {
    const raw = localStorage.getItem(DISMISSED_PAIRS_KEY)
    return new Set(raw ? JSON.parse(raw) : [])
  } catch {
    return new Set()
  }
}

export const saveDismissedPairs = (pairs: Set<string>) => {
  localStorage.setItem(DISMISSED_PAIRS_KEY, JSON.stringify(Array.from(pairs)))
}
