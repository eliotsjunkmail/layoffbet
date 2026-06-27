import type { ReactNode } from 'react'
import { Header } from './Header'
import { Footer } from './Footer'

interface LayoutProps {
  children: ReactNode
  hideHeader?: boolean
  fullWidth?: boolean
}

export const Layout = ({ children, hideHeader, fullWidth }: LayoutProps) => (
  <div className="min-h-screen bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-white flex flex-col">
    {!hideHeader && <Header />}
    <main className={`flex-1 ${fullWidth ? '' : 'max-w-md mx-auto w-full px-4 py-6'}`}>
      {children}
    </main>
    <Footer />
  </div>
)
