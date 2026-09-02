import React from 'react';
import { Hexagon, Code2, CheckCircle2, ShieldCheck, ArrowRight } from 'lucide-react';

export default function DeveloperPortal() {
  return (
    <div className="min-h-screen bg-[#06080f] pt-24 pb-12 px-6 overflow-y-auto">
      <div className="max-w-3xl mx-auto space-y-16">
        
        {/* Header */}
        <div className="space-y-5">
          <p className="text-[11px] font-semibold tracking-[0.25em] uppercase text-white/20">
            Developer Documentation
          </p>
          <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight leading-tight">
            Agent Protocol
            <span className="text-white/20"> (A2A)</span>
          </h1>
          <p className="text-base text-white/30 leading-relaxed max-w-xl">
            This headless checkout API allows external AI shopping agents to securely transact on behalf of users. All endpoints are deterministic — the AI cannot invent prices.
          </p>
        </div>

        {/* Section 1: Agent Manifest */}
        <div className="space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-md bg-white/[0.06] flex items-center justify-center">
              <span className="text-white/40 text-xs font-bold">01</span>
            </div>
            <h2 className="text-lg font-bold text-white">Discovery</h2>
          </div>
          <p className="text-sm text-white/30 leading-relaxed">
            External AIs ping <code className="bg-white/[0.04] text-white/50 px-1.5 py-0.5 rounded text-xs font-mono">GET /.well-known/agent-manifest.json</code> to discover merchant capabilities and spending authorization requirements.
          </p>
          <div className="bg-[#0a0c14] rounded-xl border border-white/[0.04] overflow-hidden">
            <div className="px-4 py-2.5 border-b border-white/[0.04] flex items-center gap-2">
              <span className="text-[10px] text-white/20 font-mono uppercase tracking-wider">Response</span>
            </div>
            <pre className="p-5 overflow-x-auto text-[13px] font-mono leading-relaxed text-white/35">
<span className="text-white/15">{"{"}</span>
{"  "}<span className="text-white/50">"name"</span>: <span className="text-emerald-400/50">"MerchantOS"</span>,
{"  "}<span className="text-white/50">"version"</span>: <span className="text-emerald-400/50">"1.0.0"</span>,
{"  "}<span className="text-white/50">"capabilities"</span>: [
{"    "}<span className="text-emerald-400/50">"headless_checkout"</span>,
{"    "}<span className="text-emerald-400/50">"deterministic_cart"</span>,
{"    "}<span className="text-emerald-400/50">"mandate_authorization"</span>
{"  "}],
{"  "}<span className="text-white/50">"endpoints"</span>: <span className="text-white/15">{"{"}</span>
{"    "}<span className="text-white/50">"catalog"</span>: <span className="text-emerald-400/50">"/api/catalog"</span>,
{"    "}<span className="text-white/50">"cart"</span>: <span className="text-emerald-400/50">"/api/cart/add"</span>,
{"    "}<span className="text-white/50">"checkout"</span>: <span className="text-emerald-400/50">"/api/checkout/intent"</span>
{"  "}<span className="text-white/15">{"}"}</span>
<span className="text-white/15">{"}"}</span>
            </pre>
          </div>
        </div>

        {/* Section 2: Two-Step Checkout */}
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-md bg-white/[0.06] flex items-center justify-center">
              <span className="text-white/40 text-xs font-bold">02</span>
            </div>
            <h2 className="text-lg font-bold text-white">Deterministic Checkout</h2>
          </div>
          <p className="text-sm text-white/30 leading-relaxed">
            The external AI cannot propose prices. It can only create a cart and request authorization against the user's spending mandate.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Step 1 */}
            <div className="bg-[#0a0c14] rounded-xl border border-white/[0.04] overflow-hidden flex flex-col">
              <div className="p-4 border-b border-white/[0.04]">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] text-white/20 font-mono uppercase tracking-wider">Step 1</span>
                </div>
                <h3 className="font-bold text-sm text-white">Create Cart</h3>
              </div>
              <div className="flex-1">
                <div className="px-4 py-2 border-b border-white/[0.03]">
                  <span className="text-[11px] text-emerald-400/60 font-bold mr-2">POST</span>
                  <span className="text-[11px] text-white/30 font-mono">/api/cart/add</span>
                </div>
                <pre className="p-4 overflow-x-auto text-xs font-mono text-white/30">
<span className="text-white/15">{"{"}</span>
{"  "}<span className="text-white/50">"product_id"</span>: <span className="text-white/40">101</span>,
{"  "}<span className="text-white/50">"quantity"</span>: <span className="text-white/40">1</span>
<span className="text-white/15">{"}"}</span>
                </pre>
              </div>
            </div>

            {/* Step 2 */}
            <div className="bg-[#0a0c14] rounded-xl border border-white/[0.04] overflow-hidden flex flex-col">
              <div className="p-4 border-b border-white/[0.04]">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] text-white/20 font-mono uppercase tracking-wider">Step 2</span>
                </div>
                <h3 className="font-bold text-sm text-white">Authorize & Pay</h3>
              </div>
              <div className="flex-1">
                <div className="px-4 py-2 border-b border-white/[0.03]">
                  <span className="text-[11px] text-emerald-400/60 font-bold mr-2">POST</span>
                  <span className="text-[11px] text-white/30 font-mono">/api/checkout/intent</span>
                </div>
                <pre className="p-4 overflow-x-auto text-xs font-mono text-white/30">
<span className="text-white/15">{"{"}</span>
{"  "}<span className="text-white/50">"cart_id"</span>: <span className="text-emerald-400/50">"uuid-abc-123"</span>,
{"  "}<span className="text-white/50">"user_mandate"</span>: <span className="text-white/40">3000</span>
<span className="text-white/15">{"}"}</span>
                </pre>
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Resilience */}
        <div className="space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-md bg-white/[0.06] flex items-center justify-center">
              <span className="text-white/40 text-xs font-bold">03</span>
            </div>
            <h2 className="text-lg font-bold text-white">Resilience</h2>
          </div>
          <div className="bg-[#0a0c14] border border-white/[0.04] rounded-xl p-6 relative overflow-hidden">
            <h3 className="text-sm font-bold text-white mb-3">Cart State Machine & Webhooks</h3>
            <p className="text-sm text-white/25 leading-relaxed mb-3">
              All transactions follow a strict state machine: <span className="text-white/40 font-mono text-xs">ACTIVE</span> → <span className="text-white/40 font-mono text-xs">AUTHORIZED</span> → <span className="text-white/40 font-mono text-xs">COMPLETED</span>
            </p>
            <p className="text-sm text-white/25 leading-relaxed">
              External agents cannot lose user funds due to network partitions. Razorpay webhooks ensure graceful recovery and idempotency guarantees, maintaining data integrity even if the AI buyer goes offline mid-checkout.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
