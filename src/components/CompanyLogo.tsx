interface CompanyLogoProps {
  name: string
  id: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

const PALETTES = [
  ['bg-violet-100 dark:bg-violet-900/40', 'text-violet-700 dark:text-violet-300'],
  ['bg-blue-100 dark:bg-blue-900/40', 'text-blue-700 dark:text-blue-300'],
  ['bg-emerald-100 dark:bg-emerald-900/40', 'text-emerald-700 dark:text-emerald-300'],
  ['bg-amber-100 dark:bg-amber-900/40', 'text-amber-700 dark:text-amber-300'],
  ['bg-rose-100 dark:bg-rose-900/40', 'text-rose-700 dark:text-rose-300'],
  ['bg-cyan-100 dark:bg-cyan-900/40', 'text-cyan-700 dark:text-cyan-300'],
  ['bg-indigo-100 dark:bg-indigo-900/40', 'text-indigo-700 dark:text-indigo-300'],
  ['bg-orange-100 dark:bg-orange-900/40', 'text-orange-700 dark:text-orange-300'],
  ['bg-teal-100 dark:bg-teal-900/40', 'text-teal-700 dark:text-teal-300'],
  ['bg-pink-100 dark:bg-pink-900/40', 'text-pink-700 dark:text-pink-300'],
]

const SPECIAL: Record<string, [string, string]> = {
  'comp-1': ['bg-violet-600', 'text-white'],
  'comp-2': ['bg-indigo-600', 'text-white'],
  'comp-3': ['bg-emerald-600', 'text-white'],
}

const hashId = (id: string) => {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) & 0xffffffff
  return Math.abs(h)
}

const SIZES = {
  sm: { box: 'w-8 h-8 rounded-lg text-sm', font: 'text-xs' },
  md: { box: 'w-10 h-10 rounded-xl text-base', font: 'text-sm' },
  lg: { box: 'w-12 h-12 rounded-xl text-lg', font: 'text-base' },
  xl: { box: 'w-16 h-16 rounded-2xl text-2xl', font: 'text-xl' },
}

export const CompanyLogo = ({ name, id, size = 'md' }: CompanyLogoProps) => {
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase()

  const special = SPECIAL[id]
  const [bg, text] = special ?? PALETTES[hashId(id) % PALETTES.length]
  const { box, font } = SIZES[size]

  return (
    <div className={`${box} ${bg} flex items-center justify-center font-bold flex-shrink-0 ${text} ${font}`}>
      {initials}
    </div>
  )
}
