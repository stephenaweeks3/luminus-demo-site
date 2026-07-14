import { useEffect, useRef } from 'react'

const PAGE_CATEGORIES: Record<string, string> = {
  '/':        'Home',
  '/gas':     'Gas',
  '/solar':   'Solar',
  '/battery': 'Home Battery',
  '/ev':      'EV Charging',
}

function getOrCreateSessionId(): string {
  const KEY = 'lmn_session_id'
  let id = sessionStorage.getItem(KEY)
  if (!id) {
    id = crypto.randomUUID()
    sessionStorage.setItem(KEY, id)
  }
  return id
}

export function useWebTracking(email: string, pathname: string) {
  const lastPath = useRef<string | null>(null)

  useEffect(() => {
    if (pathname === lastPath.current) return
    lastPath.current = pathname

    fetch('/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id:    getOrCreateSessionId(),
        email,
        page_url:      pathname,
        page_category: PAGE_CATEGORIES[pathname] ?? 'Other',
        event_type:    'page_view',
      }),
    }).catch(() => { /* fire and forget */ })
  }, [email, pathname])
}
