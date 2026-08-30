import { ShoppingCart } from 'lucide-react';

const StarRating = ({ rating }) => {
  const stars = Math.round(rating || 0);
  return (
    <span className="flex gap-0.5">
      {[1,2,3,4,5].map(i => (
        <svg key={i} className={`w-3 h-3 ${i <= stars ? 'text-amber-400' : 'text-slate-700'}`} fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </span>
  );
};

export default function AgentProductCard({ product, onAddToCart }) {
  const isOutOfStock = product.stock <= 0;
  const price = Number(product.price);

  return (
    <div className="flex-shrink-0 w-[220px] bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl shadow-black/30 flex flex-col hover:border-cyan-500/40 hover:shadow-cyan-900/10 transition-all duration-300 group">
      {/* Image */}
      <div className="h-40 bg-slate-950 relative overflow-hidden">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 ${isOutOfStock ? 'opacity-40 grayscale' : ''}`}
            onError={(e) => {
              e.target.style.display = 'none';
              if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
            }}
          />
        ) : null}
        <div
          className="absolute inset-0 flex items-center justify-center text-slate-700 text-3xl"
          style={{ display: product.image_url ? 'none' : 'flex' }}
        >
          🛍️
        </div>
        {isOutOfStock && (
          <div className="absolute inset-0 bg-black/65 backdrop-blur-[1px] flex items-center justify-center">
            <span className="text-[10px] font-bold text-rose-400 uppercase tracking-widest border border-rose-500/40 px-2 py-1 rounded-full bg-rose-950/40">
              Out of Stock
            </span>
          </div>
        )}
        {product.rating && (
          <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/60 backdrop-blur-md rounded-full px-2 py-0.5">
            <svg className="w-3 h-3 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            <span className="text-[10px] font-bold text-white">{Number(product.rating).toFixed(1)}</span>
          </div>
        )}
      </div>

      {/* Details */}
      <div className="p-3.5 flex flex-col flex-1 gap-2">
        {product.brand && (
          <p className="text-[9px] uppercase tracking-widest text-cyan-400 font-bold">{product.brand}</p>
        )}
        <p className="text-xs font-semibold text-slate-200 leading-snug line-clamp-2 flex-1">{product.name}</p>
        <p className="text-lg font-extrabold text-emerald-400 tracking-tight">
          ₹{price.toLocaleString('en-IN')}
        </p>

        {/* Add to Cart button — high-visibility pill */}
        <button
          onClick={() => {
            if (!isOutOfStock) {
              onAddToCart(product);
            }
          }}
          disabled={isOutOfStock}
          className={`flex items-center justify-center gap-2 py-2.5 rounded-full text-xs font-bold transition-all duration-300 ${
            isOutOfStock
              ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
              : 'bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white shadow-lg shadow-cyan-900/20 active:scale-95 hover:shadow-cyan-600/30'
          }`}
        >
          <ShoppingCart size={13} />
          {isOutOfStock ? 'Unavailable' : 'Add to Cart'}
        </button>
      </div>
    </div>
  );
}
