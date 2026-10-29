import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { ArrowLeft, Plus, Trash2, Sparkles, Info, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../lib/api';

export default function CreatePoolPage() {
  const navigate = useNavigate();

  const [productId, setProductId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [moq, setMoq] = useState('50');
  const [deadline, setDeadline] = useState('');
  const [tiers, setTiers] = useState<Array<{ min_qty: number; discount_pct: number }>>([
    { min_qty: 50, discount_pct: 5 },
    { min_qty: 150, discount_pct: 10 },
    { min_qty: 300, discount_pct: 15 },
  ]);

  const { data: dashboardData } = useQuery({
    queryKey: ['seller-dashboard'],
    queryFn: () => api.get('/dashboard/seller').then(r => r.data),
  });

  const products = dashboardData?.recent?.products || [];

  const addTier = () => {
    const last = tiers[tiers.length - 1];
    setTiers([...tiers, {
      min_qty: last ? last.min_qty * 2 : 100,
      discount_pct: last ? Math.min(50, last.discount_pct + 5) : 5,
    }]);
  };

  const removeTier = (idx: number) => {
    if (tiers.length <= 1) return toast.error('You need at least 1 discount tier');
    setTiers(tiers.filter((_, i) => i !== idx));
  };

  const updateTier = (idx: number, field: 'min_qty' | 'discount_pct', val: number) => {
    const next = [...tiers];
    next[idx][field] = val;
    setTiers(next);
  };

  const mutation = useMutation({
    mutationFn: (body: any) => api.post('/pools', body),
    onSuccess: (res) => {
      toast.success('Group buying pool launched successfully!');
      navigate(`/pools/${res.data.pool.id}`);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to launch pool');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!productId) return toast.error('Select a product');
    if (!title.trim()) return toast.error('Title is required');
    if (!deadline) return toast.error('Deadline is required');

    // Deadline must be in the future
    if (new Date(deadline) <= new Date()) {
      return toast.error('Deadline must be in the future');
    }

    // Sort tiers
    const sortedTiers = [...tiers].sort((a, b) => a.min_qty - b.min_qty);

    mutation.mutate({
      product_id: parseInt(productId),
      title,
      description,
      moq: parseInt(moq),
      deadline: new Date(deadline).toISOString(),
      tier_config: sortedTiers,
    });
  };

  return (
    <div className="page-container max-w-2xl">
      <div className="mb-6 flex items-center justify-between">
        <Link to="/pools" className="inline-flex items-center gap-1.5 text-sm text-navy-300 hover:text-white transition">
          <ArrowLeft className="w-4 h-4" /> Back to Pools
        </Link>
        <span className="badge-primary">Seller Portal</span>
      </div>

      <div className="card p-6 sm:p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold font-heading text-white">Launch Cooperative Group Pool</h1>
          <p className="text-navy-300 text-sm mt-1">
            Aggregate orders from dozens of small retail stores by offering stepped tiered volume discounts.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Select Product */}
          <div>
            <label className="block text-sm font-medium text-navy-200 mb-1.5">Select Wholesale Product *</label>
            <select
              required
              className="input-field"
              value={productId}
              onChange={e => setProductId(e.target.value)}
            >
              <option value="">Choose a product from your catalog</option>
              {products.map((p: any) => (
                <option key={p.id} value={p.id}>
                  {p.name} (Stock: {p.stock_quantity}) - List ₹{p.list_price}
                </option>
              ))}
            </select>
            {products.length === 0 && (
              <p className="text-xs text-amber-400 mt-1">
                You don't have any products listed yet. <Link to="/products/create" className="underline font-semibold">Create a product first</Link>.
              </p>
            )}
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-navy-200 mb-1.5">Campaign Pool Title *</label>
            <input
              type="text"
              required
              className="input-field"
              placeholder="e.g. Festival Bulk Cooking Oil Cooperative Buy"
              value={title}
              onChange={e => setTitle(e.target.value)}
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-navy-200 mb-1.5">Campaign Description</label>
            <textarea
              rows={3}
              className="input-field"
              placeholder="Explain delivery terms, guaranteed fulfillment, and packaging..."
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>

          {/* Target MOQ & Deadline */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-navy-200 mb-1.5">
                Minimum Pool Execution MOQ *
              </label>
              <input
                type="number"
                min="1"
                required
                className="input-field"
                placeholder="50"
                value={moq}
                onChange={e => setMoq(e.target.value)}
              />
              <span className="text-[11px] text-navy-400">Total volume needed across all buyers to execute deal</span>
            </div>
            <div>
              <label className="block text-sm font-medium text-navy-200 mb-1.5">Campaign Deadline *</label>
              <input
                type="datetime-local"
                required
                className="input-field"
                value={deadline}
                onChange={e => setDeadline(e.target.value)}
              />
            </div>
          </div>

          {/* Stepped Discount Tiers */}
          <div className="bg-navy-950/70 p-4 sm:p-5 rounded-xl border border-navy-800 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4" /> Volume Discount Tiers
                </h3>
                <p className="text-xs text-navy-400 mt-0.5">Define aggregate volume thresholds and corresponding discount %</p>
              </div>
              <button
                type="button"
                onClick={addTier}
                className="btn-secondary text-xs py-1 px-2.5 flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add Tier
              </button>
            </div>

            <div className="space-y-3">
              {tiers.map((t, idx) => (
                <div key={idx} className="flex items-center gap-3 bg-navy-900/60 p-3 rounded-lg border border-navy-800">
                  <div className="w-6 text-center text-xs font-bold text-navy-400">#{idx + 1}</div>
                  <div className="flex-1">
                    <label className="block text-[10px] text-navy-400 mb-1">Min Aggregate Units</label>
                    <input
                      type="number"
                      min="1"
                      className="input-field text-xs py-1.5"
                      value={t.min_qty}
                      onChange={e => updateTier(idx, 'min_qty', parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-[10px] text-navy-400 mb-1">Discount (%)</label>
                    <input
                      type="number"
                      min="1"
                      max="90"
                      className="input-field text-xs py-1.5"
                      value={t.discount_pct}
                      onChange={e => updateTier(idx, 'discount_pct', parseInt(e.target.value) || 0)}
                    />
                  </div>
                  {tiers.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeTier(idx)}
                      className="text-red-400 hover:text-red-300 p-1.5 mt-4 rounded transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-navy-800">
            <Link to="/pools" className="btn-secondary">Cancel</Link>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="btn-primary"
            >
              {mutation.isPending ? 'Launching Campaign...' : 'Launch Group Buying Pool'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
