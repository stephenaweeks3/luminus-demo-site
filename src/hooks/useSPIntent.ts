import { useState, useCallback } from 'react'
import type { ProductCategory, SPIntent } from '../types'

const DECAY_HALF_LIFE_MS = 5 * 60 * 1000   // 50-point score halves after 5 min
const SCORE_PER_VIEW = 25

function decayedScore(views: SPIntent['history'], category: ProductCategory): number {
  const now = Date.now()
  return views
    .filter((v) => v.category === category)
    .reduce((acc, v) => {
      const age = now - v.ts
      const factor = Math.pow(0.5, age / DECAY_HALF_LIFE_MS)
      return acc + SCORE_PER_VIEW * factor
    }, 0)
}

function topCategory(views: SPIntent['history']): { category: ProductCategory; score: number } | null {
  if (!views.length) return null
  const cats: ProductCategory[] = ['Gas', 'Solar', 'Home Battery', 'EV Charging', 'Electricity']
  let best: ProductCategory | null = null
  let bestScore = 0
  for (const cat of cats) {
    const s = decayedScore(views, cat)
    if (s > bestScore) { bestScore = s; best = cat }
  }
  return best ? { category: best, score: Math.min(100, bestScore) } : null
}

export function useSPIntent() {
  const [history, setHistory] = useState<SPIntent['history']>([])

  const trackPageView = useCallback((category: ProductCategory) => {
    setHistory((prev) => [...prev.slice(-50), { category, ts: Date.now() }])
  }, [])

  const reset = useCallback(() => setHistory([]), [])

  const top = topCategory(history)
  const intent: SPIntent = {
    category: top?.category ?? null,
    score: top?.score ?? 0,
    history,
  }

  return { intent, trackPageView, reset }
}
