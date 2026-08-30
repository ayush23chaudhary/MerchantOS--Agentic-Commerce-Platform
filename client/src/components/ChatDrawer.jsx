import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Send, Bot, User, X, Sparkles, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import AgentProductCard from './AgentProductCard';

// ---------------------------------------------------------------------------
// TypingIndicator — polished bouncing dots
// ---------------------------------------------------------------------------
const TypingIndicator = () => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    className="flex items-start gap-3 px-5 py-2"
  >
    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white/5 backdrop-blur-md border border-white/10 flex items-center justify-center">
      <Bot size={14} className="text-cyan-400" />
    </div>
    <div className="bg-white/[0.06] backdrop-blur-md border border-white/[0.08] rounded-2xl rounded-tl-sm px-5 py-3.5 flex items-center gap-2">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="w-2 h-2 rounded-full bg-cyan-400/70"
          animate={{ y: [0, -6, 0], opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15, ease: 'easeInOut' }}
        />
      ))}
    </div>
  </motion.div>
);

// ---------------------------------------------------------------------------
// Typewriter — character-by-character reveal for AI text
// ---------------------------------------------------------------------------
const Typewriter = ({ text, speed = 12 }) => {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    setDisplayed('');
    setDone(false);
    if (!text) return;

    let i = 0;
    const interval = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(interval);
        setDone(true);
      }
    }, speed);

    return () => clearInterval(interval);
  }, [text, speed]);

  return (
    <span>
      {displayed}
      {!done && <span className="inline-block w-0.5 h-4 bg-cyan-400/70 animate-pulse ml-0.5 align-middle" />}
    </span>
  );
};

// ---------------------------------------------------------------------------
// AgentProductCarousel — horizontal swipeable
// ---------------------------------------------------------------------------
const AgentProductCarousel = ({ textReply, products, onAddToCart }) => (
  <div className="flex flex-col gap-3">
    <p className="text-sm text-slate-100 leading-relaxed">{textReply}</p>
    {products && products.length > 0 && (
      <div className="flex overflow-x-auto gap-3 pb-2 -mx-1 px-1 snap-x snap-mandatory scrollbar-hide">
        {products.map((p) => (
          <div key={p.id} className="snap-center flex-shrink-0">
            <AgentProductCard product={p} onAddToCart={onAddToCart} />
          </div>
        ))}
      </div>
    )}
  </div>
);

// ---------------------------------------------------------------------------
// CategoryListUI
// ---------------------------------------------------------------------------
const CategoryListUI = ({ textReply, categories, onCategoryClick }) => (
  <div className="flex flex-col gap-3">
    <p className="text-sm text-slate-100 leading-relaxed">{textReply}</p>
    {categories && categories.length > 0 && (
      <div className="flex flex-col gap-2 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
        {categories.map((cat, i) => (
          <button
            key={i}
            onClick={() => onCategoryClick(cat)}
            className="px-4 py-2.5 bg-white/[0.04] backdrop-blur-sm border border-white/[0.08] hover:border-cyan-500/40 hover:bg-cyan-500/[0.06] rounded-xl text-sm font-semibold text-slate-200 transition-all duration-200 capitalize text-left w-full"
          >
            {cat}
          </button>
        ))}
      </div>
    )}
  </div>
);

// ---------------------------------------------------------------------------
// UpsellPromptUI
// ---------------------------------------------------------------------------
const UpsellPromptUI = ({ textReply, upsellData, onSuggestClick }) => {
  if (!upsellData) return <p className="text-sm text-slate-100">{textReply}</p>;
  const { primary_item, accessory_item, combined_price } = upsellData;
  const fmtPrice = (p) => `₹${Number(p).toLocaleString('en-IN')}`;

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-slate-100 leading-relaxed">{textReply}</p>
      {accessory_item && (
        <div className="flex items-center gap-3 bg-white/[0.04] border border-white/[0.08] rounded-xl p-3">
          {accessory_item.image_url && (
            <img src={accessory_item.image_url} alt={accessory_item.name} className="w-14 h-14 rounded-lg object-contain bg-slate-950 p-1 shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-200 truncate">{accessory_item.name}</p>
            <p className="text-sm font-bold text-emerald-400">{fmtPrice(accessory_item.price)}</p>
          </div>
          <span className="text-[10px] uppercase tracking-widest text-amber-400 font-bold bg-amber-400/10 px-2 py-1 rounded border border-amber-500/20 shrink-0">Recommended</span>
        </div>
      )}
      <div className="flex flex-col gap-2">
        <button
          onClick={() => onSuggestClick(`Buy both ${primary_item.name} and ${accessory_item.name}`)}
          className="w-full py-3 rounded-full text-sm font-bold bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 active:scale-[0.98] text-white shadow-lg shadow-cyan-900/30 transition-all duration-200 flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          Buy Both for {fmtPrice(combined_price)}
        </button>
        <button
          onClick={() => onSuggestClick(`Buy just the ${primary_item.name}`)}
          className="w-full py-2.5 rounded-full text-sm font-semibold bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.1] text-slate-300 transition-all duration-200 active:scale-[0.98]"
        >
          Just the {primary_item.name} — {fmtPrice(primary_item.price)}
        </button>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// CartSummaryUI
// ---------------------------------------------------------------------------
const CartSummaryUI = ({ cartData, cartId, userMandate, onSuggestClick, onCheckoutCart, onRemoveFromCart, onAddToCart }) => {
  const [upsellItem, setUpsellItem] = useState(null);
  const [isUpsellLoading, setIsUpsellLoading] = useState(false);
  const [isAddingUpsell, setIsAddingUpsell] = useState(false);

  useEffect(() => {
    const fetchUpsell = async () => {
      if (!cartId) return;
      setIsUpsellLoading(true);
      try {
        const { data } = await axios.get(`/api/cart/upsell?cart_id=${cartId}`);
        if (data.recommended_product) {
          setUpsellItem(data);
        }
      } catch (err) {
        console.error('Failed to fetch upsell', err);
      } finally {
        setIsUpsellLoading(false);
      }
    };
    fetchUpsell();
  }, [cartId, cartData]); // Re-fetch if cartData changes length or cartId changes

  const handleAddUpsell = async () => {
    if (!upsellItem?.recommended_product) return;
    setIsAddingUpsell(true);
    if (onAddToCart) {
      await onAddToCart(upsellItem.recommended_product);
    }
    setUpsellItem(null);
    setIsAddingUpsell(false);
  };

  if (!cartData || cartData.length === 0) {
    return <p className="text-sm text-slate-200">Your cart is empty.</p>;
  }

  const subtotal = cartData.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const percentage = Math.min((subtotal / userMandate) * 100, 100);
  const isOverBudget = subtotal > userMandate;
  const fmtPrice = (p) => `₹${Number(p).toLocaleString('en-IN')}`;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
        {cartData.map((item, idx) => (
          <div key={idx} className="flex items-center gap-3 bg-white/[0.04] border border-white/[0.08] rounded-xl p-3">
            {item.image_url ? (
              <img src={item.image_url} alt={item.name} className="w-12 h-12 rounded-md object-contain bg-slate-950 p-1 shrink-0" />
            ) : (
              <div className="w-12 h-12 rounded-md bg-slate-800 flex items-center justify-center shrink-0">🛍️</div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-200 truncate">{item.name}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-slate-400">Qty: {item.quantity}</span>
                <span className="text-xs text-slate-500">•</span>
                <span className="text-sm font-bold text-emerald-400">{fmtPrice(item.price * item.quantity)}</span>
              </div>
            </div>
            <button
              onClick={() => onRemoveFromCart && onRemoveFromCart(item.product_id)}
              className="w-7 h-7 flex-shrink-0 flex items-center justify-center rounded bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-colors"
              title="Remove item"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>

      {/* Upsell Engine */}
      {isUpsellLoading ? (
        <div className="p-4 border border-indigo-500/10 bg-[#131b2f] rounded-xl flex items-center gap-3">
          <Sparkles size={14} className="text-white/20 animate-pulse" />
          <p className="text-xs text-white/25 font-medium animate-pulse">Finding recommendations...</p>
        </div>
      ) : upsellItem?.recommended_product ? (
        <div className="p-4 border border-indigo-500/20 bg-[#131b2f] rounded-xl relative overflow-hidden shadow-lg shadow-black/10">
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent"></div>
          
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={12} className="text-white/30" />
            <p className="text-[10px] font-semibold tracking-widest uppercase text-white/30">Suggested for you</p>
          </div>
          
          <p className="text-[11px] text-white/20 mb-3 leading-relaxed">"{upsellItem.reasoning}"</p>
          
          <div className="flex items-center gap-3 bg-white/[0.03] p-2.5 rounded-lg border border-white/[0.04]">
            <div className="w-11 h-11 bg-white rounded-lg flex items-center justify-center shrink-0 p-1">
              <img src={upsellItem.recommended_product.image_url} className="max-w-full max-h-full object-contain mix-blend-multiply" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-white/70 line-clamp-1">{upsellItem.recommended_product.name}</p>
              <p className="text-xs font-bold text-white mt-0.5">₹{Number(upsellItem.recommended_product.price).toLocaleString('en-IN')}</p>
            </div>
            <button 
              onClick={handleAddUpsell}
              disabled={isAddingUpsell}
              className="px-3 py-1.5 bg-indigo-600 text-white text-[11px] font-bold rounded-lg transition-all shrink-0 disabled:opacity-50 hover:bg-indigo-500 active:scale-95 shadow-md shadow-indigo-900/40"
            >
              {isAddingUpsell ? <Loader2 size={12} className="animate-spin" /> : 'Add'}
            </button>
          </div>
        </div>
      ) : null}

      <div className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.08]">
        <div className="flex justify-between items-end mb-2">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Subtotal</span>
          <span className="text-lg font-bold text-white">{fmtPrice(subtotal)}</span>
        </div>
        <div className="flex flex-col gap-1.5 mt-3">
          <div className="flex justify-between text-[10px] font-medium">
            <span className={isOverBudget ? 'text-rose-400' : 'text-slate-400'}>
              {isOverBudget ? 'Budget Exceeded' : 'Budget Used'}
            </span>
            <span className="text-slate-400">Max: {fmtPrice(userMandate)}</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-500 ${isOverBudget ? 'bg-rose-500' : 'bg-gradient-to-r from-blue-500 to-cyan-400'}`}
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => onSuggestClick('Show me more products')}
          className="flex-1 py-2.5 rounded-full text-xs font-semibold bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.1] text-slate-300 transition-all active:scale-95"
        >
          Keep Shopping
        </button>
        <button
          onClick={onCheckoutCart}
          className="flex-1 py-2.5 rounded-full text-xs font-bold bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white shadow-lg shadow-cyan-900/30 transition-all active:scale-95"
        >
          Checkout Now
        </button>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// ChatBubble — Framer Motion animated
// ---------------------------------------------------------------------------
const ChatBubble = ({ msg, isLatest, cartId, onSuggestClick, onAddToCart, onRemoveFromCart, onCheckoutCart, userMandate }) => {
  const isUser = msg.role === 'user';
  const isCarousel = !isUser && msg.ui_component === 'ProductCarousel' && msg.products?.length > 0;
  const isCategoryList = !isUser && msg.ui_component === 'CategoryList' && msg.categories?.length > 0;
  const isUpsell = !isUser && msg.ui_component === 'UpsellPrompt' && msg.upsell_data;
  const isCartSummary = !isUser && msg.ui_component === 'CartSummary';
  const hasSuggestions = isLatest && !isUser && msg.suggested_replies?.length > 0;
  const isWideComponent = isCarousel || isUpsell || isCartSummary;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className={`flex flex-col gap-2 px-4 py-2 ${isUser ? 'items-end' : 'items-start'}`}
    >
      <div className={`flex items-end gap-2.5 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        {/* Avatar */}
        <div className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center border backdrop-blur-sm ${
          isUser ? 'bg-blue-500/15 border-blue-400/20' : 'bg-white/[0.06] border-white/[0.1]'
        }`}>
          {isUser
            ? <User size={13} className="text-blue-400" />
            : <Bot size={13} className="text-cyan-400" />
          }
        </div>
        {/* Bubble */}
        <div className={`rounded-2xl px-5 py-3.5 text-sm leading-relaxed ${
          isWideComponent
            ? 'bg-white/[0.04] backdrop-blur-md border border-white/[0.08] text-slate-100 rounded-tl-sm max-w-[95%] w-full sm:w-[22rem]'
            : isUser
              ? 'max-w-[80%] bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-tr-sm shadow-lg shadow-blue-900/25 whitespace-pre-wrap'
              : 'max-w-[80%] bg-white/[0.06] backdrop-blur-md border border-white/[0.08] text-slate-100 rounded-tl-sm whitespace-pre-wrap'
        }`}>
          {isCarousel
            ? <AgentProductCarousel textReply={msg.text_reply || msg.text} products={msg.products} onAddToCart={onAddToCart} />
            : isUpsell
            ? <UpsellPromptUI textReply={msg.text_reply || msg.text} upsellData={msg.upsell_data} onSuggestClick={onSuggestClick} />
            : isCategoryList
            ? <CategoryListUI textReply={msg.text_reply || msg.text} categories={msg.categories} onCategoryClick={(cat) => onSuggestClick(`Show me ${cat} products`)} />
            : isCartSummary
            ? <CartSummaryUI cartData={msg.cart_data || []} cartId={cartId} userMandate={userMandate} onSuggestClick={onSuggestClick} onCheckoutCart={onCheckoutCart} onRemoveFromCart={onRemoveFromCart} onAddToCart={onAddToCart} />
            : isUser
            ? (msg.text_reply || msg.text)
            : isLatest
            ? <Typewriter text={msg.text_reply || msg.text} speed={12} />
            : (msg.text_reply || msg.text)
          }
        </div>
      </div>

      {/* Suggested Replies */}
      {hasSuggestions && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.3 }}
          className="flex flex-wrap gap-2 mt-1 ml-10"
        >
          {msg.suggested_replies.map((reply, idx) => (
            <button
              key={idx}
              onClick={() => onSuggestClick(reply)}
              className="text-xs bg-white/[0.04] hover:bg-cyan-500/[0.1] border border-white/[0.1] hover:border-cyan-400/30 text-slate-300 hover:text-cyan-300 px-3.5 py-1.5 rounded-full transition-all duration-200 cursor-pointer active:scale-95"
            >
              {reply}
            </button>
          ))}
        </motion.div>
      )}
    </motion.div>
  );
};

// ---------------------------------------------------------------------------
// ChatDrawer
// ---------------------------------------------------------------------------
export default function ChatDrawer({
  isOpen,
  onClose,
  cartId,
  messages,
  input,
  setInput,
  isLoading,
  onSubmit,
  onSuggestClick,
  onAddToCart,
  onRemoveFromCart,
  onCheckoutCart,
  userMandate
}) {
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[3px] modal-backdrop-enter"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 h-full z-50 w-full sm:w-[28rem] flex flex-col bg-slate-950/95 backdrop-blur-xl border-l border-white/[0.06] shadow-2xl shadow-black/60 ${
          isOpen ? 'drawer-enter' : 'drawer-exit pointer-events-none'
        }`}
      >
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between px-5 py-4 bg-white/[0.02] border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-60" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500" />
            </span>
            <div>
              <h2 className="text-sm font-bold tracking-tight text-white flex items-center gap-1.5">
                <Sparkles size={14} className="text-cyan-400" />
                AI Shopping Assistant
              </h2>
              <p className="text-[10px] text-slate-500 -mt-0.5">Gemini · Razorpay Secured</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/[0.08] transition-all active:scale-90"
          >
            <X size={18} />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto bg-gradient-to-b from-slate-950 to-slate-900/50 py-4 space-y-1 custom-scrollbar">
          <AnimatePresence>
            {messages.map((msg, i) => (
              <ChatBubble
                key={i}
                msg={msg}
                isLatest={i === messages.length - 1}
                cartId={cartId}
                onSuggestClick={onSuggestClick}
                onAddToCart={onAddToCart}
                onRemoveFromCart={onRemoveFromCart}
                onCheckoutCart={onCheckoutCart}
                userMandate={userMandate}
              />
            ))}
          </AnimatePresence>
          {isLoading && <TypingIndicator />}
          <div ref={chatEndRef} />
        </div>

        {/* Input */}
        <div className="flex-shrink-0 bg-white/[0.02] border-t border-white/[0.06] px-4 py-4">
          <form onSubmit={onSubmit} className="flex items-center gap-2 bg-white/[0.05] border border-white/[0.08] rounded-xl px-4 py-3 focus-within:border-cyan-500/30 transition-colors">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isLoading}
              placeholder="Ask me to find products…"
              className="flex-1 bg-transparent text-sm text-slate-200 placeholder-slate-500 outline-none disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg transition-all active:scale-90"
            >
              <Send size={14} className="text-white" />
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
