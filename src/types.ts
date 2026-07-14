export type PersonaId = 'anonymous' | 'anna' | 'marc'

export interface Order {
  orderId: string
  date: string
  total: number
  products: string[]   // product names resolved from SKU map
}

export interface D360Profile {
  contactId: string
  firstName: string
  lastName: string
  email: string
  ci: {
    churnRiskScore: number        // 0–1
    customerTier: string          // Basic | Standard | Premium
    totalEnergySpend: number
    avgMonthlyBill: number
    contractCount: number
    hasGasContract: boolean
    hasSolar: boolean
    lastTariffReviewDate: string | null
  }
  segments: string[]
  orders: Order[]
}

export type ProductCategory = 'Gas' | 'Solar' | 'Home Battery' | 'EV Charging' | 'Electricity'

export interface SPIntent {
  category: ProductCategory | null
  score: number
  history: { category: ProductCategory; ts: number }[]
}

export interface HeroContent {
  tagline: string
  headline: string
  body: string
  cta: string
  ctaHref: string
  gradient: string
  badge?: string
  badgeColor?: string
}
