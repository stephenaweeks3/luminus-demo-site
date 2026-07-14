import { useEffect } from 'react'
import { useDemo } from '../context'
import { ProductCard } from '../components/ProductCard'
import { PRODUCTS_BY_CATEGORY } from '../data/products'
import type { ProductCategory } from '../types'

const CATEGORY_META: Record<ProductCategory, {
  icon: string
  headline: string
  body: string
  heroClass: string
}> = {
  Gas: {
    icon: '🔥',
    headline: 'Natural Gas Plans',
    body: 'Clean, reliable gas heating. Variable or fixed rates — choose what suits your budget.',
    heroClass: 'hero-gradient-gas',
  },
  Solar: {
    icon: '☀️',
    headline: 'Solar Panels for Your Home',
    body: 'Generate your own electricity. Qualify for Belgian prosumer tariffs and reduce your net bill by up to 70%.',
    heroClass: 'hero-gradient-solar',
  },
  'Home Battery': {
    icon: '🔋',
    headline: 'Home Battery Storage',
    body: 'Store the energy you generate and use it when you need it — day or night.',
    heroClass: 'hero-gradient-battery',
  },
  'EV Charging': {
    icon: '⚡',
    headline: 'Home EV Charging',
    body: 'Smart wallboxes with solar-aware charging. Charge overnight at the cheapest tariff automatically.',
    heroClass: 'hero-gradient-battery',
  },
  Electricity: {
    icon: '💡',
    headline: 'Electricity Plans',
    body: 'Green electricity for every Belgian home. Variable, fixed, and dynamic tariffs available.',
    heroClass: 'hero-gradient-default',
  },
}

interface Props {
  category: ProductCategory
}

export function ProductPage({ category }: Props) {
  const { trackPageView } = useDemo()
  const meta = CATEGORY_META[category]
  const products = PRODUCTS_BY_CATEGORY(category)

  useEffect(() => {
    trackPageView(category)
  }, [category, trackPageView])

  return (
    <main>
      {/* Category hero */}
      <section className={`${meta.heroClass} text-white py-16 px-4`}>
        <div className="max-w-4xl mx-auto">
          <div className="text-4xl mb-4">{meta.icon}</div>
          <h1 className="text-4xl font-bold mb-3">{meta.headline}</h1>
          <p className="text-lg opacity-90 max-w-xl">{meta.body}</p>
        </div>
      </section>

      {/* Products */}
      <section className="py-14 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((p) => (
              <ProductCard key={p.sku} product={p} />
            ))}
          </div>
          {products.length === 0 && (
            <p className="text-muted text-center py-12">No products in this category yet.</p>
          )}
        </div>
      </section>

      {/* SP intent note */}
      <div className="fixed bottom-4 left-4 bg-ink/80 text-white text-xs px-3 py-2 rounded-full backdrop-blur-sm">
        SP intent tracking: <strong>{category}</strong> ↑
      </div>
    </main>
  )
}
