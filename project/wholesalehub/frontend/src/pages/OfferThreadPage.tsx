import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Clock, CheckCircle2, XCircle, Send, AlertTriangle, ShieldCheck, Tag } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../lib/api';
import { useAuthStore } from '../store/authStore';
import { getSocket } from '../lib/socket';
import { formatINR, formatRelativeTime } from '../lib/utils';

export default function OfferThreadPage() {
  const { offerId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  const [counterPrice, setCounterPrice] = useState('');
  const [counterQty, setCounterQty] = useState('');
  const [counterMsg, setCounterMsg] = useState('');
  const [isCountering, setIsCountering] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['offer-thread', offerId],
    queryFn: () => api.get(`/offers/${offerId}/thread`).then(r => r.data),
  });

  const thread = data?.thread || [];
  const product = data?.product;
  const latestOffer = thread[thread.length - 1];

  // Set default counter inputs from latest offer
  useEffect(() => {
    if (latestOffer) {
      setCounterPrice(String(latestOffer.price_per_unit || ''));
      setCounterQty(String(latestOffer.quantity || ''));
    }
  }, [latestOffer]);

  // Listen for socket offer updates
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleOfferUpdate = () => {
      refetch();
    };

    socket.on('offer:created', handleOfferUpdate);
    socket.on('offer:countered', handleOfferUpdate);
    socket.on('offer:responded', handleOfferUpdate);

    return () => {
      socket.off('offer:created', handleOfferUpdate);
      socket.off('offer:countered', handleOfferUpdate);
      socket.off('offer:responded', handleOfferUpdate);
    };
  }, [refetch]);

  const respondMutation = useMutation({
    mutationFn: (body: any) => api.post(`/offers/${latestOffer.id}/respond`, body),
    onSuccess: (res, vars) => {
      if (vars.action === 'accept') {
        toast.success('Offer accepted! Order has been auto-generated.');
        navigate('/orders');
      } else if (vars.action === 'reject') {
        toast.success('Offer rejected.');
        refetch();
      } else if (vars.action === 'counter') {
        toast.success('Counter proposal sent!');
        setIsCountering(false);
        refetch();
      }
      queryClient.invalidateQueries(['offers']);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Action failed');
    },
  });

  if (isLoading) {
    return (
      <div className="page-container max-w-3xl">
        <div className="skeleton h-96 rounded-2xl" />
      </div>
    );
  }

  if (!latestOffer) {
    return (
      <div className="page-container text-center py-16">
        <p className="text-navy-300">Negotiation thread not found or access denied.</p>
        <Link to="/offers" className="btn-primary mt-4 inline-flex">← Back to Offers</Link>
      </div>
    );
  }

  const isSeller = user?.role === 'seller';
  const isMyTurn =
    latestOffer.status === 'pending' &&
    ((isSeller && latestOffer.offered_by === 'buyer') ||
      (!isSeller && latestOffer.offered_by === 'seller'));

  const maxRoundsReached = (latestOffer.round_number || 1) >= 5;

  return (
    <div className="page-container max-w-3xl">
      <div className="mb-4 flex items-center justify-between">
        <Link to="/offers" className="inline-flex items-center gap-1.5 text-sm text-navy-300 hover:text-white transition">
          <ArrowLeft className="w-4 h-4" /> Back to All Offers
        </Link>
        <div className="flex items-center gap-2">
          <span className="text-xs text-navy-400">Round {latestOffer.round_number} of 5</span>
          <span className={`badge-${latestOffer.status === 'accepted' ? 'success' : latestOffer.status === 'rejected' ? 'danger' : 'warning'}`}>
            {latestOffer.status.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Product Summary Banner */}
      {product && (
        <div className="card p-4 mb-6 flex items-center gap-4 border-navy-800 bg-navy-900/60">
          <div className="w-14 h-14 rounded-xl overflow-hidden bg-navy-950 flex-shrink-0 border border-navy-800">
            {product.cover_image ? (
              <img src={product.cover_image} alt={product.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xl">📦</div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <Link to={`/products/${product.id}`} className="text-base font-semibold text-white hover:text-amber-400 truncate block">
              {product.name}
            </Link>
            <div className="flex items-center gap-3 text-xs text-navy-300 mt-1">
              <span>List Price: <strong className="text-white">{formatINR(product.list_price)}</strong>/{product.unit}</span>
              <span>•</span>
              <span>MOQ: <strong className="text-white">{product.moq} {product.unit}s</strong></span>
            </div>
          </div>
        </div>
      )}

      {/* Negotiation Thread Timeline */}
      <div className="space-y-4 mb-8">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-navy-300">Negotiation History</h2>

        {thread.map((item: any, idx: number) => {
          const isSenderMe =
            (item.offered_by === 'buyer' && !isSeller) ||
            (item.offered_by === 'seller' && isSeller);

          return (
            <div
              key={item.id}
              className={`p-4 sm:p-5 rounded-2xl border transition ${
                isSenderMe
                  ? 'bg-navy-900/40 border-navy-800 ml-4 sm:ml-12'
                  : 'bg-navy-950/80 border-navy-700/80 mr-4 sm:mr-12'
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                    isSenderMe ? 'bg-amber-500/20 text-amber-300' : 'bg-blue-500/20 text-blue-300'
                  }`}>
                    {isSenderMe ? 'You' : (item.offered_by === 'seller' ? item.seller_name : item.buyer_name)} ({item.offered_by})
                  </span>
                  <span className="text-xs text-navy-400 font-mono">Round #{item.round_number}</span>
                </div>
                <span className="text-[11px] text-navy-400">{formatRelativeTime(item.created_at)}</span>
              </div>

              <div className="grid grid-cols-3 gap-3 my-3 p-3 rounded-xl bg-navy-900/60 border border-navy-800 text-center">
                <div>
                  <div className="text-[10px] text-navy-400 uppercase">Offer Price</div>
                  <div className="text-base font-bold text-amber-400">{formatINR(item.price_per_unit)}</div>
                </div>
                <div>
                  <div className="text-[10px] text-navy-400 uppercase">Quantity</div>
                  <div className="text-base font-bold text-white">{item.quantity}</div>
                </div>
                <div>
                  <div className="text-[10px] text-navy-400 uppercase">Total Value</div>
                  <div className="text-base font-bold text-emerald-400">{formatINR(item.price_per_unit * item.quantity)}</div>
                </div>
              </div>

              {item.message && (
                <p className="text-sm text-navy-200 mt-2 bg-navy-900/30 p-2.5 rounded-lg border border-navy-800/60 italic">
                  "{item.message}"
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Action Area */}
      {latestOffer.status === 'pending' ? (
        isMyTurn ? (
          <div className="card p-6 border-amber-500/40 bg-navy-900/90 shadow-xl space-y-4">
            <div className="flex items-center gap-2 text-amber-400 font-semibold text-sm">
              <Clock className="w-4 h-4 animate-spin" />
              Action Required: Please respond to this proposal
            </div>

            {isCountering ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!counterPrice || parseFloat(counterPrice) <= 0) return toast.error('Valid price required');
                  if (!counterQty || parseInt(counterQty) < (product?.moq || 1)) {
                    return toast.error(`Quantity must be >= MOQ (${product?.moq || 1})`);
                  }
                  respondMutation.mutate({
                    action: 'counter',
                    price_per_unit: parseFloat(counterPrice),
                    quantity: parseInt(counterQty),
                    message: counterMsg,
                  });
                }}
                className="space-y-4 pt-2"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-navy-200 mb-1">
                      Your Counter Price (₹ / unit)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      className="input-field"
                      value={counterPrice}
                      onChange={e => setCounterPrice(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-navy-200 mb-1">
                      Quantity (Min: {product?.moq || 1})
                    </label>
                    <input
                      type="number"
                      min={product?.moq || 1}
                      required
                      className="input-field"
                      value={counterQty}
                      onChange={e => setCounterQty(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-navy-200 mb-1">Note / Counter Explanation</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="e.g. Best price considering freight costs and immediate dispatch..."
                    value={counterMsg}
                    onChange={e => setCounterMsg(e.target.value)}
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsCountering(false)}
                    className="btn-secondary text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={respondMutation.isPending}
                    className="btn-primary text-xs flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" /> Submit Counter Proposal
                  </button>
                </div>
              </form>
            ) : (
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => respondMutation.mutate({ action: 'accept' })}
                  disabled={respondMutation.isPending}
                  className="btn-success flex-1 min-w-[140px] flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" /> Accept & Create Order
                </button>

                {!maxRoundsReached ? (
                  <button
                    type="button"
                    onClick={() => setIsCountering(true)}
                    className="btn-primary flex-1 min-w-[140px] flex items-center justify-center gap-1.5"
                  >
                    <Tag className="w-4 h-4" /> Make Counter Offer
                  </button>
                ) : (
                  <div className="text-xs text-amber-400 font-medium px-2 py-1 bg-amber-500/10 rounded">
                    Max 5 rounds reached. Accept or Reject only.
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => respondMutation.mutate({ action: 'reject' })}
                  disabled={respondMutation.isPending}
                  className="btn-danger min-w-[100px] flex items-center justify-center gap-1.5"
                >
                  <XCircle className="w-4 h-4" /> Reject
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="card p-6 text-center border-navy-800 bg-navy-900/40">
            <Clock className="w-8 h-8 text-amber-400 mx-auto mb-2 animate-pulse" />
            <h4 className="text-white font-semibold">Waiting for other party to respond</h4>
            <p className="text-navy-300 text-xs mt-1">
              You will receive a notification as soon as a counter-proposal or decision is made.
            </p>
          </div>
        )
      ) : latestOffer.status === 'accepted' ? (
        <div className="card p-6 border-emerald-500/40 bg-emerald-950/20 text-center space-y-3">
          <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
          <h3 className="text-lg font-bold text-white">Deal Sealed!</h3>
          <p className="text-xs text-navy-300 max-w-md mx-auto">
            This negotiation was successfully accepted at {formatINR(latestOffer.price_per_unit)} / {product?.unit}. An official order has been generated.
          </p>
          <Link to="/orders" className="btn-primary inline-flex text-xs">
            View My Orders →
          </Link>
        </div>
      ) : (
        <div className="card p-6 border-red-500/40 bg-red-950/20 text-center">
          <XCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
          <h3 className="text-base font-semibold text-white">Negotiation Closed</h3>
          <p className="text-xs text-navy-400 mt-1">Status: {latestOffer.status.toUpperCase()}</p>
        </div>
      )}
    </div>
  );
}
