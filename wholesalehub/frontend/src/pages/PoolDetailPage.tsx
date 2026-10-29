import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Clock, Users, ShieldCheck, CheckCircle2, AlertCircle, Sparkles, LogOut } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../lib/api';
import { useAuthStore } from '../store/authStore';
import { getSocket } from '../lib/socket';
import { formatINR, timeRemaining, getTierDiscount, getNextTier } from '../lib/utils';

export default function PoolDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, isAuthenticated } = useAuthStore();

  const [joinQty, setJoinQty] = useState('');
  const [showJoinModal, setShowJoinModal] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['pool', id],
    queryFn: () => api.get(`/pools/${id}`).then(r => r.data),
  });

  const pool = data?.pool;
  const members = data?.members || [];
  const currentDiscount = data?.current_discount || 0;
  const currentPrice = data?.current_price || pool?.list_price || 0;

  // Real-time socket updates for pool
  useEffect(() => {
    const socket = getSocket();
    if (!socket || !id) return;

    socket.emit('pool:join_room', id);

    const handleUpdate = () => refetch();
    socket.on('pool:updated', handleUpdate);

    return () => {
      socket.emit('pool:leave_room', id);
      socket.off('pool:updated', handleUpdate);
    };
  }, [id, refetch]);

  const joinMutation = useMutation({
    mutationFn: (qty: number) => api.post(`/pools/${id}/join`, { quantity: qty }),
    onSuccess: () => {
      toast.success('Successfully pledged your order to this group pool!');
      setShowJoinModal(false);
      setJoinQty('');
      refetch();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to join pool');
    },
  });

  const leaveMutation = useMutation({
    mutationFn: () => api.post(`/pools/${id}/leave`),
    onSuccess: () => {
      toast.success('You have withdrawn your pledge from this pool');
      refetch();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to withdraw from pool');
    },
  });

  if (isLoading) {
    return (
      <div className="page-container max-w-4xl">
        <div className="skeleton h-96 rounded-2xl" />
      </div>
    );
  }

  if (!pool) {
    return (
      <div className="page-container text-center py-16">
        <p className="text-navy-300">Group buying pool not found.</p>
        <Link to="/pools" className="btn-primary mt-4 inline-flex">← Back to Pools</Link>
      </div>
    );
  }

  const tiers = typeof pool.tier_config === 'string' ? JSON.parse(pool.tier_config) : pool.tier_config;
  const sortedTiers = [...(tiers || [])].sort((a: any, b: any) => a.min_qty - b.min_qty);
  const remaining = timeRemaining(pool.deadline);

  const myMembership = members.find((m: any) => m.buyer_id === user?.id);
  const isPoolActive = pool.status === 'active' && !remaining.ended;

  const numericJoinQty = parseInt(joinQty) || 0;
  const estimatedTotal = numericJoinQty * currentPrice;

  return (
    <div className="page-container max-w-4xl">
      <div className="mb-4 flex items-center justify-between">
        <Link to="/pools" className="inline-flex items-center gap-1.5 text-sm text-navy-300 hover:text-white transition">
          <ArrowLeft className="w-4 h-4" /> Back to Group Deals
        </Link>
        <span className={`badge-${isPoolActive ? 'success' : 'neutral'}`}>
          {isPoolActive ? 'POOL ACTIVE' : pool.status.toUpperCase()}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Pool Info & Tier Ladder */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card p-6">
            <div className="flex items-start gap-4">
              <div className="w-24 h-24 rounded-2xl overflow-hidden bg-navy-950 border border-navy-800 flex-shrink-0">
                {pool.product_image ? (
                  <img src={pool.product_image} alt={pool.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-4xl">📦</div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="badge-warning text-[10px] font-bold">COOPERATIVE DEAL</span>
                  <span className="text-xs text-navy-400">By {pool.seller_business || pool.seller_name}</span>
                </div>
                <h1 className="text-xl sm:text-2xl font-bold font-heading text-white">{pool.title}</h1>
                <Link
                  to={`/products/${pool.product_id}`}
                  className="text-xs text-amber-400 hover:underline mt-1 inline-block"
                >
                  View Product: {pool.product_name} →
                </Link>
              </div>
            </div>

            {pool.description && (
              <p className="text-sm text-navy-200 mt-4 leading-relaxed bg-navy-900/40 p-3 rounded-xl border border-navy-800">
                {pool.description}
              </p>
            )}

            {/* Current Pool Status Metrics */}
            <div className="grid grid-cols-3 gap-3 mt-6 p-4 rounded-xl bg-navy-950 border border-navy-800 text-center">
              <div>
                <div className="text-[10px] text-navy-400 uppercase">Effective Price</div>
                <div className="text-lg sm:text-xl font-bold text-amber-400">{formatINR(currentPrice)}</div>
                <div className="text-[10px] text-navy-400">/{pool.unit}</div>
              </div>
              <div>
                <div className="text-[10px] text-navy-400 uppercase">Current Discount</div>
                <div className="text-lg sm:text-xl font-bold text-emerald-400">{currentDiscount}% OFF</div>
                <div className="text-[10px] text-navy-400">list {formatINR(pool.list_price)}</div>
              </div>
              <div>
                <div className="text-[10px] text-navy-400 uppercase">Time Remaining</div>
                <div className="text-sm sm:text-base font-bold text-white flex items-center justify-center gap-1 mt-1">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  {remaining.ended ? 'Expired' : remaining.text}
                </div>
              </div>
            </div>
          </div>

          {/* Tier Ladder */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                Volume Discount Ladder
              </h2>
              <span className="text-xs text-navy-400 font-mono">
                Total Pledged: <strong className="text-white">{pool.current_quantity}</strong> {pool.unit}s
              </span>
            </div>

            <div className="space-y-3">
              {sortedTiers.map((tier: any, idx: number) => {
                const isReached = pool.current_quantity >= tier.min_qty;
                const tierPrice = parseFloat(pool.list_price) * (1 - tier.discount_pct / 100);

                return (
                  <div
                    key={idx}
                    className={`p-3.5 rounded-xl border transition flex items-center justify-between ${
                      isReached
                        ? 'bg-emerald-950/20 border-emerald-500/40 text-white'
                        : 'bg-navy-900/40 border-navy-800 text-navy-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                        isReached ? 'bg-emerald-500 text-navy-950' : 'bg-navy-800 text-navy-400'
                      }`}>
                        {idx + 1}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-white">
                          Reach {tier.min_qty} {pool.unit}s
                        </div>
                        <div className="text-xs text-navy-400">
                          Unit price drops to {formatINR(tierPrice)}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className={`text-sm font-bold px-2.5 py-1 rounded-lg ${
                        isReached ? 'bg-emerald-500/20 text-emerald-300' : 'bg-navy-800 text-navy-400'
                      }`}>
                        {tier.discount_pct}% OFF
                      </span>
                      {isReached && (
                        <div className="text-[10px] text-emerald-400 font-semibold mt-1">Unlocked!</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Members Pledged */}
          <div className="card p-6">
            <h2 className="text-base font-bold text-white mb-3 flex items-center gap-2">
              <Users className="w-4 h-4 text-amber-400" />
              Participating Retailers ({members.length})
            </h2>

            {members.length === 0 ? (
              <p className="text-xs text-navy-400 py-3">No retailers have pledged yet. Be the first!</p>
            ) : (
              <div className="divide-y divide-navy-800/80">
                {members.map((m: any) => (
                  <div key={m.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-semibold text-white">
                        {m.buyer_id === user?.id ? 'You' : (m.buyer_name || 'Retailer')}
                      </span>
                      {m.buyer_city && <span className="text-navy-400 ml-1.5 font-normal">({m.buyer_city})</span>}
                    </div>
                    <span className="text-amber-400 font-bold font-mono">
                      {m.quantity} {pool.unit}s
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Pledge / Action Card */}
        <div className="space-y-4">
          <div className="card p-6 border-amber-500/30 sticky top-20">
            <h3 className="text-lg font-bold text-white mb-1">Join this Group Deal</h3>
            <p className="text-xs text-navy-300 mb-4">
              Commit your units now. If the pool unlocks higher tiers before closing, your final order price automatically drops for everyone!
            </p>

            {myMembership ? (
              <div className="bg-emerald-950/30 border border-emerald-500/30 p-4 rounded-xl space-y-3">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                  <CheckCircle2 className="w-4 h-4" /> You're in this pool!
                </div>
                <div className="text-xs text-navy-200">
                  Your pledge: <strong className="text-white font-mono text-sm">{myMembership.quantity} {pool.unit}s</strong>
                </div>
                <div className="text-xs text-navy-300">
                  Estimated total: <strong className="text-amber-400">{formatINR(myMembership.quantity * currentPrice)}</strong>
                </div>

                {isPoolActive && (
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm('Withdraw your pledge from this pool?')) {
                        leaveMutation.mutate();
                      }
                    }}
                    disabled={leaveMutation.isPending}
                    className="btn-danger w-full text-xs py-2 flex items-center justify-center gap-1.5 mt-2"
                  >
                    <LogOut className="w-3.5 h-3.5" /> Withdraw Pledge
                  </button>
                )}
              </div>
            ) : !isAuthenticated ? (
              <div className="space-y-3">
                <p className="text-xs text-navy-400">Log in as a buyer to join this cooperative buying pool.</p>
                <Link to="/login" className="btn-primary w-full text-center block text-xs">
                  Login to Join Pool
                </Link>
              </div>
            ) : user?.role !== 'buyer' ? (
              <p className="text-xs text-navy-400 bg-navy-950 p-3 rounded-lg">
                Sellers cannot pledge in pools. Log in with a buyer account to participate.
              </p>
            ) : !isPoolActive ? (
              <p className="text-xs text-navy-400 bg-navy-950 p-3 rounded-lg">
                This pool is no longer accepting new pledges.
              </p>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (numericJoinQty <= 0) return toast.error('Enter valid quantity');
                  joinMutation.mutate(numericJoinQty);
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-xs font-medium text-navy-200 mb-1">
                    Your Desired Quantity ({pool.unit}s)
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    className="input-field"
                    placeholder="e.g. 25"
                    value={joinQty}
                    onChange={e => setJoinQty(e.target.value)}
                  />
                </div>

                {numericJoinQty > 0 && (
                  <div className="p-3 bg-navy-950 rounded-xl border border-navy-800 space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-navy-400">Unit Price:</span>
                      <span className="text-white">{formatINR(currentPrice)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-navy-400">Current Discount:</span>
                      <span className="text-emerald-400 font-semibold">{currentDiscount}% OFF</span>
                    </div>
                    <div className="flex justify-between font-bold pt-1 border-t border-navy-800">
                      <span className="text-white">Est. Total:</span>
                      <span className="text-amber-400">{formatINR(estimatedTotal)}</span>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={joinMutation.isPending}
                  className="btn-primary w-full text-xs py-2.5 flex items-center justify-center gap-1.5"
                >
                  <Users className="w-3.5 h-3.5" />
                  {joinMutation.isPending ? 'Pledging...' : 'Pledge & Join Pool'}
                </button>
              </form>
            )}

            <div className="mt-4 pt-4 border-t border-navy-800 text-[11px] text-navy-400 space-y-1.5">
              <div className="flex items-center gap-1.5 text-navy-300">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Zero Risk Guarantee
              </div>
              <p>When the timer expires, if MOQ is met, orders are automatically placed at the deepest unlocked tier discount.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
