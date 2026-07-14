import { createContext, useContext, useState } from 'react'
import type { ReactNode } from 'react'
import type { PersonaId, D360Profile, SPIntent, ProductCategory } from './types'
import { PERSONAS } from './data/personas'
import { useD360Profile } from './hooks/useD360Profile'
import { useSPIntent } from './hooks/useSPIntent'

interface DemoCtx {
  persona: PersonaId
  setPersona: (p: PersonaId) => void
  profile: D360Profile | null
  profileLoading: boolean
  profileError: string | null
  intent: SPIntent
  trackPageView: (cat: ProductCategory) => void
  resetIntent: () => void
  debugOpen: boolean
  toggleDebug: () => void
}

const Ctx = createContext<DemoCtx | null>(null)

export function DemoProvider({ children }: { children: ReactNode }) {
  const [persona, setPersonaState] = useState<PersonaId>('anonymous')
  const [debugOpen, setDebugOpen] = useState(false)

  const personaDef = PERSONAS.find((p) => p.id === persona)
  const { profile, loading: profileLoading, error: profileError } =
    useD360Profile(personaDef?.email ?? null)
  const { intent, trackPageView, reset: resetIntent } = useSPIntent()

  function setPersona(p: PersonaId) {
    setPersonaState(p)
    resetIntent()
  }

  return (
    <Ctx.Provider value={{
      persona, setPersona,
      profile, profileLoading, profileError,
      intent, trackPageView, resetIntent,
      debugOpen, toggleDebug: () => setDebugOpen((v) => !v),
    }}>
      {children}
    </Ctx.Provider>
  )
}

export function useDemo() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useDemo must be used inside DemoProvider')
  return ctx
}
