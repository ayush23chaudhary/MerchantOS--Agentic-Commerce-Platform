import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { X, ShoppingBag, MessageSquareText } from 'lucide-react';

import Navbar from './components/Navbar';
import HeroStorefront from './components/HeroStorefront';
import MerchantDashboard from './components/MerchantDashboard';
import ChatDrawer from './components/ChatDrawer';
import SettingsModal from './components/SettingsModal';
import CartToast from './components/CartToast';
import CartDrawer from './components/CartDrawer';
import DeveloperPortal from './components/DeveloperPortal';

// ---------------------------------------------------------------------------
// Razorpay trigger
// ---------------------------------------------------------------------------
const triggerRazorpay = (orderId, cartId, idempotencyKey, showToast, setMessages, setIsChatOpen, onPaymentSuccess) => {
  if (!window.Razorpay) {
    alert('Razorpay SDK not loaded. Check your index.html script tag.');
    return;
  }
  const options = {
    key: 'rzp_test_TUFN8dAvXhaJw0',
    order_id: orderId,
    name: 'MerchantOS',
    description: 'Secure AI-Gated Transaction',
    theme: { color: '#ffffff', backdrop_color: '#06080f' },
    handler: (response) => {
      showToast('COMPLETED', `Payment Successful — ${response.razorpay_payment_id}`, cartId);
      axios.post('/api/webhooks/razorpay', { event: 'order.paid', payload: { order: { entity: { id: orderId } } } }).catch(()=>{});
      if (onPaymentSuccess) onPaymentSuccess();
    },
    modal: {
      ondismiss: () => {
        showToast('PAYMENT_FAILED', 'Payment cancelled or modal closed.', cartId);
        axios.post('/api/webhooks/razorpay', { event: 'payment.failed', payload: { payment: { entity: { order_id: orderId } } } }).catch(()=>{});
        
        setIsChatOpen(true);
        setMessages((prev) => [
          ...prev,
          {
            role: 'agent',
            text: `Your payment could not be completed. Your cart has been saved. Would you like to retry?`,
            ui_component: 'SimpleReply',
            products: [],
            suggested_replies: ['Retry Payment', 'View Cart', 'Cancel Order'],
          },
        ]);
      }
    }
  };
  const rzp = new window.Razorpay(options);
  rzp.open();
};

// ---------------------------------------------------------------------------
// ProductModal
// ---------------------------------------------------------------------------
const ProductModal = ({ product, onClose, onBuyClick, onAddToCart }) => {
  if (!product) return null;
  const isOutOfStock = product.stock <= 0;
  const price = Number(product.price);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 bg-[#0c1222]/80 backdrop-blur-sm modal-backdrop-enter">
      <div className="bg-[#131b2f] border border-indigo-500/10 w-full max-w-lg rounded-2xl shadow-2xl shadow-indigo-900/20 overflow-hidden flex flex-col relative max-h-[95vh] modal-enter">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center rounded-lg bg-black/40 text-white/40 hover:text-white hover:bg-black/60 transition-all"
        >
          <X size={16} />
        </button>

        {/* Image */}
        <div className="h-64 shrink-0 bg-[#0c1222] relative flex items-center justify-center">
          {product.image_url ? (
            <img src={product.image_url} alt={product.name} className={`max-h-full max-w-full object-contain ${isOutOfStock ? 'opacity-30 grayscale' : ''}`} />
          ) : (
            <span className="text-5xl text-white/10">⬡</span>
          )}
          {product.rating && (
            <div className="absolute bottom-4 right-4 text-[11px] text-white/40 font-medium bg-black/50 backdrop-blur-md rounded px-2.5 py-1">
              ★ {Number(product.rating).toFixed(1)}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-6 flex flex-col gap-4 overflow-y-auto custom-scrollbar">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              {product.brand && <span className="text-[10px] uppercase tracking-widest text-white/25 font-semibold">{product.brand}</span>}
              {product.brand && product.category && <span className="text-white/10 text-[10px]">·</span>}
              {product.category && <span className="text-[10px] uppercase tracking-widest text-white/25 font-semibold">{product.category}</span>}
            </div>
            <h2 className="text-lg font-bold text-white">{product.name}</h2>
            <p className="text-2xl font-bold text-white mt-2 tracking-tight">₹{price.toLocaleString('en-IN')}</p>
          </div>

          <div className="text-sm text-white/40 leading-relaxed bg-white/[0.02] p-4 rounded-xl border border-white/[0.04]">
            {product.description || "No description available."}
          </div>

          <div className="flex flex-col gap-2 text-[11px] text-white/30 bg-white/[0.01] p-3 rounded-lg border border-white/[0.03]">
            {product.warranty_information && (
              <div className="flex items-start gap-2">
                <span className="text-white/40 font-medium w-20 shrink-0">Warranty</span>
                <span>{product.warranty_information}</span>
              </div>
            )}
            {product.shipping_information && (
              <div className="flex items-start gap-2">
                <span className="text-white/40 font-medium w-20 shrink-0">Shipping</span>
                <span>{product.shipping_information}</span>
              </div>
            )}
          </div>

          {product.reviews && product.reviews.length > 0 && (
            <div className="flex flex-col gap-2 mt-1">
              <h3 className="text-[10px] font-semibold text-white/25 uppercase tracking-widest">Reviews</h3>
              <div className="flex flex-col gap-2 max-h-32 overflow-y-auto pr-2 custom-scrollbar">
                {product.reviews.map((r, idx) => (
                  <div key={idx} className="bg-white/[0.02] border border-white/[0.04] rounded-lg p-3">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-medium text-white/60">{r.reviewerName}</span>
                      <span className="text-[10px] text-white/25">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
                    </div>
                    <p className="text-[11px] text-white/25 italic line-clamp-2">"{r.comment}"</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 text-xs font-medium">
            {isOutOfStock ? (
              <span className="text-rose-400/70">Sold out</span>
            ) : (
              <span className="text-emerald-400/50">{product.stock} in stock</span>
            )}
          </div>

          <div className="flex gap-2 mt-2">
            <button
              onClick={() => {
                if (!isOutOfStock) {
                  onAddToCart(product);
                  onClose();
                }
              }}
              disabled={isOutOfStock}
              className={`flex-1 flex items-center justify-center gap-2 rounded-full py-3.5 text-sm font-bold transition-all duration-200 ${
                isOutOfStock
                  ? 'bg-white/[0.04] text-white/20 cursor-not-allowed'
                  : 'bg-indigo-600 text-white hover:bg-indigo-500 active:scale-95 shadow-xl shadow-indigo-900/40'
              }`}
            >
              <ShoppingBag size={15} />
              {isOutOfStock ? 'Unavailable' : 'Add to Cart'}
            </button>
            {!isOutOfStock && (
              <button
                onClick={() => {
                  onBuyClick(product);
                  onClose();
                }}
                className="flex items-center justify-center gap-2 rounded-full py-3.5 px-5 text-sm font-medium bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-white/50 hover:text-white/70 transition-all duration-200 active:scale-95"
              >
                <MessageSquareText size={14} />
                Ask AI
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// App — Layout Orchestrator
// ---------------------------------------------------------------------------
export default function App() {
  // ---- New state ----
  const [viewMode, setViewMode] = useState('shopper'); // 'shopper' | 'merchant'
  const [userMandate, setUserMandate] = useState(5000);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(true);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [cartItemCount, setCartItemCount] = useState(0);
  const [cartId, setCartId] = useState(() => localStorage.getItem('cartId') || null);
  
  // Use a ref for cartId to guarantee rock-solid payload injection in async callbacks
  const cartIdRef = useRef(cartId);
  useEffect(() => {
    cartIdRef.current = cartId;
    if (cartId) {
      localStorage.setItem('cartId', cartId);
    } else {
      localStorage.removeItem('cartId');
    }
  }, [cartId]);

  // ---- Existing state ----
  const [messages, setMessages] = useState([
    { role: 'agent', text: 'Hello! 👋 I\'m your AI Shopping Assistant, powered by Gemini and secured by Razorpay. Ask me to search for products or help you checkout safely.' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [auditLogs, setAuditLogs] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [toast, setToast] = useState(null);

  // ---- Toast helper ----
  const showToast = useCallback((status, message = null, cartId = null) => {
    setToast({ status, message, cartId, key: Date.now() });
  }, []);

  // ---- Poll audit logs ----
  const fetchLogs = useCallback(async () => {
    try {
      const res = await axios.get('/api/audit-logs');
      setAuditLogs(res.data);
    } catch {
      // silently fail — server may not be up yet
    }
  }, []);

  useEffect(() => {
    fetchLogs();
    const id = setInterval(fetchLogs, 2000);
    return () => clearInterval(id);
  }, [fetchLogs]);

  // ---- Send a text message to the AI ----
  const sendMessage = async (text) => {
    if (!text || isLoading) return;
    const historyToSend = [...messages, { role: 'user', text }];
    setMessages(historyToSend);
    setInput('');
    setIsLoading(true);
    console.log('Current Cart ID:', cartIdRef.current);
    try {
      const { data } = await axios.post('/api/chat', {
        message: text,
        history: historyToSend,
        user_mandate: userMandate,
        cart_id: cartIdRef.current,
      });
      
      if (data.new_cart_id && data.new_cart_id !== cartIdRef.current) {
        setCartId(data.new_cart_id);
      }

      setMessages((prev) => [...prev, {
        role: 'agent',
        text: data.text_reply || data.text || '',
        ui_component: data.ui_component,
        products: data.products || [],
        categories: data.categories || [],
        upsell_data: data.upsell_data || null,
        cart_data: data.cart_data || [],
        suggested_replies: data.suggested_replies || []
      }]);
      if (data.razorpay_order_id) {
        setTimeout(() => triggerRazorpay(data.razorpay_order_id, data.new_cart_id, null, showToast, setMessages, setIsChatOpen, () => {
          setCartId(null);
          setIsCartOpen(false);
        }), 300);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'agent', text: '⚠️ Sorry, I encountered an error. Please try again.', ui_component: 'SimpleReply', products: [] },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // ---- Handle Direct API Add to Cart ----
  const handleDirectAddToCart = async (product) => {
    try {
      const cartRes = await axios.post('/api/cart/add', {
        product_id: product.id,
        quantity: 1,
        cart_id: cartIdRef.current,
      });
      
      const newCartId = cartRes.data.cart_id;
      if (newCartId && newCartId !== cartIdRef.current) {
        setCartId(newCartId);
      }
      
      // Open the Cart Drawer instantly
      setIsCartOpen(true);
      showToast('COMPLETED', `Added to Cart!`, newCartId);
    } catch (err) {
      showToast('ABANDONED', 'Failed to add to cart', cartIdRef.current);
    }
  };

  // ---- Handle Remove From Cart ----
  const handleRemoveFromCart = async (productId) => {
    try {
      if (!cartIdRef.current) return;
      
      await axios.post('/api/cart/remove', {
        product_id: productId,
        cart_id: cartIdRef.current,
      });
      
      showToast('COMPLETED', 'Item removed from cart', cartIdRef.current);
      
      // Trigger a silent chat update to refetch cart state if chat is open,
      // or we can just let the cart drawer refresh itself. 
      // Cart drawer will auto-fetch since we don't hold cart_items in App state directly.
    } catch (err) {
      showToast('ABANDONED', 'Failed to remove from cart', cartIdRef.current);
    }
  };

  // ---- Handle Checkout for the entire active cart (from generative UI) ----
  const handleCartCheckout = async () => {
    const currentCartId = cartIdRef.current;
    if (!currentCartId) return;
    showToast('ACTIVE', `Processing checkout for active cart…`);
    try {
      const { data } = await axios.post('/api/checkout/intent', {
        cart_id: currentCartId,
        user_mandate: userMandate,
      });

      showToast('AUTHORIZED', 'Policy checks passed — processing payment…');

      setMessages((prev) => [
        ...prev,
        {
          role: 'agent',
          text: `✅ Order confirmed!\nCart: \`${data.cart_id}\` → ${data.cart_status}\nIdempotency Key: \`${data.idempotency_key}\``,
          ui_component: 'SimpleReply',
          products: [],
          suggested_replies: ['Show me more products', 'View my audit logs'],
        },
      ]);

      setTimeout(() => {
        triggerRazorpay(data.id, data.cart_id, data.idempotency_key, showToast, setMessages, setIsChatOpen, () => {
          setCartId(null);
          setIsCartOpen(false);
        });
      }, 600);

      fetchLogs();
    } catch (err) {
      const errorData = err.response?.data;
      const errorCode = errorData?.error?.code || 'UNKNOWN';
      const errorMessage = errorData?.error?.message || 'Checkout failed. Please try again.';
      const cId = errorData?.cart_id || cartId;
      const cartStatus = errorData?.cart_status || 'ABANDONED';

      showToast('ABANDONED', errorMessage, cId);

      setMessages((prev) => [
        ...prev,
        {
          role: 'agent',
          text: `🚫 Checkout blocked by Policy Engine.\n**${errorCode}**: ${errorMessage}${cId ? `\nCart: \`${cId}\` → ${cartStatus}` : ''}`,
          ui_component: 'SimpleReply',
          products: [],
          suggested_replies: ['Increase my spending limit', 'Show me cheaper options'],
        },
      ]);
      
      if (cartStatus === 'ABANDONED' || errorCode === 'INVALID_CART') {
          setCartId(null);
      }

      fetchLogs();
    }
  };

  // ---- Handle form submit ----
  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage(input.trim());
  };

  // ---- Handle category click from storefront ----
  const handleCategoryClick = (categoryName) => {
    setIsChatOpen(true);
    sendMessage(`Show me ${categoryName} products`);
  };

  // ---- Handle open chat from hero CTA ----
  const handleOpenChat = () => {
    setIsChatOpen(true);
  };

  return (
    <div className={`min-h-screen font-sans ${viewMode === 'shopper' ? 'bg-slate-950 text-slate-200' : 'bg-gray-50 text-slate-800'}`}>
      {/* Navbar */}
      <Navbar
        userMandate={userMandate}
        onSettingsClick={() => setIsSettingsOpen(true)}
        onChatToggle={() => setIsChatOpen(!isChatOpen)}
        isChatOpen={isChatOpen}
        viewMode={viewMode}
        onViewModeToggle={setViewMode}
        cartItemCount={cartItemCount}
        onCartToggle={() => setIsCartOpen(!isCartOpen)}
      />

      {/* Main View */}
      {viewMode === 'shopper' ? (
        <HeroStorefront
          onCategoryClick={handleCategoryClick}
          onOpenChat={handleOpenChat}
          auditLogs={auditLogs}
          onAddToCart={handleDirectAddToCart}
          onViewProduct={setSelectedProduct}
        />
      ) : viewMode === 'developer' ? (
        <DeveloperPortal />
      ) : (
        <MerchantDashboard />
      )}

      {/* Shopper-only Overlays */}
      {viewMode === 'shopper' && (
        <>
          {/* Chat Drawer */}
          <ChatDrawer
            isOpen={isChatOpen}
            onClose={() => setIsChatOpen(false)}
            cartId={cartId}
            messages={messages}
        input={input}
        setInput={setInput}
        isLoading={isLoading}
            onSubmit={handleSubmit}
            onSuggestClick={sendMessage}
            onAddToCart={handleDirectAddToCart}
            onRemoveFromCart={handleRemoveFromCart}
            onCheckoutCart={handleCartCheckout}
            userMandate={userMandate}
          />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        userMandate={userMandate}
        onMandateChange={setUserMandate}
      />

          {/* Product Detail Modal */}
          <ProductModal
            product={selectedProduct}
            onClose={() => setSelectedProduct(null)}
            onBuyClick={handleDirectAddToCart}
            onAddToCart={handleDirectAddToCart}
          />
          
          {/* Cart Drawer */}
          <CartDrawer
            isOpen={isCartOpen}
            onClose={() => setIsCartOpen(false)}
            cartId={cartId}
            userMandate={userMandate}
            onCheckout={handleCartCheckout}
            onRemoveFromCart={handleRemoveFromCart}
            onCartLoaded={(count) => setCartItemCount(count)}
          />
        </>
      )}

      {/* Cart State Machine Toast (Available in both modes) */}
      <CartToast
        toast={toast}
        onDismiss={() => setToast(null)}
      />
    </div>
  );
}
