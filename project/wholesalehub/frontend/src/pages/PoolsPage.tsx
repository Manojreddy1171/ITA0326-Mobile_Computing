import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Users, Plus, Clock, Tag, ArrowRight, ShieldCheck, Flame, Search } from 'lucide-react';
import api from '../lib/api';
import { useAuthStore } from '../store/authStore';
import { formatINR, timeRemaining, getTierDiscount } from '../lib/utils';

export default function PoolsPage() {
  const { user } = useAuthStore();
  const [status, setStatus] = useState('active');
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['pools', status],
    queryFn: () => api.get(`/pools?status=${status}`).then(r => r.data),
  });

  const pools = data?.pools || [];
  const filtered = pools.filter((p: any) =>
    search ? (p.title.toLowerCase().includes(search.toLowerCase()) || p.product_name.toLowerCase().includes(search.toLowerCase())) : true
  );

  return (
    <div className="page-container max-w-5xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold font-heading text-white">Cooperative Group Buying Pools</h1>
            <span className="badge-warning text-xs flex items-center gap-1 font-semibold">
              <Flame className="w-3.5 h-3.5 text-amber-500 fill-amber-500" /> Bulk Savings
            </span>
          </div>
          <p className="text-navy-300 text-sm mt-1">
            Small retailers and kiranas combine purchase volume to unlock Tier 1 wholesale discounts usually reserved for mega distributors.
          </p>
        </div>

        {user?.role === 'seller' && (
          <Link to="/pools/create" className="btn-primary self-start sm:self-auto flex items-center gap-1.5 text-xs py-2.5">
            <Plus className="w-4 h-4" /> Start New Group Pool
          </Link>
        )}
      </div>

      {/* Search & Tabs */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-navy-400" />
          <input
            type="text"
            className="input-field pl-9 py-2 text-xs"
            placeholder="Search active group deals..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2">
          {['active', 'closed', 'cancelled'].map(tab => (
            <button
              key={tab}
              onClick={() => setStatus(tab)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition ${
                status === tab
                  ? 'bg-amber-500 text-navy-950 font-bold'
                  : 'bg-navy-900/60 text-navy-300 hover:bg-navy-800 border border-navy-800'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Pool Cards Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="skeleton h-64 rounded-2xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <Users className="w-12 h-12 text-navy-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-white">No {status} group pools found</h3>
          <p className="text-navy-400 text-xs mt-1">
            Check back soon or explore our general wholesale catalog.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((pool: any) => {
            const tiers = typeof pool.tier_config === 'string' ? JSON.parse(pool.tier_config) : pool.tier_config;
            const currentDiscount = getTierDiscount(tiers, pool.current_quantity);
            const nextTier = [...(tiers || [])].sort((a: any, b: any) => a.min_qty - b.min_qty).find((t: any) => t.min_qty > pool.current_quantity);
            const discountedPrice = parseFloat(pool.list_price) * (1 - currentDiscount / 100);
            const remaining = timeRemaining(pool.deadline);

            const targetQty = nextTier ? nextTier.min_qty : pool.moq;
            const progress = Math.min(100, Math.round((pool.current_quantity / targetQty) * 100));

            return (
              <Link
                key={pool.id}
                to={`/pools/${pool.id}`}
                className="card p-5 hover:border-amber-500/50 transition flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-start gap-4">
                    <div className="w-20 h-20 rounded-xl overflow-hidden bg-navy-950 border border-navy-800 flex-shrink-0">
                      {pool.product_image ? (
                        <img src={pool.product_image} alt={pool.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-3xl">📦</div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 text-[11px] text-amber-400 font-semibold mb-1">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{remaining.ended ? 'Ended' : `${remaining.text} left`}</span>
                      </div>
                      <h3 className="text-base font-bold text-white group-hover:text-amber-400 transition truncate">
                        {pool.title}
                      </h3>
                      <p className="text-xs text-navy-300 truncate mt-0.5">
                        Product: <span className="text-white">{pool.product_name}</span>
                      </p>
                      <p className="text-[11px] text-navy-400 mt-0.5">
                        Seller: {pool.seller_business || pool.seller_name}
                      </p>
                    </div>
                  </div>

                  {/* Pricing and Discount banner */}
                  <div className="mt-4 p-3 rounded-xl bg-navy-950/70 border border-navy-800 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] text-navy-400 uppercase">Effective Price</div>
                      <div className="text-lg font-bold text-amber-400">
                        {formatINR(discountedPrice)}
                        <span className="text-xs text-navy-400 font-normal">/{pool.unit}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-navy-400 uppercase">Current Tier</div>
                      <div className="badge-success inline-flex text-xs font-bold">
                        {currentDiscount}% OFF
                      </div>
                    </div>
                  </div>

                  {/* Progress bar towards next tier */}
                  <div className="mt-4">
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-navy-300">
                        Pledged: <strong className="text-white">{pool.current_quantity}</strong> / {targetQty} {pool.unit}s
                      </span>
                      {nextTier && (
                        <span className="text-amber-400 font-medium">
                          +{nextTier.min_qty - pool.current_quantity} for {nextTier.discount_pct}% OFF
                        </span>
                      )}
                    </div>
                    <div className="w-full h-2.5 rounded-full bg-navy-800 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-amber-500 to-amber-300 rounded-full transition-all duration-500"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 mt-4 border-t border-navy-800/80 text-xs">
                  <span className="text-navy-400 flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-navy-300" /> {pool.member_count || 0} Retailers Joined
                  </span>
                  <div className="text-amber-400 font-semibold group-hover:translate-x-1 transition flex items-center gap-1">
                    Join Pool <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
