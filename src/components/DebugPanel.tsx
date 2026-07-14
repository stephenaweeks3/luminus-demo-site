import { useEffect } from 'react'
import { useDemo } from '../context'

// ── helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch { return iso }
}

function fmtTime(iso: string) {
  if (!iso) return '—'
  try { return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) } catch { return iso }
}

function fmtEur(n: number) {
  return `€${n.toLocaleString('en-BE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

function Pill({ label, color }: { label: string; color: string }) {
  return (
    <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${color}`}>
      {label}
    </span>
  )
}

function Row({ label, value, highlight }: { label: string; value: React.ReactNode; highlight?: string }) {
  return (
    <div className="flex justify-between items-start gap-2 py-1.5 border-b border-gray-100 last:border-0">
      <span className="text-xs text-gray-500 shrink-0">{label}</span>
      <span className={`text-xs text-right font-medium ${highlight ?? 'text-gray-800'}`}>{value}</span>
    </div>
  )
}

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="flex items-baseline justify-between mb-2">
      <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">{title}</span>
      {subtitle && <span className="text-xs text-gray-300">{subtitle}</span>}
    </div>
  )
}

// ── component ─────────────────────────────────────────────────────────────────

export function DebugPanel() {
  const { profile, profileLoading, profileError, intent, persona, toggleDebug, debugOpen } = useDemo()

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === '?') toggleDebug() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [toggleDebug])

  if (!debugOpen) return null

  const ci = profile?.ci
  const churnPct = ci ? Math.round(ci.churnRiskScore * 100) : null
  const isHighChurn = (churnPct ?? 0) >= 60

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-40 backdrop-blur-[2px]"
        onClick={toggleDebug}
      />

      {/* Drawer */}
      <div className="fixed top-0 right-0 h-full w-[480px] max-w-full bg-white z-50 shadow-2xl flex flex-col overflow-hidden">

        {/* ── Header ─────────────────────────────────────────── */}
        <div className="bg-gradient-to-br from-[#0C4B8F] to-[#1a6abf] text-white px-5 py-4 flex-shrink-0">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-widest opacity-60 mb-1">
                Customer 360 Profile
              </div>
              {profile ? (
                <div>
                  <div className="text-xl font-bold">{profile.firstName} {profile.lastName}</div>
                  <div className="text-sm opacity-75 mt-0.5">{profile.email}</div>
                  <div className="flex gap-2 mt-2 flex-wrap">
                    <Pill
                      label={ci?.customerTier ?? 'Basic'}
                      color="bg-white/20 text-white"
                    />
                    {isHighChurn && (
                      <Pill label={`⚠ Churn risk ${churnPct}%`} color="bg-red-500/80 text-white" />
                    )}
                    {ci?.hasSolar && <Pill label="☀️ Solar" color="bg-yellow-400/80 text-white" />}
                    {ci?.hasGasContract && <Pill label="🔥 Gas" color="bg-orange-400/80 text-white" />}
                  </div>
                </div>
              ) : profileLoading ? (
                <div className="text-white/60 text-sm animate-pulse">Loading profile…</div>
              ) : (
                <div className="text-white/60 text-sm">
                  {persona === 'anonymous' ? 'Anonymous visitor — no D360 profile' : profileError ?? 'No profile loaded'}
                </div>
              )}
            </div>
            <button onClick={toggleDebug} className="text-white/60 hover:text-white mt-1 text-lg">✕</button>
          </div>

          {/* Data source labels */}
          <div className="flex gap-3 mt-3 text-[10px] opacity-50">
            <span>📡 Data Cloud</span>
            <span>•</span>
            <span>🔁 Identity Resolution</span>
            <span>•</span>
            <span>💡 Calculated Insights</span>
          </div>
        </div>

        {/* ── Scrollable body ─────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto bg-gray-50 divide-y divide-gray-100">

          {/* ── D360 Calculated Insights ─── */}
          {profile && ci && (
            <div className="px-5 py-4 bg-white">
              <SectionHeader title="Calculated Insights" subtitle="from Data Cloud" />
              <Row label="Churn risk score"
                value={`${churnPct}%`}
                highlight={isHighChurn ? 'text-red-600' : 'text-green-600'}
              />
              <Row label="Customer tier" value={ci.customerTier} highlight="text-blue-600" />
              <Row label="Total lifetime spend" value={fmtEur(ci.totalEnergySpend)} />
              <Row label="Avg monthly bill" value={`${fmtEur(ci.avgMonthlyBill)}/mo`} />
              <Row label="Active contracts" value={String(ci.contractCount)} />
              <Row label="Gas contract"
                value={ci.hasGasContract ? '✓ Yes' : '✗ No'}
                highlight={ci.hasGasContract ? 'text-green-600' : 'text-red-500'}
              />
              <Row label="Solar installation"
                value={ci.hasSolar ? '✓ Yes' : '✗ No'}
                highlight={ci.hasSolar ? 'text-yellow-600' : 'text-gray-400'}
              />
              <Row label="Last tariff review"
                value={ci.lastTariffReviewDate ? fmtDate(ci.lastTariffReviewDate) : 'Never'}
                highlight={!ci.lastTariffReviewDate ? 'text-orange-500' : undefined}
              />
            </div>
          )}

          {/* ── Segments ─── */}
          {profile && (
            <div className="px-5 py-4 bg-white">
              <SectionHeader title="Active Segments" subtitle="Data Cloud" />
              {profile.segments.length === 0 ? (
                <p className="text-xs text-gray-400 italic">No segments assigned</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {profile.segments.map((s) => (
                    <Pill key={s} label={s} color="bg-purple-100 text-purple-700" />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Purchase History ─── */}
          {profile && (
            <div className="px-5 py-4 bg-white">
              <SectionHeader
                title="Purchase History"
                subtitle={`${profile.orders.length} order${profile.orders.length !== 1 ? 's' : ''}`}
              />
              {profile.orders.length === 0 ? (
                <p className="text-xs text-gray-400 italic">No orders found in Data Cloud</p>
              ) : (
                <div className="space-y-2">
                  {profile.orders.map((o) => (
                    <div key={o.orderId} className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="text-xs font-semibold text-gray-700">{o.orderId}</div>
                          <div className="text-[11px] text-gray-400 mt-0.5">{fmtDate(o.date)}</div>
                        </div>
                        <div className="text-xs font-bold text-gray-800">{fmtEur(o.total)}</div>
                      </div>
                      {o.products.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {o.products.map((p) => (
                            <Pill key={p} label={p} color="bg-blue-50 text-blue-600" />
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Web Navigation (SP Intent) ─── */}
          <div className="px-5 py-4 bg-white">
            <SectionHeader title="Web Navigation" subtitle="this session · Salesforce Personalization" />
            {!intent.category && intent.history.length === 0 ? (
              <p className="text-xs text-gray-400 italic">No browsing activity yet — navigate to a product page</p>
            ) : (
              <>
                {intent.category && (
                  <div className="mb-3 rounded-lg bg-orange-50 border border-orange-100 px-3 py-2">
                    <div className="text-[10px] uppercase font-semibold text-orange-400 mb-1">Current intent</div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-orange-700">{intent.category}</span>
                      <span className="text-xs text-orange-500">Score: {Math.round(intent.score)}/100</span>
                    </div>
                    <div className="mt-1.5 h-1.5 rounded-full bg-orange-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-orange-400 transition-all duration-500"
                        style={{ width: `${Math.round(intent.score)}%` }}
                      />
                    </div>
                  </div>
                )}
                {intent.history.length > 0 && (
                  <div className="space-y-1">
                    {[...intent.history].reverse().slice(0, 10).map((h, i) => (
                      <div key={i} className="flex items-center justify-between text-xs py-1 border-b border-gray-50 last:border-0">
                        <span className="text-gray-600">→ {h.category}</span>
                        <span className="text-gray-300">{fmtTime(new Date(h.ts).toISOString())}</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* ── Contact ID footer ─── */}
          {profile && (
            <div className="px-5 py-3 bg-gray-50">
              <div className="text-[10px] font-mono text-gray-300 break-all">
                contactId: {profile.contactId}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
