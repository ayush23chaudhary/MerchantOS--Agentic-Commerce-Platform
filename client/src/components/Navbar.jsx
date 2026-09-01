import { Sliders, ShoppingBag, MessageSquareText, BadgeIndianRupee, Hexagon, BarChart3, Code2 } from 'lucide-react';

export default function Navbar({ userMandate, onSettingsClick, onChatToggle, isChatOpen, viewMode, onViewModeToggle, cartItemCount, onCartToggle }) {
  return (
    <nav className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-6 py-3 bg-[#0c1222]/90 backdrop-blur-2xl border-b border-indigo-500/10">
      {/* Logo */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-900/40">
          <Hexagon size={20} className="text-white" strokeWidth={2.5} />
        </div>
        <div>
          <h1 className="text-[15px] font-extrabold text-white tracking-tight leading-none">MerchantOS</h1>
          <p className="text-[10px] text-indigo-300 font-medium tracking-widest uppercase">Razorpay · Gemini</p>
        </div>
      </div>

      {/* View Mode Toggle */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 hidden md:flex items-center bg-[#131b2f] rounded-lg p-1 border border-indigo-500/10 shadow-inner">
        <button
          onClick={() => onViewModeToggle('shopper')}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-xs font-bold tracking-wide transition-all duration-200 ${
            viewMode === 'shopper'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/40'
              : 'text-indigo-200/50 hover:text-indigo-200'
          }`}
        >
          Storefront
        </button>
        <button
          onClick={() => onViewModeToggle('merchant')}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-xs font-bold tracking-wide transition-all duration-200 ${
            viewMode === 'merchant'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/40'
              : 'text-indigo-200/50 hover:text-indigo-200'
          }`}
        >
          Dashboard
        </button>
        <button
          onClick={() => onViewModeToggle('developer')}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-xs font-bold tracking-wide transition-all duration-200 ${
            viewMode === 'developer'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/40'
              : 'text-indigo-200/50 hover:text-indigo-200'
          }`}
        >
          API
        </button>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-1.5">
        {viewMode === 'shopper' && (
          <>
            {/* Mandate badge */}
            <div className="hidden sm:flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400/80 text-[11px] font-medium px-3 py-1.5 rounded-lg mr-1">
              <BadgeIndianRupee size={13} className="text-emerald-400" />
              <span className="text-emerald-400 font-bold">₹{Number(userMandate).toLocaleString('en-IN')}</span>
              <span className="text-emerald-400/50">limit</span>
            </div>

            {/* Settings */}
            <button
              onClick={onSettingsClick}
              className="w-9 h-9 rounded-lg flex items-center justify-center text-indigo-200/50 hover:text-indigo-200 hover:bg-indigo-500/10 transition-all duration-200 active:scale-90"
              title="Settings"
            >
              <Sliders size={17} />
            </button>

            {/* Cart Button */}
            <button
              onClick={onCartToggle}
              className="w-9 h-9 rounded-lg flex items-center justify-center text-indigo-200/50 hover:text-indigo-200 hover:bg-indigo-500/10 transition-all duration-200 active:scale-90 relative"
              title="Cart"
            >
              <ShoppingBag size={17} />
              {cartItemCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-4.5 bg-indigo-500 rounded-full text-[9px] font-bold text-white flex items-center justify-center px-1 shadow-md shadow-indigo-900/40">
                  {cartItemCount}
                </span>
              )}
            </button>

            {/* Chat toggle */}
            <button
              onClick={onChatToggle}
              className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-200 active:scale-90 ${
                isChatOpen
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/40'
                  : 'text-indigo-200/50 hover:text-indigo-200 hover:bg-indigo-500/10'
              }`}
              title="AI Chat"
            >
              <MessageSquareText size={17} />
            </button>
          </>
        )}
      </div>
    </nav>
  );
}
