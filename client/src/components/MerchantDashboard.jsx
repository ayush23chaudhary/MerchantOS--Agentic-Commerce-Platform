import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { TrendingUp, AlertCircle, Sparkles, MessageSquare, Check, X, RefreshCw, ShoppingBag, ArrowRight } from 'lucide-react';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const formatINR = (val) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

const formatTime = (ts) => new Date(ts).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });

export default function MerchantDashboard() {
  const [insights, setInsights] = useState({
    revenue_today: 0,
    abandoned_revenue: 0,
    total_completed: 0,
    total_abandoned: 0,
    abandoned_carts: [],
  });
  const [isLoading, setIsLoading] = useState(true);

  // Campaign generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeCartId, setActiveCartId] = useState(null);
  const [campaignResult, setCampaignResult] = useState(null);
  const [campaignError, setCampaignError] = useState(null);

  // Fetch insights
  const fetchInsights = useCallback(async () => {
    try {
      const { data } = await axios.get('/api/merchant/insights');
      setInsights(data);
    } catch (err) {
      console.error('Failed to load merchant insights:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInsights();
    const interval = setInterval(fetchInsights, 5000);
    return () => clearInterval(interval);
  }, [fetchInsights]);

  // Generate Campaign
  const handleGenerateCampaign = async (cartId) => {
    setIsGenerating(true);
    setActiveCartId(cartId);
    setCampaignResult(null);
    setCampaignError(null);

    try {
      const { data } = await axios.post('/api/merchant/campaign/generate', { cart_id: cartId });
      setCampaignResult(data);
    } catch (err) {
      setCampaignError(err.response?.data?.error?.message || 'Failed to generate campaign.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="pt-24 pb-16 px-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">MerchantOS Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">B2B Revenue Analytics & AI Agent Recovery</p>
        </div>
        <button
          onClick={fetchInsights}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-sm font-semibold text-slate-600 shadow-sm active:scale-95 transition-all"
        >
          <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Top Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
        {/* Revenue Today */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-bl-full -z-10 group-hover:scale-110 transition-transform duration-500" />
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center shadow-sm">
              <TrendingUp size={24} />
            </div>
            <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">Today</span>
          </div>
          <div>
            <h2 className="text-slate-500 text-sm font-semibold mb-1">Completed Revenue</h2>
            <p className="text-4xl font-extrabold text-slate-900 tracking-tight">{formatINR(insights.revenue_today)}</p>
            <p className="text-sm text-emerald-600 font-semibold mt-2 flex items-center gap-1">
              <Check size={14} /> {insights.total_completed} Successful Orders
            </p>
          </div>
        </div>

        {/* Lost to Abandonment */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-rose-50 rounded-bl-full -z-10 group-hover:scale-110 transition-transform duration-500" />
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-xl flex items-center justify-center shadow-sm">
              <AlertCircle size={24} />
            </div>
            <span className="bg-rose-100 text-rose-700 text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">Risk</span>
          </div>
          <div>
            <h2 className="text-slate-500 text-sm font-semibold mb-1">Lost to Abandonment</h2>
            <p className="text-4xl font-extrabold text-slate-900 tracking-tight">{formatINR(insights.abandoned_revenue)}</p>
            <p className="text-sm text-rose-600 font-semibold mt-2 flex items-center gap-1">
              <X size={14} /> {insights.total_abandoned} Abandoned Carts
            </p>
          </div>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Recovery Orchestrator (Table) */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center">
                  <ShoppingBag size={16} />
                </div>
                <h3 className="text-lg font-bold text-slate-800">Recovery Orchestrator</h3>
              </div>
              <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                {insights.abandoned_carts.length} Active Leads
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-100">
                    <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cart ID / Time</th>
                    <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Products</th>
                    <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Value</th>
                    <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {insights.abandoned_carts.map(cart => (
                    <tr key={cart.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 align-middle">
                        <div className="font-mono text-xs font-medium text-slate-600 mb-1">{cart.id.split('-')[0]}…</div>
                        <div className="text-[10px] text-slate-400">{formatTime(cart.created_at)}</div>
                        <div className="mt-1.5">
                          <span className="inline-flex text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border border-rose-200 bg-rose-50 text-rose-600">
                            {cart.policy_result?.replace('_', ' ') || 'REJECTED'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 align-middle">
                        <div className="flex -space-x-2">
                          {cart.products?.slice(0, 3).map((p, i) => (
                            <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-slate-100 flex-shrink-0 overflow-hidden" title={p.name}>
                              {p.image_url ? (
                                <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-xs">📦</div>
                              )}
                            </div>
                          ))}
                          {cart.products?.length > 3 && (
                            <div className="w-8 h-8 rounded-full border-2 border-white bg-slate-100 text-[10px] font-bold text-slate-500 flex items-center justify-center">
                              +{cart.products.length - 3}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 align-middle">
                        <div className="text-sm font-bold text-slate-800">{formatINR(cart.total_amount)}</div>
                      </td>
                      <td className="px-6 py-4 align-middle">
                        <button
                          onClick={() => handleGenerateCampaign(cart.id)}
                          disabled={isGenerating && activeCartId === cart.id}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                            isGenerating && activeCartId === cart.id
                              ? 'bg-indigo-50 text-indigo-400 cursor-not-allowed'
                              : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-200 active:scale-95'
                          }`}
                        >
                          {isGenerating && activeCartId === cart.id ? (
                            <RefreshCw size={14} className="animate-spin" />
                          ) : (
                            <Sparkles size={14} />
                          )}
                          AI Agent
                        </button>
                      </td>
                    </tr>
                  ))}
                  {insights.abandoned_carts.length === 0 && (
                    <tr>
                      <td colSpan="4" className="px-6 py-12 text-center text-slate-500">
                        <ShoppingBag size={32} className="mx-auto mb-3 opacity-20" />
                        <p className="text-sm font-semibold">No abandoned carts found.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Campaign Result Card */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm h-full flex flex-col overflow-hidden relative">
            <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <MessageSquare size={16} />
              </div>
              <h3 className="text-lg font-bold text-slate-800">Campaign Draft</h3>
            </div>
            
            <div className="p-6 flex-1 flex flex-col bg-slate-50/30">
              {!campaignResult && !isGenerating && !campaignError && (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-400 text-center gap-3">
                  <Sparkles size={40} className="opacity-20" />
                  <p className="text-sm font-medium">Click "AI Agent" on any cart to generate a personalized recovery SMS.</p>
                </div>
              )}

              {isGenerating && (
                <div className="flex-1 flex flex-col items-center justify-center text-indigo-500 gap-4">
                  <RefreshCw size={32} className="animate-spin" />
                  <p className="text-sm font-bold animate-pulse">Agent is crafting campaign…</p>
                </div>
              )}

              {campaignError && (
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-rose-600 text-sm">
                  <p className="font-bold mb-1 flex items-center gap-1"><AlertCircle size={14} /> Error</p>
                  {campaignError}
                </div>
              )}

              {campaignResult && !isGenerating && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 flex-1 flex flex-col">
                  {/* Phone Mockup SMS */}
                  <div className="bg-slate-100 rounded-[2rem] p-4 border-[6px] border-slate-300 shadow-inner mb-6 relative">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-16 h-4 bg-slate-300 rounded-b-xl"></div>
                    <div className="bg-blue-500 text-white rounded-2xl rounded-br-sm p-4 text-sm mt-4 shadow-sm relative">
                      <p className="leading-relaxed">{campaignResult.campaign.campaign_text}</p>
                    </div>
                    <p className="text-[10px] text-center text-slate-400 font-medium mt-3">SMS Preview</p>
                  </div>

                  {/* AI Extracted Intel */}
                  <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-4 mb-6">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider mb-0.5">Proposed Incentive</p>
                        <p className="text-sm font-semibold text-slate-800">{campaignResult.campaign.incentive}</p>
                      </div>
                      <Sparkles size={16} className="text-indigo-400" />
                    </div>
                    <div className="h-px w-full bg-indigo-100 mb-3" />
                    <div>
                      <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider mb-0.5">Projected Recovery</p>
                      <p className="text-lg font-extrabold text-emerald-600">{formatINR(campaignResult.campaign.projected_recovery_amount)}</p>
                    </div>
                  </div>

                  <div className="mt-auto">
                    <button
                      onClick={() => alert('Campaign dispatched via SMS gateway! 🚀')}
                      className="w-full flex items-center justify-center gap-2 py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-lg shadow-slate-200 transition-all active:scale-[0.98]"
                    >
                      Approve & Execute <ArrowRight size={16} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
