import { useState, useEffect } from 'react'

const KEY = 'lb-cookie-notice-v1'
const EVENT = 'lb-cookie-notice-change'

// Marks the cookie/tracking notice as dismissed and notifies listeners (e.g. the chat FAB,
// which stays hidden until the bottom notice is closed so the two don't overlap).
export const dismissCookieNotice = () => {
  try { localStorage.setItem(KEY, '1') } catch { /* ignore private mode */ }
  window.dispatchEvent(new Event(EVENT))
}

export const useCookieNoticeDismissed = () => {
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem(KEY) === '1' } catch { return true }
  })
  useEffect(() => {
    const update = () => { try { setDismissed(localStorage.getItem(KEY) === '1') } catch { /* ignore */ } }
    window.addEventListener(EVENT, update)
    window.addEventListener('storage', update) // keep other tabs in sync
    return () => { window.removeEventListener(EVENT, update); window.removeEventListener('storage', update) }
  }, [])
  return dismissed
}
