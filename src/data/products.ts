import type { ProductCategory } from '../types'

export interface Product {
  sku: string
  name: string
  category: ProductCategory
  priceLabel: string
  description: string
  icon: string
}

export const PRODUCTS: Product[] = [
  {
    sku: 'LMN-01005', category: 'Gas', icon: '🔥',
    name: 'Easy Gas',
    priceLabel: '€50–80/mo',
    description: 'Simple variable-rate gas with no lock-in. Ideal for households switching from heating oil.',
  },
  {
    sku: 'LMN-01006', category: 'Gas', icon: '🔥',
    name: 'Fixed Gas',
    priceLabel: '€70–100/mo',
    description: 'Fixed price for 12 months. Protect yourself from market fluctuations.',
  },
  {
    sku: 'LMN-01007', category: 'Gas', icon: '🔥',
    name: 'Green Gas',
    priceLabel: '€80–120/mo',
    description: '100% renewable biogas. Lower your carbon footprint without sacrificing comfort.',
  },
  {
    sku: 'LMN-01008', category: 'Solar', icon: '☀️',
    name: 'Solar Basic 4kWp',
    priceLabel: '€3 500',
    description: 'Entry-level residential solar package with 10-year panel warranty.',
  },
  {
    sku: 'LMN-01009', category: 'Solar', icon: '☀️',
    name: 'Solar Plus 6kWp',
    priceLabel: '€5 200',
    description: 'Most popular. Covers ~70% of average household consumption.',
  },
  {
    sku: 'LMN-01010', category: 'Solar', icon: '☀️',
    name: 'Solar Premium 8kWp',
    priceLabel: '€7 500',
    description: 'Full household self-sufficiency. Pairs perfectly with a home battery.',
  },
  {
    sku: 'LMN-01011', category: 'Home Battery', icon: '🔋',
    name: 'Home Battery 5kWh',
    priceLabel: '€2 800',
    description: 'Store daytime solar for evening use. Never waste a ray of sunshine.',
  },
  {
    sku: 'LMN-01012', category: 'Home Battery', icon: '🔋',
    name: 'Home Battery 10kWh',
    priceLabel: '€4 900',
    description: 'Full-day coverage. Grid independence for the self-sufficient household.',
  },
  {
    sku: 'LMN-01013', category: 'EV Charging', icon: '⚡',
    name: 'Wallbox Basic 7.4kW',
    priceLabel: '€950',
    description: 'Charge from 20% to full overnight. Easy installation, app-controlled.',
  },
  {
    sku: 'LMN-01014', category: 'EV Charging', icon: '⚡',
    name: 'Wallbox Smart 11kW',
    priceLabel: '€1 400',
    description: 'Smart solar-aware charging. Automatically uses excess solar production first.',
  },
]

export const PRODUCTS_BY_CATEGORY = (cat: ProductCategory) =>
  PRODUCTS.filter((p) => p.category === cat)
