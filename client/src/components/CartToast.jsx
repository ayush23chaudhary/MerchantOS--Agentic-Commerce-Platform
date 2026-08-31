import { useEffect } from 'react';
import { ShieldCheck, Loader2, CheckCircle2, XCircle, X } from 'lucide-react';

const TOAST_CONFIG = {
  ACTIVE: {
    icon: Loader2,
    iconClass: 'text-indigo-400 animate-spin',
    bg: 'bg-[#131b2f]/95 border-indigo-500/20',
    title: 'Processing',
    subtitle: 'Validating products & calculating total…',
    accent: 'bg-indigo-500/50',
  },
  AUTHORIZED: {
    icon: ShieldCheck,
    iconClass: 'text-amber-400',
    bg: 'bg-[#131b2f]/95 border-amber-500/20',
    title: 'Policy Checks Passed',
    subtitle: 'Initiating secure payment…',
    accent: 'bg-amber-500/60',
  },
  COMPLETED: {
    icon: CheckCircle2,
    iconClass: 'text-emerald-400',
    bg: 'bg-[#131b2f]/95 border-emerald-500/20',
    title: 'Order Complete',
    subtitle: 'Transaction secured successfully.',
    accent: 'bg-emerald-500/60',
  },
  ABANDONED: {
    icon: XCircle,
    iconClass: 'text-rose-400',
    bg: 'bg-[#131b2f]/95 border-rose-500/20',
    title: 'Checkout Blocked',
    subtitle: 'Policy engine rejected this transaction.',
    accent: 'bg-rose-500/60',
  },
};

export default function CartToast({ toast, onDismiss }) {
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(onDismiss, 4500);
    return () => clearTimeout(timer);
  }, [toast, onDismiss]);

  if (!toast) return null;

  const config = TOAST_CONFIG[toast.status] || TOAST_CONFIG.ACTIVE;
  const Icon = config.icon;

  return (
    <div className="fixed bottom-6 right-6 z-[70] toast-slide-in">
      <div className={`flex items-start gap-3 px-5 py-4 rounded-xl border backdrop-blur-2xl shadow-2xl shadow-black/50 max-w-sm ${config.bg}`}>
        <div className={`absolute top-0 left-0 w-full h-[1px] rounded-t-xl ${config.accent}`} />

        <div className="flex-shrink-0 mt-0.5">
          <Icon size={18} className={config.iconClass} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white">{config.title}</p>
          <p className="text-[11px] text-white/30 mt-0.5 leading-relaxed">
            {toast.message || config.subtitle}
          </p>
          {toast.cartId && (
            <p className="text-[10px] text-white/15 mt-1.5 font-mono truncate">
              {toast.cartId}
            </p>
          )}
        </div>
        <button
          onClick={onDismiss}
          className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded text-white/20 hover:text-white/50 hover:bg-white/[0.06] transition-all"
        >
          <X size={12} />
        </button>
      </div>
    </div>
  );
}
