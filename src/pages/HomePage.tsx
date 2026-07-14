import { Link } from 'react-router-dom'
import { HeroBanner } from '../components/HeroBanner'
import { ProductCard } from '../components/ProductCard'
import { PRODUCTS } from '../data/products'

const FEATURED = PRODUCTS.filter((p) =>
  ['LMN-01005', 'LMN-01009', 'LMN-01011', 'LMN-01013'].includes(p.sku),
)

export function HomePage() {
  return (
    <main>
      <HeroBanner />

      {/* Value props */}
      <section className="bg-bg-alt py-12 px-4">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
          {[
            { icon: '🌱', title: 'Green Energy', body: '100% renewable electricity available for every Luminus plan' },
            { icon: '💡', title: 'Smart Tariffs', body: 'Dynamic pricing that rewards you for shifting usage to off-peak hours' },
            { icon: '🔧', title: 'All-in-One', body: 'Electricity, gas, solar, and EV charging from one Belgian provider' },
          ].map((v) => (
            <div key={v.title} className="bg-white rounded-xl p-6 shadow-sm">
              <div className="text-3xl mb-3">{v.icon}</div>
              <h3 className="font-semibold text-ink mb-2">{v.title}</h3>
              <p className="text-sm text-muted">{v.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Featured products */}
      <section className="py-14 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold text-ink">Our Solutions</h2>
            <Link to="/gas" className="text-sm text-primary hover:text-primary-light">
              View all →
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {FEATURED.map((p) => (
              <ProductCard key={p.sku} product={p} />
            ))}
          </div>
        </div>
      </section>

      {/* CTA strip */}
      <section className="bg-primary text-white py-12 px-4 text-center">
        <h2 className="text-2xl font-bold mb-3">Ready to save on energy?</h2>
        <p className="text-white/80 mb-6 max-w-md mx-auto">
          Get a personalised offer in 2 minutes. No commitment required.
        </p>
        <button className="bg-accent hover:bg-accent-dark text-white font-semibold px-8 py-3 rounded-lg transition-colors">
          Get My Quote
        </button>
      </section>
    </main>
  )
}
