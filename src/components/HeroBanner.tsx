import { Link } from 'react-router-dom'
import { useDemo } from '../context'
import type { HeroContent } from '../types'

// ── Hero helpers ──────────────────────────────────────────────────────────────

function batteryHero(firstName: string, churnRiskScore: number): HeroContent {
  // Keep churn badge visible when risk is significant — the D360 foundation
  // stays on screen even after SP elevates the battery signal (Act 3 story)
  const highChurn = churnRiskScore >= 0.6
  return {
    tagline: 'Store More. Spend Less.',
    headline: `${firstName}, complete your solar setup`,
    body: 'You already generate your own energy. Add a home battery and use it 24/7 — even after sunset.',
    cta: 'Discover Batteries',
    ctaHref: '/battery',
    gradient: 'hero-gradient-battery',
    badge: highChurn ? `⚠ Churn risk: ${Math.round(churnRiskScore * 100)}%` : '☀️ Solar customer',
    badgeColor: highChurn ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700',
  }
}

function gasHero(firstName: string): HeroContent {
  return {
    tagline: 'Switch to Gas',
    headline: `${firstName}, complete your energy bundle`,
    body: 'Most Belgian households save up to €200/year by bundling electricity and gas with Luminus.',
    cta: 'Explore Gas Plans',
    ctaHref: '/gas',
    gradient: 'hero-gradient-gas',
    badge: '⚡ Electricity customer',
    badgeColor: 'bg-blue-100 text-blue-700',
  }
}

// ── Main hero decision ────────────────────────────────────────────────────────

function computeHero(
  profile: ReturnType<typeof useDemo>['profile'],
  intent: ReturnType<typeof useDemo>['intent'],
): HeroContent {
  if (profile) {
    const { ci, firstName, segments } = profile
    const inSeg = (s: string) => segments.includes(s)
    const monthsSinceTariff = ci.lastTariffReviewDate
      ? Math.floor((Date.now() - new Date(ci.lastTariffReviewDate).getTime()) / (30 * 24 * 3600 * 1000))
      : null

    // ── SP real-time multiplier (logged-in) ───────────────────────────────────
    // When SP intent crosses 50 and aligns with a secondary D360 cross-sell
    // signal, elevate that signal above the D360 baseline.
    // Demo Act 3: Marc starts on retention (D360), then browses Battery →
    // SP fires this branch → battery hero with churn badge still showing.
    if (intent.score > 50) {
      if (intent.category === 'Home Battery' && ci.hasSolar) {
        return batteryHero(firstName, ci.churnRiskScore)
      }
      if (intent.category === 'Gas' && !ci.hasGasContract) {
        return gasHero(firstName)
      }
    }

    // ── D360 baseline ─────────────────────────────────────────────────────────

    // Priority 1: high churn risk → retention (Marc's initial D360 hero)
    if (ci.churnRiskScore >= 0.6) {
      return {
        tagline: 'We value your loyalty',
        headline: `${firstName}, let's find you a better deal`,
        body: 'Our energy advisors are ready to review your current plan and match you with the best offer for your needs.',
        cta: 'Talk to an Expert',
        ctaHref: '#contact',
        gradient: 'hero-gradient-retention',
        badge: `⚠ Churn risk: ${Math.round(ci.churnRiskScore * 100)}%`,
        badgeColor: 'bg-red-100 text-red-700',
      }
    }

    // Priority 2: solar owner → battery cross-sell
    if (ci.hasSolar) {
      return batteryHero(firstName, ci.churnRiskScore)
    }

    // Priority 3: electricity only, no gas → gas cross-sell (Anna's hero)
    if (!ci.hasGasContract || inSeg('LMN_Gas_CrossSell')) {
      return gasHero(firstName)
    }

    // Priority 4: tariff overdue
    if (monthsSinceTariff !== null && monthsSinceTariff > 12) {
      return {
        tagline: 'Time for a tariff health check',
        headline: `${firstName}, your tariff is ${monthsSinceTariff} months old`,
        body: "Energy markets change. Let us review whether you're still on the best plan for your usage.",
        cta: 'Check My Tariff',
        ctaHref: '#tariff',
        gradient: 'hero-gradient-default',
        badge: `📅 Last reviewed ${monthsSinceTariff}mo ago`,
        badgeColor: 'bg-orange-100 text-orange-700',
      }
    }
  }

  // ── Anonymous / no D360 signal → SP intent drives the hero ───────────────
  if (intent.category && intent.score > 30) {
    const cat = intent.category
    if (cat === 'Gas') {
      return {
        tagline: 'Switch to Gas',
        headline: 'Complete Your Energy Bundle',
        body: 'Add natural gas to your plan and save up to 20% compared to separate providers.',
        cta: 'Explore Gas Plans',
        ctaHref: '/gas',
        gradient: 'hero-gradient-gas',
      }
    }
    if (cat === 'Solar') {
      return {
        tagline: 'Go Solar',
        headline: 'Generate Your Own Energy',
        body: 'Reduce your electricity bill by up to 70% with Luminus solar panels. Free installation quote.',
        cta: 'Get Solar Quote',
        ctaHref: '/solar',
        gradient: 'hero-gradient-solar',
      }
    }
    if (cat === 'Home Battery') {
      return {
        tagline: 'Store More. Spend Less.',
        headline: 'Power Your Home Day & Night',
        body: 'Never waste a ray of sunshine. Store daytime solar and use it in the evening.',
        cta: 'Discover Batteries',
        ctaHref: '/battery',
        gradient: 'hero-gradient-battery',
      }
    }
    if (cat === 'EV Charging') {
      return {
        tagline: 'Charge at Home',
        headline: 'Smart EV Charging with Luminus',
        body: 'Charge overnight at the lowest rates. Solar-aware wallbox automatically uses your excess production.',
        cta: 'Explore Wallboxes',
        ctaHref: '/ev',
        gradient: 'hero-gradient-battery',
      }
    }
  }

  // ── Default ───────────────────────────────────────────────────────────────
  return {
    tagline: 'Smart Energy for Your Home',
    headline: 'Discover Luminus Energy Solutions',
    body: 'Electricity, gas, solar, and home batteries — all from one trusted Belgian energy provider.',
    cta: 'Explore Plans',
    ctaHref: '/gas',
    gradient: 'hero-gradient-default',
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

export function HeroBanner() {
  const { profile, intent, persona, profileLoading } = useDemo()
  const hero = computeHero(profile, intent)

  return (
    <section className={`${hero.gradient} text-white py-20 px-4 relative overflow-hidden`}>
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-white translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full bg-white -translate-x-1/2 translate-y-1/2" />
      </div>

      <div className="max-w-4xl mx-auto relative">
        {/* SP intent indicator — visible for all personas when score > 20 */}
        {intent.category && intent.score > 20 && (
          <div className="mb-4 flex items-center gap-2">
            <span className="text-xs bg-white/10 border border-white/20 rounded-full px-3 py-1">
              SP intent: <strong>{intent.category}</strong> ({Math.round(intent.score)}/100)
            </span>
          </div>
        )}

        {/* D360 badge */}
        {hero.badge && (
          <div className={`inline-block text-xs font-medium px-3 py-1 rounded-full mb-4 ${hero.badgeColor ?? 'bg-white/20 text-white'}`}>
            {hero.badge}
          </div>
        )}

        <p className="text-sm font-semibold uppercase tracking-widest opacity-80 mb-2">
          {hero.tagline}
        </p>

        <h1 className="text-4xl md:text-5xl font-bold mb-4 leading-tight">
          {profileLoading ? (
            <span className="opacity-50 animate-pulse">Loading profile…</span>
          ) : (
            hero.headline
          )}
        </h1>

        <p className="text-lg opacity-90 mb-8 max-w-xl">{hero.body}</p>

        <div className="flex flex-wrap gap-3 items-center">
          <Link
            to={hero.ctaHref}
            className="bg-accent hover:bg-accent-dark text-white font-semibold px-6 py-3 rounded-lg transition-colors no-underline inline-block"
          >
            {hero.cta}
          </Link>
          {persona === 'anonymous' && (
            <span className="text-sm opacity-70">
              ↑ adapts as you browse product pages
            </span>
          )}
        </div>
      </div>
    </section>
  )
}
