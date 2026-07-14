import type { Product } from '../data/products'

interface Props {
  product: Product
}

export function ProductCard({ product }: Props) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow p-6 flex flex-col gap-3">
      <div className="text-3xl">{product.icon}</div>
      <div>
        <h3 className="font-semibold text-ink">{product.name}</h3>
        <p className="text-sm text-muted mt-1">{product.description}</p>
      </div>
      <div className="mt-auto pt-3 flex items-center justify-between border-t border-gray-50">
        <span className="font-semibold text-primary">{product.priceLabel}</span>
        <button className="text-sm bg-accent hover:bg-accent-dark text-white px-4 py-1.5 rounded-lg transition-colors">
          Learn more
        </button>
      </div>
    </div>
  )
}
