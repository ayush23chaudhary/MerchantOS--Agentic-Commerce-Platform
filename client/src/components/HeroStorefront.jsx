import { ArrowUpRight, Search, Loader2, X as XIcon, SlidersHorizontal } from 'lucide-react';
import { Activity, ShieldCheck, ShieldAlert, Zap, ShoppingBag, ChevronDown, Shield, Terminal, TrendingUp } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';

// ---------------------------------------------------------------------------
// Category metadata
// ---------------------------------------------------------------------------
const CATEGORY_META = {
  'beauty':              { label: 'Beauty' },
  'fragrances':          { label: 'Fragrances' },
  'furniture':           { label: 'Furniture' },
  'groceries':           { label: 'Groceries' },
  'home-decoration':     { label: 'Home Décor' },
  'kitchen-accessories': { label: 'Kitchen' },
  'laptops':             { label: 'Laptops' },
  'mens-shirts':         { label: "Men's Shirts" },
  'mens-shoes':          { label: "Men's Shoes" },
  'mens-watches':        { label: "Men's Watches" },
  'mobile-accessories':  { label: 'Mobile Acc.' },
  'motorcycle':          { label: 'Motorcycle' },
  'skin-care':           { label: 'Skin Care' },
  'smartphones':         { label: 'Smartphones' },
  'sports-accessories':  { label: 'Sports' },
  'sunglasses':          { label: 'Sunglasses' },
  'tablets':             { label: 'Tablets' },
  'tops':                { label: 'Tops' },
  'vehicle':             { label: 'Vehicle' },
  'womens-bags':         { label: "Women's Bags" },
  'womens-dresses':      { label: "Women's Dresses" },
  'womens-jewellery':    { label: 'Jewellery' },
  'womens-shoes':        { label: "Women's Shoes" },
  'womens-watches':      { label: "Women's Watches" },
};

const prettifySlug = (slug) =>
  slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const extractOrderId = (errorReason) => {
  if (!errorReason) return null;
  const match = errorReason.match(/Order Created: (order_\S+)/);
  return match ? match[1] : null;
};

const formatTime = (ts) =>
  new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

// ---------------------------------------------------------------------------
// AuditLogCard
// ---------------------------------------------------------------------------
const AuditLogCard = ({ log }) => {
  const approved = log.validation_status === 'APPROVED';
  const orderId = approved ? extractOrderId(log.error_reason) : null;

  const policyBadge = {
    PASS:               { text: 'PASS',              cls: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/15' },
    MANDATE_VIOLATION:  { text: 'MANDATE VIOLATION', cls: 'text-rose-400 bg-rose-500/10 border-rose-500/15' },
    STOCK_VIOLATION:    { text: 'STOCK VIOLATION',   cls: 'text-amber-400 bg-amber-500/10 border-amber-500/15' },
  };
  const badge = log.policy_result ? policyBadge[log.policy_result] || { text: log.policy_result, cls: 'text-white/40 bg-white/5 border-white/10' } : null;

  return (
    <div className={`rounded-xl border p-4 transition-all ${approved
        ? 'bg-emerald-950/20 border-emerald-900/30'
        : 'bg-rose-950/20 border-rose-900/30'
      }`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {approved
            ? <ShieldCheck size={14} className="text-emerald-400" />
            : <ShieldAlert size={14} className="text-rose-400" />
          }
          <span className={`text-[10px] font-bold tracking-widest uppercase ${approved ? 'text-emerald-400' : 'text-rose-400'}`}>
            {log.validation_status}
          </span>
          {badge && (
            <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${badge.cls}`}>
              {badge.text}
            </span>
          )}
        </div>
        <span className="text-[10px] text-white/25 font-mono">{formatTime(log.timestamp)}</span>
      </div>

      {log.cart_id && (
        <div className="mb-3 flex items-center gap-2 bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-2">
          <ShoppingBag size={11} className="text-white/30 flex-shrink-0" />
          <span className="text-[10px] uppercase tracking-widest text-white/25 font-semibold">Cart</span>
          <span className="text-[11px] font-mono text-white/40 truncate">{log.cart_id}</span>
        </div>
      )}

      {approved && orderId && (
        <div className="mb-3 flex flex-col gap-2">
          <div className="flex items-center gap-2 bg-emerald-900/15 border border-emerald-800/20 rounded-lg px-3 py-2">
            <Zap size={11} className="text-emerald-400 flex-shrink-0" />
            <span className="text-[11px] font-mono text-emerald-300 break-all">{orderId}</span>
          </div>
          {log.idempotency_key && (
            <div className="flex items-center gap-2 bg-white/[0.02] border border-white/[0.04] rounded-lg px-3 py-2">
              <span className="text-[10px] uppercase tracking-widest text-white/25 font-semibold flex-shrink-0">Idempotency</span>
              <span className="text-[10px] font-mono text-white/30 truncate">{log.idempotency_key}</span>
            </div>
          )}
        </div>
      )}

      {!approved && log.error_reason && (
        <div className="mb-3 bg-rose-900/15 border border-rose-800/20 rounded-lg px-3 py-2">
          <p className="text-xs text-rose-300/80 leading-relaxed">{log.error_reason}</p>
        </div>
      )}

      <div className="mt-1">
        <p className="text-[9px] uppercase tracking-widest text-white/20 mb-1.5 font-semibold">Intent Payload</p>
        <pre className="bg-[#0a0c14] border border-white/[0.04] rounded-lg p-3 text-[10px] text-white/30 overflow-x-auto leading-relaxed font-mono">
          {JSON.stringify(log.agent_intent_json, null, 2)}
        </pre>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// StorefrontProductCard
// ---------------------------------------------------------------------------
const StorefrontProductCard = ({ product, onAddToCart, onViewClick }) => {
  const isOutOfStock = product.stock <= 0;
  const price = Number(product.price);

  return (
    <div 
      className="group bg-[#131b2f] border border-indigo-500/10 rounded-2xl overflow-hidden flex flex-col hover:border-indigo-500/30 transition-all duration-300 cursor-pointer shadow-lg shadow-black/20"
      onClick={() => onViewClick(product)}
    >
      {/* Image */}
      <div className="aspect-square bg-[#0a0c14] relative overflow-hidden">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className={`w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 ${isOutOfStock ? 'opacity-30 grayscale' : ''}`}
            onError={(e) => {
              e.target.style.display = 'none';
              if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
            }}
          />
        ) : null}
        <div
          className="absolute inset-0 flex items-center justify-center text-white/10 text-4xl"
          style={{ display: product.image_url ? 'none' : 'flex' }}
        >
          ⬡
        </div>

        {isOutOfStock && (
          <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
            <span className="text-[10px] font-semibold text-white/40 uppercase tracking-widest">
              Sold Out
            </span>
          </div>
        )}

        {/* Quick add overlay */}
        {!isOutOfStock && (
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-4">
            <button
              onClick={(e) => { e.stopPropagation(); onAddToCart(product); }}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-xs font-bold rounded-full shadow-xl shadow-indigo-900/40 hover:bg-indigo-500 active:scale-95 transition-all"
            >
              <ShoppingBag size={13} />
              Add to Cart
            </button>
          </div>
        )}
      </div>

      {/* Details */}
      <div className="p-4 flex flex-col flex-1 gap-1.5">
        {product.brand && (
          <p className="text-[10px] uppercase tracking-widest text-white/25 font-semibold">{product.brand}</p>
        )}
        <h3 className="text-sm font-medium text-white/80 leading-snug line-clamp-2 flex-1 group-hover:text-white transition-colors">
          {product.name}
        </h3>
        <div className="flex items-end justify-between mt-1">
          <p className="text-lg font-bold text-white tracking-tight">
            ₹{price.toLocaleString('en-IN')}
          </p>
          {product.rating && (
            <span className="text-[11px] text-white/30 font-medium">
              ★ {Number(product.rating).toFixed(1)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// HeroStorefront
// ---------------------------------------------------------------------------
export default function HeroStorefront({ onCategoryClick, onOpenChat, auditLogs, onAddToCart, onViewProduct }) {
  const [showAudit, setShowAudit] = useState(false);
  const [activeCategory, setActiveCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const res = await axios.get('/api/categories');
        setCategories(res.data);
      } catch {
        setCategories([]);
      }
    })();
  }, []);

  const fetchProducts = useCallback(async (query = '', category = null) => {
    setIsLoadingProducts(true);
    try {
      const params = new URLSearchParams();
      if (query) params.set('q', query);
      if (category) params.set('category', category);
      const res = await axios.get(`/api/catalog?${params.toString()}`);
      setProducts(res.data);
    } catch {
      setProducts([]);
    } finally {
      setIsLoadingProducts(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleCategoryClick = (catName) => {
    if (activeCategory === catName) {
      setActiveCategory(null);
      fetchProducts(searchQuery);
    } else {
      setActiveCategory(catName);
      fetchProducts(searchQuery, catName);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchProducts(searchQuery, activeCategory);
  };

  const clearFilters = () => {
    setActiveCategory(null);
    setSearchQuery('');
    fetchProducts();
  };

  return (
    <div className="pt-16 min-h-screen bg-transparent">
      {/* Hero Banner — split layout with feature cards */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-indigo-900/30 via-transparent to-transparent opacity-70" />
        <div className="absolute top-1/2 right-0 w-96 h-96 bg-violet-600/10 rounded-full blur-[120px] -translate-y-1/2" />
        <div className="relative max-w-6xl mx-auto px-6 py-20 md:py-28">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left — Headline */}
            <div>
              <p className="text-[11px] font-semibold tracking-[0.25em] uppercase text-indigo-400/60 mb-6">
                Agentic Financial Infrastructure
              </p>
              <h1 className="text-4xl md:text-[3.5rem] font-extrabold text-white leading-[1.1] tracking-tight mb-6">
                Shop with
                <br />
                <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">intelligence.</span>
              </h1>
              <p className="text-base text-white/40 max-w-md mb-10 leading-relaxed">
                Ask our AI to find exactly what you need, or browse our curated catalog below. Every transaction is policy-checked and secured by Razorpay.
              </p>
              <button
                onClick={onOpenChat}
                className="inline-flex items-center gap-2 bg-indigo-600 text-white font-bold text-sm px-7 py-3.5 rounded-full hover:bg-indigo-500 transition-all duration-200 active:scale-95 shadow-xl shadow-indigo-900/40"
              >
                Start a conversation
                <ArrowUpRight size={16} />
              </button>
            </div>

            {/* Right — Bento Feature Cards */}
            <motion.div
              className="hidden lg:flex flex-col gap-4"
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
            >
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="mr-8 bg-white/[0.04] backdrop-blur-xl border border-white/[0.08] rounded-2xl p-6 shadow-2xl shadow-black/20 hover:bg-white/[0.07] hover:border-indigo-500/30 transition-all duration-300 cursor-default group"
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center flex-shrink-0 group-hover:bg-indigo-500/20 transition-colors">
                    <Shield size={18} className="text-indigo-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white mb-1.5">Deterministic Circuit Breaker</h3>
                    <p className="text-xs text-white/30 leading-relaxed">AI intent is strictly bound by PostgreSQL state and hard-coded user mandates. No hallucinated checkouts.</p>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="ml-8 bg-white/[0.04] backdrop-blur-xl border border-white/[0.08] rounded-2xl p-6 shadow-2xl shadow-black/20 hover:bg-white/[0.07] hover:border-violet-500/30 transition-all duration-300 cursor-default group"
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center flex-shrink-0 group-hover:bg-violet-500/20 transition-colors">
                    <Terminal size={18} className="text-violet-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white mb-1.5">Headless A2A Commerce</h3>
                    <p className="text-xs text-white/30 leading-relaxed">Exposed Agent Manifest allows external AI assistants to negotiate and purchase via our 2-step JSON API.</p>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.5 }}
                className="mr-8 bg-white/[0.04] backdrop-blur-xl border border-white/[0.08] rounded-2xl p-6 shadow-2xl shadow-black/20 hover:bg-white/[0.07] hover:border-emerald-500/30 transition-all duration-300 cursor-default group"
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0 group-hover:bg-emerald-500/20 transition-colors">
                    <TrendingUp size={18} className="text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white mb-1.5">B2B AI Revenue Recovery</h3>
                    <p className="text-xs text-white/30 leading-relaxed">MerchantOS actively monitors mandate violations and abandoned carts, generating targeted SMS recovery campaigns.</p>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Catalog Section */}
      <section className="max-w-6xl mx-auto px-6 pb-8">
        {/* Search + Filter row */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-8">
          <form onSubmit={handleSearch} className="flex-1">
            <div className="flex items-center gap-2 bg-[#131b2f] border border-indigo-500/10 rounded-xl px-4 py-3 focus-within:border-indigo-500/40 focus-within:bg-[#1a233a] transition-all shadow-inner">
              <Search size={16} className="text-indigo-200/50 flex-shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products..."
                className="flex-1 bg-transparent text-sm text-white/80 placeholder-white/20 outline-none"
              />
              {(searchQuery || activeCategory) && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="text-white/20 hover:text-white/50 transition-colors"
                >
                  <XIcon size={14} />
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Category pills — clean, minimal */}
        <div className="flex flex-wrap gap-2 mb-8">
          {categories.map((slug) => {
            const meta = CATEGORY_META[slug];
            const label = meta?.label || prettifySlug(slug);
            const isActive = activeCategory === slug;
            return (
              <button
                key={slug}
                onClick={() => handleCategoryClick(slug)}
                className={`px-3.5 py-2 rounded-lg text-xs font-medium transition-all duration-200 active:scale-95 border ${
                  isActive
                    ? 'bg-indigo-600 text-white border-indigo-500 font-bold shadow-md shadow-indigo-900/40'
                    : 'bg-indigo-500/5 border-indigo-500/10 text-indigo-200/50 hover:text-indigo-200 hover:border-indigo-500/30'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Active filter indicator */}
        {(activeCategory || searchQuery) && (
          <div className="flex items-center gap-2 text-[11px] text-white/25 mb-6">
            <span>Showing:</span>
            {activeCategory && (
              <span className="bg-white/[0.06] border border-white/[0.08] text-white/50 px-2.5 py-0.5 rounded font-medium">
                {CATEGORY_META[activeCategory]?.label || prettifySlug(activeCategory)}
              </span>
            )}
            {searchQuery && (
              <span className="bg-white/[0.06] border border-white/[0.08] text-white/50 px-2.5 py-0.5 rounded font-medium">
                "{searchQuery}"
              </span>
            )}
            <button onClick={clearFilters} className="text-white/20 hover:text-white/40 underline underline-offset-2 ml-1 transition-colors">
              Clear
            </button>
          </div>
        )}
      </section>

      {/* Product Grid */}
      <section className="max-w-6xl mx-auto px-6 pb-20">
        {isLoadingProducts ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <Loader2 size={24} className="text-white/20 animate-spin" />
            <p className="text-sm text-white/20">Loading catalog…</p>
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <p className="text-base text-white/30 font-medium">No products found</p>
            <p className="text-sm text-white/15">Try adjusting your search or filters</p>
            <button
              onClick={clearFilters}
              className="mt-3 text-sm text-white/40 hover:text-white/60 font-medium underline underline-offset-4 transition-colors"
            >
              Show all products
            </button>
          </div>
        ) : (
          <>
            <p className="text-[11px] text-white/15 mb-5 uppercase tracking-widest font-medium">{products.length} product{products.length !== 1 ? 's' : ''}</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {products.map((product) => (
                <StorefrontProductCard
                  key={product.id}
                  product={product}
                  onAddToCart={onAddToCart}
                  onViewClick={onViewProduct}
                />
              ))}
            </div>
          </>
        )}
      </section>

      {/* Audit Log Strip */}
      <section className="max-w-5xl mx-auto px-6 pb-16">
        <button
          onClick={() => setShowAudit(!showAudit)}
          className="w-full flex items-center justify-between px-5 py-3.5 bg-white/[0.02] border border-white/[0.04] rounded-xl hover:border-white/[0.08] transition-all"
        >
          <div className="flex items-center gap-2.5">
            <Activity size={14} className="text-white/30" />
            <span className="text-sm font-medium text-white/50">Audit Inspector</span>
            {auditLogs.length > 0 && (
              <span className="bg-white/[0.06] text-white/40 text-[10px] font-bold px-2 py-0.5 rounded">
                {auditLogs.length}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-emerald-400/60 text-[10px] font-semibold uppercase tracking-widest">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400/60 animate-pulse" />
              LIVE
            </span>
            <ChevronDown
              className={`w-4 h-4 text-white/20 transition-transform duration-200 ${showAudit ? 'rotate-180' : ''}`}
            />
          </div>
        </button>

        {showAudit && (
          <div className="mt-3 bg-[#0a0c14] border border-white/[0.04] rounded-xl p-4 max-h-96 overflow-y-auto custom-scrollbar space-y-3">
            {auditLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-white/15 gap-3 py-10">
                <Activity size={28} className="opacity-40" />
                <p className="text-sm">Waiting for agent activity…</p>
              </div>
            ) : (
              auditLogs.map((log) => <AuditLogCard key={log.id} log={log} />)
            )}
          </div>
        )}
      </section>
    </div>
  );
}
