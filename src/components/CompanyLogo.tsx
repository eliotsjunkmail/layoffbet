import {
  Activity, Briefcase, Users, Shield, Plane, Cpu, Flame, Radio, Phone,
  Wrench, Landmark, ShoppingBag, Truck, TrendingUp, DollarSign, Headphones,
  Code, Car, BookOpen, Heart, Globe, Building2, Cog, Server, Coffee,
  Film, Zap, Utensils, Laptop, BarChart2, LucideIcon,
} from 'lucide-react'

interface CompanyLogoProps {
  name: string
  id: string
  industry?: string
  color?: string
  /** Average YES% across active predictions (0–100). Drives icon color. */
  sentiment?: number
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

const INDUSTRY_ICONS: Record<string, LucideIcon> = {
  'Consulting':             Briefcase,
  'HR Technology':          Users,
  'Insurance':              Shield,
  'Health Insurance':       Shield,
  'Marketing Technology':   BarChart2,
  'Healthcare IT':          Activity,
  'Healthcare':             Activity,
  'Medical Devices':        Activity,
  'Healthcare Retail':      ShoppingBag,
  'Managed Care':           Heart,
  'Airlines':               Plane,
  'Aerospace & Defense':    Plane,
  'Semiconductors':         Cpu,
  'AI & Machine Learning':  Cpu,
  'Oil & Gas':              Flame,
  'Oil & Gas Services':     Wrench,
  'Telecommunications':     Radio,
  'Telecom Infrastructure': Radio,
  'Communications Tech':    Phone,
  'Banking':                Landmark,
  'Financial Services':     DollarSign,
  'Finance':                DollarSign,
  'Retail':                 ShoppingBag,
  'Transportation':         Truck,
  'Logistics':              Truck,
  'Consumer Electronics':   Headphones,
  'Enterprise Software':    Code,
  'Software':               Code,
  'IT Services':            Server,
  'Tech':                   Laptop,
  'Networking & Tech':      Globe,
  'Network Infrastructure': Globe,
  'Automotive Technology':  Car,
  'Automotive':             Car,
  'Education':              BookOpen,
  'BPO':                    Building2,
  'Manufacturing':          Cog,
  'Beverages':              Coffee,
  'Food & Beverage':        Utensils,
  'Media & Entertainment':  Film,
  'Energy':                 Zap,
  'Default':                Building2,
}

/** Returns bg + icon color classes based on YES sentiment percentage */
const sentimentClasses = (s: number | undefined): [string, string] => {
  if (s === undefined) return ['bg-slate-100 dark:bg-slate-700', 'text-slate-500 dark:text-slate-400']
  if (s >= 65) return ['bg-rose-100 dark:bg-rose-900/40',   'text-rose-600 dark:text-rose-400']
  if (s >= 45) return ['bg-amber-100 dark:bg-amber-900/40', 'text-amber-600 dark:text-amber-400']
  return           ['bg-emerald-100 dark:bg-emerald-900/40','text-emerald-600 dark:text-emerald-400']
}

const SIZES = {
  sm: { box: 'w-8 h-8 rounded-lg',   icon: 'w-4 h-4' },
  md: { box: 'w-10 h-10 rounded-xl',  icon: 'w-5 h-5' },
  lg: { box: 'w-12 h-12 rounded-xl',  icon: 'w-6 h-6' },
  xl: { box: 'w-16 h-16 rounded-2xl', icon: 'w-8 h-8' },
}

export const CompanyLogo = ({ industry, color, sentiment, size = 'md' }: CompanyLogoProps) => {
  const Icon: LucideIcon = (industry ? INDUSTRY_ICONS[industry] : undefined) ?? INDUSTRY_ICONS['Default']
  const [bg, iconColor] = sentimentClasses(sentiment)
  const { box, icon } = SIZES[size]

  const bgClass = color ? `bg-[${color}]` : bg
  const iconColorClass = color ? 'text-white' : iconColor

  return (
    <div className={`${box} ${bgClass} flex items-center justify-center flex-shrink-0`} style={color ? { backgroundColor: color } : undefined}>
      <Icon className={`${icon} ${iconColorClass}`} />
    </div>
  )
}
