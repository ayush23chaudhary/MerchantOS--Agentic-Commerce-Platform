import { ShieldCheck, X } from 'lucide-react';
import { useState } from 'react';

export default function SettingsModal({ isOpen, onClose, userMandate, onMandateChange }) {
  const [localMandate, setLocalMandate] = useState(userMandate);

  if (!isOpen) return null;

  const handleSave = () => {
    const val = Math.max(0, Number(localMandate) || 0);
    onMandateChange(val);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm modal-backdrop-enter"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-[#131b2f] border border-indigo-500/10 rounded-2xl shadow-2xl shadow-indigo-900/20 modal-enter overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4">
          <div>
            <h2 className="text-base font-bold text-white">Spending Limit</h2>
            <p className="text-xs text-white/25 mt-0.5">Configure your AI authorization cap</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white/30 hover:text-white hover:bg-white/[0.06] transition-all active:scale-90"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 pb-6 space-y-5">
          <div>
            <label className="block text-xs font-medium text-white/40 mb-2 uppercase tracking-wider">
              Maximum per transaction (INR)
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 font-semibold text-lg">₹</span>
              <input
                type="number"
                value={localMandate}
                onChange={(e) => setLocalMandate(e.target.value)}
                min="0"
                className="w-full bg-[#0c1222] border border-indigo-500/20 rounded-xl pl-10 pr-4 py-3.5 text-xl font-bold text-white outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 transition-all placeholder-white/10"
                placeholder="5000"
              />
            </div>
          </div>

          {/* Security info */}
          <div className="bg-indigo-500/5 border border-indigo-500/10 rounded-xl p-4 flex items-start gap-3">
            <ShieldCheck size={18} className="text-emerald-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-medium text-white/50 mb-1">Policy Engine Protection</p>
              <p className="text-[11px] text-white/25 leading-relaxed">
                The AI agent cannot bypass this limit. All transactions are validated server-side before reaching Razorpay.
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              onClick={onClose}
              className="flex-1 py-3 rounded-xl text-sm font-medium bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-white/50 transition-all active:scale-[0.98]"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex-1 py-3 rounded-xl text-sm font-bold bg-indigo-600 text-white hover:bg-indigo-500 transition-all active:scale-[0.98] shadow-lg shadow-indigo-900/40"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
