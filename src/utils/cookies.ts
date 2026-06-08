// Cookie utilities for anonymous user favorites
const FAVORITE_COMPANY_COOKIE = 'lb-favorite-company'

export const cookieUtils = {
  // Get favorite company from session cookie
  getFavoriteCompany: (): string | null => {
    if (typeof document === 'undefined') return null
    const cookies = document.cookie.split(';')
    const cookie = cookies.find(c => c.trim().startsWith(`${FAVORITE_COMPANY_COOKIE}=`))
    return cookie ? cookie.split('=')[1] : null
  },

  // Set favorite company in session cookie (no expiration = session only)
  setFavoriteCompany: (companyId: string): void => {
    if (typeof document === 'undefined') return
    document.cookie = `${FAVORITE_COMPANY_COOKIE}=${companyId}; path=/`
    console.log('[Cookie] Set favorite company:', companyId)
  },

  // Clear favorite company cookie
  clearFavoriteCompany: (): void => {
    if (typeof document === 'undefined') return
    document.cookie = `${FAVORITE_COMPANY_COOKIE}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/`
    console.log('[Cookie] Cleared favorite company')
  },
}
