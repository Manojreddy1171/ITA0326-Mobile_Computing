import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, Package, Tag, Users, Star, ChevronRight, ZoomIn } from 'lucide-react';
import toast from 'react-hot-toast';
import Lightbox from 'yet-another-react-lightbox';
import 'yet-another-react-lightbox/styles.css';
import api from '../lib/api';
import { useAuthStore } from '../store/authStore';
import { formatINR, timeRemaining, getTierDiscount, getNextTier } from '../lib/utils';

export default function ProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, isAuthenticated } = useAuthStore();
  const [activeImg, setActiveImg] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIdx, setLightboxIdx] = useState(0);
  const [offerForm, setOfferForm] = useState({ price_per_unit: '', quantity: '', message: '' });
  const [showOfferForm, setShowOfferForm] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['product', id],
    queryFn: () => api.get(`/products/${id}`).then(r => r.data),
  });

  const offerMutation = useMutation({
    mutationFn: (data: any) => api.post('/offers', data),
    onSuccess: () => {
      toast.success('Offer sent!');
      setShowOfferForm(false);
      queryClient.invalidateQueries(['offers']);
    },
    onError: (err: any) => toast.error(err.response?.data?.error || 'Failed to send offer'),
  });

  const joinPoolMutation = useMutation({
    mutationFn: ({ poolId, quantity }: any) => api.post(`/pools/${poolId}/join`, { quantity }),
    onSuccess: () => {
      toast.success('Joined group pool!');
      queryClient.invalidateQueries(['product', id]);
    },
    onError: (err: any) => toast.error(err.response?.data?.error || 'Failed to join pool'),
  });

  if (isLoading) return (
    <div className="page-container">
      <div className="skeleton h-96 rounded-2xl mb-4" />
      <div className="space-y-3"><div className="skeleton h-8 w-2/3 rounded" /><div className="skeleton h-6 w-1/3 rounded" /></div>
    </div>
  );

  if (!data?.product) return (
    <div className="page-container text-center py-16">
      <div className="text-5xl mb-4">📦</div>
      <p className="text-navy-300">Product not found</p>
      <Link to="/" className="btn-primary mt-4 inline-flex">← Back to Home</Link>
    </div>
  );

  const { product, images, pool } = data;
  const imgList = images.length > 0 ? images : [{ url: `https://picsum.photos/seed/${product.id}/800/600`, id: 0 }];
  const isSeller = user?.id === product.seller_id;
  const isMyProduct = isSeller;

  const tierConfig = pool ? (typeof pool.tier_config === 'string' ? JSON.parse(pool.tier_config) : pool.tier_config) : [];
  const currentDiscount = pool ? getTierDiscount(tierConfig, pool.current_quantity) : 0;
  const nextTier = pool ? getNextTier(tierConfig, pool.current_quantity) : null;
  const maxTier = tierConfig.length > 0 ? tierConfig.reduce((a: any, b: any) => b.min_qty > a.min_qty ? b : a, tierConfig[0]) : null;
  const poolProgress = maxTier ? Math.min(100, (pool?.current_quantity / maxTier.min_qty) * 100) : 0;

  return (
    <div className="page-container max-w-4xl">
      {/* Back button */}
      <button onClick={() => navigate(-1)} className="btn-ghost btn-sm mb-4">
        <ChevronLeft className="w-4 h-4" /> Back
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Image gallery */}
        <div>
          <div
            className="relative aspect-[4/3] rounded-2xl overflow-hidden cursor-zoom-in img-zoom mb-3"
            onClick={() => { setLightboxIdx(activeImg); setLightboxOpen(true); }}
          >
            <img
              src={imgList[activeImg]?.url?.startsWith('/uploads') ? imgList[activeImg].url : `https://picsum.photos/seed/${product.id + activeImg * 10}/800/600`}
              alt={product.name}
              className="w-full h-full object-cover"
              onError={(e) => { (e.target as HTMLImageElement).src = `https://picsum.photos/seed/${product.id}/800/600`; }}
            />
            <div className="absolute top-3 right-3 flex gap-1">
              {product.is_negotiable && <span className="badge badge-orange"><Tag className="w-3 h-3" /> Negotiable</span>}
              {product.is_group_buy_enabled && <span className="badge badge-blue"><Users className="w-3 h-3" /> Group Deal</span>}
            </div>
            <button className="absolute bottom-3 right-3 btn-ghost btn-sm bg-black/50">
              <ZoomIn className="w-4 h-4" /> Zoom
            </button>
          </div>

          {/* Thumbnails */}
          {imgList.length > 1 && (
            <div className="flex gap-2 overflow-x-auto scrollbar-hide">
              {imgList.map((img: any, idx: number) => (
                <button
                  key={img.id}
                  onClick={() => setActiveImg(idx)}
                  className={`shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-all ${activeImg === idx ? 'border-orange-500' : 'border-navy-700 hover:border-navy-500'}`}
                >
                  <img
                    src={img.url?.startsWith('/uploads') ? img.url : `https://picsum.photos/seed/${product.id + idx * 10}/160/160`}
                    alt=""
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).src = `https://picsum.photos/seed/${product.id + idx * 10}/160/160`; }}
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product info */}
        <div className="space-y-4">
          {/* Category & brand */}
          <div className="flex items-center gap-2">
            <span className="badge badge-navy">{product.category_name}</span>
            {product.brand && <span className="text-navy-400 text-sm">{product.brand}</span>}
          </div>

          {/* Name */}
          <h1 className="font-display text-2xl font-bold text-white">{product.name}</h1>

          {/* Price */}
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-display font-bold text-orange-400">
              {formatINR(product.list_price)}
            </span>
            <span className="text-navy-400">/{product.unit}</span>
          </div>

          {/* MOQ and Stock */}
          <div className="flex gap-4">
            <div className="card-glass px-4 py-2 text-center">
              <p className="text-xs text-navy-400">Min Order</p>
              <p className="font-bold text-white">{product.moq} {product.unit}s</p>
            </div>
            <div className="card-glass px-4 py-2 text-center">
              <p className="text-xs text-navy-400">In Stock</p>
              <p className="font-bold text-white">{product.stock_quantity.toLocaleString('en-IN')}</p>
            </div>
          </div>

          {/* Seller info */}
          <div className="card p-3 flex items-center gap-3">
            {product.seller_avatar ? (
              <img src={product.seller_avatar} alt="" className="w-10 h-10 rounded-xl object-cover" />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-navy-700 flex items-center justify-center text-lg">🏪</div>
            )}
            <div>
              <p className="text-sm font-semibold text-white">{product.seller_business || product.seller_name}</p>
              <p className="text-xs text-navy-400">📍 {product.seller_city}, {product.seller_state}</p>
            </div>
          </div>

          {/* Description */}
          {product.description && (
            <div>
              <h3 className="text-sm font-semibold text-navy-300 mb-1">Product Details</h3>
              <p className="text-sm text-navy-300 leading-relaxed">{product.description}</p>
            </div>
          )}

          {/* Action buttons */}
          {!isMyProduct && isAuthenticated && user?.role === 'buyer' && (
            <div className="space-y-2 pt-2">
              {product.is_negotiable && (
                <button
                  onClick={() => setShowOfferForm(!showOfferForm)}
                  className="btn-primary w-full btn-lg"
                >
                  <Tag className="w-5 h-5" />
                  {showOfferForm ? 'Cancel Offer' : 'Make an Offer'}
                </button>
              )}
            </div>
          )}

          {!isAuthenticated && (
            <Link to="/register" className="btn-primary w-full btn-lg block text-center">
              Join to Negotiate & Buy
            </Link>
          )}

          {isMyProduct && (
            <Link to={`/products/${product.id}/edit`} className="btn-secondary w-full btn-lg block text-center">
              ✏️ Edit Product
            </Link>
          )}
        </div>
      </div>

      {/* Offer form */}
      {showOfferForm && (
        <div className="card p-5 mt-6 animate-slide-up">
          <h3 className="font-display text-lg font-bold text-white mb-4">📝 Make Your Offer</h3>
          <form onSubmit={(e) => {
            e.preventDefault();
            offerMutation.mutate({
              product_id: product.id,
              price_per_unit: parseFloat(offerForm.price_per_unit),
              quantity: parseInt(offerForm.quantity),
              message: offerForm.message,
            });
          }} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="input-label">Your Price / {product.unit} (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  max={product.list_price}
                  className="input"
                  placeholder={String(product.list_price)}
                  value={offerForm.price_per_unit}
                  onChange={e => setOfferForm({ ...offerForm, price_per_unit: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="input-label">Quantity (min {product.moq})</label>
                <input
                  type="number"
                  min={product.moq}
                  className="input"
                  placeholder={String(product.moq)}
                  value={offerForm.quantity}
                  onChange={e => setOfferForm({ ...offerForm, quantity: e.target.value })}
                  required
                />
              </div>
            </div>
            {offerForm.price_per_unit && offerForm.quantity && (
              <div className="card-glass p-3 text-sm">
                <span className="text-navy-400">Total: </span>
                <span className="text-orange-400 font-bold">
                  {formatINR(parseFloat(offerForm.price_per_unit) * parseInt(offerForm.quantity) || 0)}
                </span>
                <span className="text-navy-500 ml-2">
                  ({((1 - parseFloat(offerForm.price_per_unit) / product.list_price) * 100).toFixed(1)}% off list price)
                </span>
              </div>
            )}
            <div>
              <label className="input-label">Message (optional)</label>
              <textarea
                className="input resize-none"
                rows={2}
                placeholder="e.g. Can you give a better rate for regular orders?"
                value={offerForm.message}
                onChange={e => setOfferForm({ ...offerForm, message: e.target.value })}
              />
            </div>
            <div className="flex gap-3">
              <button type="submit" disabled={offerMutation.isLoading} className="btn-primary flex-1">
                {offerMutation.isLoading ? <span className="spinner" /> : '📤 Send Offer'}
              </button>
              <button type="button" onClick={() => setShowOfferForm(false)} className="btn-secondary">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Group Pool Section */}
      {pool && (
        <div className="card p-5 mt-6 border-orange-500/20">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-orange-400" />
            <h3 className="font-display text-lg font-bold text-white">Group Deal Active</h3>
            <span className="badge badge-orange">{timeRemaining(pool.deadline)}</span>
          </div>

          <h4 className="font-semibold text-white mb-1">{pool.title}</h4>
          {pool.description && <p className="text-sm text-navy-400 mb-4">{pool.description}</p>}

          {/* Tier tiers */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            {tierConfig.map((tier: any, i: number) => (
              <div key={i} className={`card-glass p-3 text-center rounded-xl border ${pool.current_quantity >= tier.min_qty ? 'border-orange-500/50 bg-orange-500/10' : 'border-navy-700'}`}>
                <p className="text-lg font-bold text-orange-400">{tier.discount_pct}% off</p>
                <p className="text-xs text-navy-400">{tier.min_qty}+ units</p>
              </div>
            ))}
          </div>

          {/* Progress */}
          <div className="mb-3">
            <div className="flex justify-between text-xs text-navy-400 mb-1">
              <span>{pool.current_quantity} units joined</span>
              {nextTier && <span>Next tier: {nextTier.min_qty} units ({nextTier.min_qty - pool.current_quantity} more needed)</span>}
            </div>
            <div className="progress-bar h-3">
              <div className="progress-fill pool-progress-glow" style={{ width: `${poolProgress}%` }} />
            </div>
            {currentDiscount > 0 && (
              <p className="text-sm text-orange-400 font-medium mt-1">
                🎉 Current price: {formatINR(product.list_price * (1 - currentDiscount / 100))} ({currentDiscount}% off)
              </p>
            )}
          </div>

          {!isMyProduct && isAuthenticated && user?.role === 'buyer' && (
            <div className="flex gap-3 mt-4">
              <input
                type="number"
                min={pool.moq}
                className="input w-28"
                placeholder={`Min ${pool.moq}`}
                id="pool-qty"
              />
              <button
                onClick={() => {
                  const qty = parseInt((document.getElementById('pool-qty') as HTMLInputElement)?.value);
                  if (!qty || qty < pool.moq) {
                    toast.error(`Minimum quantity is ${pool.moq}`);
                    return;
                  }
                  joinPoolMutation.mutate({ poolId: pool.id, quantity: qty });
                }}
                className="btn-primary flex-1"
                disabled={joinPoolMutation.isLoading}
              >
                {joinPoolMutation.isLoading ? <span className="spinner" /> : <><Users className="w-4 h-4" /> Join Pool</>}
              </button>
              <Link to={`/pools/${pool.id}`} className="btn-secondary btn-sm">
                Details <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Lightbox */}
      <Lightbox
        open={lightboxOpen}
        close={() => setLightboxOpen(false)}
        index={lightboxIdx}
        slides={imgList.map((img: any, idx: number) => ({
          src: img.url?.startsWith('/uploads') ? img.url : `https://picsum.photos/seed/${product.id + idx * 10}/1200/900`,
        }))}
      />
    </div>
  );
}
