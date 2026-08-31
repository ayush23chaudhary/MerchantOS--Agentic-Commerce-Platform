import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { X, ShoppingBag, Loader2, ShieldCheck, ArrowRight, Sparkles } from 'lucide-react';

export default function CartDrawer({ isOpen, onClose, cartId, userMandate, onCheckout, onRemoveFromCart, onCartLoaded }) {
  const [cartItems, setCartItems] = useState([]);
  const [subtotal, setSubtotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  
  const [upsellItem, setUpsellItem] = useState(null);
  const [isUpsellLoading, setIsUpsellLoading] = useState(false);
  const [isAddingUpsell, setIsAddingUpsell] = useState(false);

  const fetchCart = async () => {
    if (!cartId) {
      setCartItems([]);
      setSubtotal(0);
      return;
    }
    setIsLoading(true);
    try {
      const { data } = await axios.get(`/api/cart/${cartId}`);
      setCartItems(data.cart_data || []);
      const total = (data.cart_data || []).reduce((sum, item) => sum + (Number(item.price) * Number(item.quantity)), 0);
      setSubtotal(total);
      if (onCartLoaded) onCartLoaded((data.cart_data || []).length);
    } catch (err) {
      console.error('Failed to fetch cart', err);
    } finally {
      setIsLoading(false);
    }
  };

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

  useEffect(() => {
    if (isOpen) {
      fetchCart();
      fetchUpsell();
    }
  }, [isOpen, cartId]);

  const handleAddUpsell = async () => {
    if (!upsellItem?.recommended_product?.id) return;
    setIsAddingUpsell(true);
    try {
      await axios.post('/api/cart/add', {
        cart_id: cartId,
        product_id: upsellItem.recommended_product.id,
        quantity: 1
      });
      await fetchCart();
      setUpsellItem(null);
    } catch (err) {
      console.error('Failed to add upsell', err);
    } finally {
      setIsAddingUpsell(false);
    }
  };

  const isOverBudget = subtotal > userMandate;
  const progressPercentage = Math.min((subtotal / userMandate) * 100, 100);

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div className={`fixed top-0 right-0 h-full w-full max-w-md bg-[#0c1222] border-l border-indigo-500/10 z-50 shadow-2xl flex flex-col transition-transform duration-300 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/[0.04]">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-bold text-white tracking-tight">Cart</h2>
            <span className="bg-white/[0.06] text-white/40 text-[11px] px-2 py-0.5 rounded font-medium">
              {cartItems.length} {cartItems.length === 1 ? 'item' : 'items'}
            </span>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-white/30 hover:text-white hover:bg-white/[0.06] transition-all"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-40 gap-3">
              <Loader2 className="animate-spin text-white/20" size={20} />
              <p className="text-sm text-white/20">Loading cart...</p>
            </div>
          ) : cartItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <div className="w-16 h-16 rounded-2xl bg-white/[0.03] flex items-center justify-center">
                <ShoppingBag size={24} className="text-white/15" />
              </div>
              <p className="text-white/40 font-medium text-sm">Your cart is empty</p>
              <button onClick={onClose} className="text-white/25 text-xs hover:text-white/40 underline underline-offset-4 transition-colors">
                Continue browsing
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="space-y-3">
                {cartItems.map((item, idx) => (
                  <div key={idx} className="flex gap-4 p-3 bg-white/[0.02] rounded-xl border border-white/[0.04] relative pr-10">
                    <div className="w-14 h-14 bg-white rounded-lg flex items-center justify-center p-1.5 shrink-0">
                      {item.image_url ? (
                        <img src={item.image_url} alt={item.name} className="max-w-full max-h-full object-contain mix-blend-multiply" />
                      ) : (
                        <span className="text-lg">⬡</span>
                      )}
                    </div>
                    <div className="flex-1 flex flex-col justify-center min-w-0">
                      <p className="text-xs text-white/70 font-medium line-clamp-1">{item.name}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-sm text-white font-bold">₹{Number(item.price).toLocaleString('en-IN')}</span>
                        <span className="text-[10px] text-white/20 font-medium">× {item.quantity}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        if (onRemoveFromCart) {
                          onRemoveFromCart(item.product_id);
                          setTimeout(() => fetchCart(), 300);
                        }
                      }}
                      className="absolute top-1/2 -translate-y-1/2 right-3 w-6 h-6 flex items-center justify-center rounded bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-colors"
                      title="Remove item"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>

              {/* Upsell Engine */}
              {isUpsellLoading ? (
                <div className="mt-2 p-4 border border-indigo-500/10 bg-[#131b2f] rounded-xl flex items-center gap-3">
                  <Sparkles size={14} className="text-white/20 animate-pulse" />
                  <p className="text-xs text-white/25 font-medium animate-pulse">Finding recommendations...</p>
                </div>
              ) : upsellItem?.recommended_product ? (
                <div className="mt-2 p-4 border border-indigo-500/20 bg-[#131b2f] rounded-xl relative overflow-hidden shadow-lg shadow-black/10">
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
            </div>
          )}
        </div>

        {/* Footer */}
        {cartItems.length > 0 && (
          <div className="p-5 border-t border-white/[0.04]">
            <div className="mb-5">
              <div className="flex justify-between items-end mb-3">
                <span className="text-xs text-white/30 font-medium uppercase tracking-wider">Subtotal</span>
                <span className={`text-xl font-bold ${isOverBudget ? 'text-rose-400' : 'text-white'}`}>
                  ₹{subtotal.toLocaleString('en-IN')}
                </span>
              </div>
              
              <div className="space-y-1.5">
                <div className="flex justify-between text-[10px] font-medium uppercase tracking-wider">
                  <span className={isOverBudget ? 'text-rose-400/60' : 'text-white/20'}>
                    {isOverBudget ? 'Exceeds limit' : 'Policy check'}
                  </span>
                  <span className="text-white/20">₹{userMandate.toLocaleString('en-IN')} max</span>
                </div>
                <div className="h-1 w-full bg-white/[0.04] rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${isOverBudget ? 'bg-rose-500' : 'bg-emerald-500'}`}
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>
              </div>
            </div>

            <button 
              onClick={onCheckout}
              disabled={isOverBudget}
              className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-full font-bold text-sm transition-all duration-200 ${
                isOverBudget 
                  ? 'bg-white/[0.04] text-white/20 cursor-not-allowed'
                  : 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-xl shadow-indigo-900/40 active:scale-[0.98]'
              }`}
            >
              {isOverBudget ? 'Exceeds Spending Limit' : 'Checkout'}
              {!isOverBudget && <ArrowRight size={15} />}
            </button>
            <p className="flex items-center justify-center gap-1 mt-3 text-[10px] text-white/15 font-medium">
              <ShieldCheck size={11} />
              Secured by Razorpay
            </p>
          </div>
        )}
      </div>
    </>
  );
}
