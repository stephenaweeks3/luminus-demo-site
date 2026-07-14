import { Link, useLocation } from 'react-router-dom'
import { useDemo } from '../context'
import { PERSONAS } from '../data/personas'
import type { PersonaId } from '../types'

const NAV = [
  { label: 'Home', to: '/' },
  { label: 'Gas', to: '/gas' },
  { label: 'Solar', to: '/solar' },
  { label: 'Home Battery', to: '/battery' },
  { label: 'EV Charging', to: '/ev' },
]

export function Header() {
  const { persona, setPersona, profile, toggleDebug } = useDemo()
  const { pathname } = useLocation()

  return (
    <header className="bg-primary text-white shadow-md sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 flex items-center h-14 gap-6">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 text-white no-underline shrink-0">
          {/* Actual Luminus flame icon, cropped to icon portion of the official SVG */}
          <svg width="28" height="28" viewBox="0 0 175 172.418" xmlns="http://www.w3.org/2000/svg">
            <path fill="#FE5815" d="M66.973 124.686c-1.211 1.292-4.526 1.767-5.46 3.229-1.414 2.219-4.675 7.293-7.226 9.708-8.213 7.794-25.811 11.719-34.484 4.263-.562.041-.237.365.44 2.489.629 4.039 3.889 13.524 2.685 15.939.779 2.7 1.604 1.713 3.072 3.194 1.001 1.008 1.427 3.646 2.578 4.363 1.326-.094 2.645-.189 3.965-.283.236.744.48 1.488.724 2.225 1.691-.122 3.396-.243 5.088-.357.953.216 3.842 1.69 4.688 1.935 1.88-.129 3.769-.264 5.649-.407 4.324 1.158 8.085-.648 11.725-3.098 2.03-1.373 4.262-1.163 6.062-2.7 2.611-2.246 6.17-6.623 7.835-9.653 4.093-7.422 2.706-25.195-1.001-29.594-1.449-1.585-3.161-1.611-6.34-1.253m34.18-4.872c-3.065 2.342-4.35 1.76-6.143 5.379-.19 0 .27.549.081.549 1.827 3.64 6.014 5.113 9.093 7.679.961.805 3.552 5.304 4.783 5.636 1.394 1.65 2.294 6.231 3.194 6.231.947 1.271-.075 4.303.852 5.479.068 5.419-.69 5.806-1.637 6.84 0 .38.521 1.36.521 1.739.257.264 2.429 1.82 3.376 1.63 2.943.088 15.046 9.521 16 11.339 8.681.663 8.052-1.995 14.04-4.532 1.623-.689 2.909-.033 3.964-1.143 1.117-1.137 1.211-3.377 2.273-4.534.149-21.337-28.889-41.553-50.397-42.292m23.572-45.099c-10.758 1.631-17.328 5.054-21.394 7.868-2.834 1.969-3.66 3.302-4.275 4.134-.609.84-1.029 2.679-.724 4.621.311 1.929 1.096 3.978 2.773 5.115 13.2-.974 36.129-1.806 40.588 9.289.236 1.543.582 2.463.622 2.842 4.364-1.082 1.17-.703 7.605.318 1.481.229 5.108-.596 7.53-1.178 1.089-.257 1.712-1.258 1.712-1.258s-.21-1.056-.142-1.624c0 0 2.246.155 3.18-.548 6.102-.995 2.895-3.87 5.778-7.098-1.739-20.728-23.004-25.553-43.253-22.481m-81.858 37.813c2.361-.608 6.386-.927 8.497-1.982 3.363-1.678 14.919-9.756 11.245-16.339-1.144-13.863-17.868-2.145-24.979-7.002-7.212-.934-15.317-14.567-17.475-20.399-.853-2.314-.501-1.522-1.658-3.355.013-.19-.737.635-.724.446-2.118 2.449-1.746 4.594-2.077 10.581-.941-.067-1.881-.122-2.828-.182-.182 2.172-.399 3.348-1.414 4.458-.217.372-.426.731-.636 1.097-1.793-.603-.893.25-1.624-1.232C2.557 78.93 3.051 85.608 0 89.403c.142 12.443 24.782 27.807 42.867 23.125m48.009-67.697c.548-4.702-.143-11.583 3.565-14.81 1.09-5.026 8.992-3.863 7.754-7.049-.758-1.996-4.472-1.049-5.974-.684-1.137.277-11.969 3.701-16.137 4.161-1.765-.487-3.524-.974-5.29-1.475-6.793.92-10.724 6.326-14.499 10.636-3.173 3.599-7.462 12.421-4.052 17.692-.19 1.15-.38 2.307-.569 3.457L63.4 68.051c2.666 1.915 3.018 3.336 5.887 5.223.595.887 1.177 1.78 1.773 2.659 2.354 1.549 9.268 1.563 10.425.555 11.143 1.042 9.939-21.502 13.471-26.231-.454-2.137-2.321-4.337-4.08-5.426"/>
          </svg>
          <span className="font-bold text-lg tracking-tight">luminus</span>
        </Link>

        {/* Nav */}
        <nav className="hidden md:flex items-center gap-1 flex-1">
          {NAV.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className={[
                'px-3 py-1.5 rounded text-sm font-medium transition-colors no-underline',
                pathname === n.to
                  ? 'bg-white/20 text-white'
                  : 'text-white/80 hover:text-white hover:bg-white/10',
              ].join(' ')}
            >
              {n.label}
            </Link>
          ))}
        </nav>

        {/* Persona selector */}
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-xs text-white/60 hidden sm:block">Persona:</span>
          <select
            value={persona}
            onChange={(e) => setPersona(e.target.value as PersonaId)}
            className="text-sm bg-white/10 border border-white/20 text-white rounded px-2 py-1 cursor-pointer focus:outline-none focus:ring-1 focus:ring-white/40"
          >
            {PERSONAS.map((p) => (
              <option key={p.id} value={p.id} className="text-ink bg-white">
                {p.label}
              </option>
            ))}
          </select>
          {profile && (
            <span className="text-xs bg-accent/80 text-white px-2 py-0.5 rounded-full">
              {profile.ci.customerTier}
            </span>
          )}
          <button
            onClick={toggleDebug}
            className="text-white/60 hover:text-white text-xs px-2 py-1 rounded border border-white/20 hover:border-white/40 transition-colors ml-1"
            title="Toggle debug panel (?)"
          >
            D360
          </button>
        </div>
      </div>
    </header>
  )
}
