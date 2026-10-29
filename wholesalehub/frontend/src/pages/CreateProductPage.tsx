import { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { ArrowLeft, Upload, X, Plus, Info, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../lib/api';

export default function CreateProductPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    name: '',
    brand: '',
    category_id: '',
    description: '',
    unit: 'piece',
    list_price: '',
    moq: '10',
    min_acceptable_price: '',
    stock_quantity: '100',
    is_negotiable: true,
    is_group_buy_enabled: false,
    tags: '',
  });

  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [coverIndex, setCoverIndex] = useState(0);

  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get('/products/categories').then(r => r.data),
  });
  const categories = categoriesData?.categories || [];

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    if (images.length + files.length > 5) {
      toast.error('You can upload up to 5 images maximum');
      return;
    }
    const newPreviews = files.map(f => URL.createObjectURL(f));
    setImages(prev => [...prev, ...files]);
    setPreviews(prev => [...prev, ...newPreviews]);
  };

  const removeImage = (idx: number) => {
    setImages(prev => prev.filter((_, i) => i !== idx));
    setPreviews(prev => {
      URL.revokeObjectURL(prev[idx]);
      return prev.filter((_, i) => i !== idx);
    });
    if (coverIndex >= idx && coverIndex > 0) {
      setCoverIndex(prev => prev - 1);
    }
  };

  const mutation = useMutation({
    mutationFn: async () => {
      const form = new FormData();
      Object.entries(formData).forEach(([k, v]) => {
        form.append(k, String(v));
      });
      form.append('cover_image_index', String(coverIndex));
      images.forEach(img => {
        form.append('images', img);
      });

      return api.post('/products', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },
    onSuccess: (res) => {
      toast.success('Product catalog listing created successfully!');
      navigate(`/products/${res.data.product.id}`);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to create product listing');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return toast.error('Product title is required');
    if (!formData.category_id) return toast.error('Please select a category');
    if (!formData.list_price || parseFloat(formData.list_price) <= 0) return toast.error('Valid list price is required');
    if (!formData.moq || parseInt(formData.moq) < 1) return toast.error('MOQ must be at least 1');
    if (!formData.min_acceptable_price || parseFloat(formData.min_acceptable_price) <= 0) {
      return toast.error('Floor price is required');
    }
    if (parseFloat(formData.min_acceptable_price) > parseFloat(formData.list_price)) {
      return toast.error('Floor price cannot exceed list price');
    }
    if (images.length === 0) {
      return toast.error('Please upload at least 1 product image');
    }
    mutation.mutate();
  };

  return (
    <div className="page-container max-w-3xl">
      <div className="mb-6 flex items-center justify-between">
        <Link to="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-navy-300 hover:text-white transition">
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>
        <span className="badge-primary">Seller Portal</span>
      </div>

      <div className="card p-6 sm:p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold font-heading text-white">Add New Wholesale Product</h1>
          <p className="text-navy-300 text-sm mt-1">
            List your bulk inventory for verified buyers and cooperative pooling.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Images Upload */}
          <div>
            <label className="block text-sm font-medium text-navy-200 mb-2">
              Product Images (Max 5, first or selected is cover)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {previews.map((src, idx) => (
                <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-navy-700 bg-navy-900 group">
                  <img src={src} alt="preview" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage(idx)}
                    className="absolute top-1.5 right-1.5 p-1 bg-red-600/80 hover:bg-red-600 text-white rounded-full transition"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setCoverIndex(idx)}
                    className={`absolute bottom-1.5 left-1.5 right-1.5 text-[10px] font-medium py-0.5 rounded text-center transition ${
                      coverIndex === idx ? 'bg-amber-500 text-navy-950 font-bold' : 'bg-navy-900/80 text-white hover:bg-navy-800'
                    }`}
                  >
                    {coverIndex === idx ? 'Cover Image' : 'Make Cover'}
                  </button>
                </div>
              ))}

              {images.length < 5 && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="aspect-square border-2 border-dashed border-navy-700 hover:border-amber-500 rounded-xl flex flex-col items-center justify-center p-3 text-navy-400 hover:text-amber-400 bg-navy-900/50 hover:bg-navy-900 transition"
                >
                  <Upload className="w-6 h-6 mb-1" />
                  <span className="text-xs font-medium">Upload Image</span>
                </button>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleImageSelect}
            />
          </div>

          {/* Title & Brand */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-navy-200 mb-1.5">Product Title *</label>
              <input
                type="text"
                required
                className="input-field"
                placeholder="e.g. Premium Basmati Rice 25kg Bag"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-navy-200 mb-1.5">Brand / Manufacturer</label>
              <input
                type="text"
                className="input-field"
                placeholder="e.g. Royal Harvest"
                value={formData.brand}
                onChange={e => setFormData({ ...formData, brand: e.target.value })}
              />
            </div>
          </div>

          {/* Category & Unit */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-navy-200 mb-1.5">Category *</label>
              <select
                required
                className="input-field"
                value={formData.category_id}
                onChange={e => setFormData({ ...formData, category_id: e.target.value })}
              >
                <option value="">Select Category</option>
                {categories.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-navy-200 mb-1.5">Unit of Measurement *</label>
              <select
                className="input-field"
                value={formData.unit}
                onChange={e => setFormData({ ...formData, unit: e.target.value })}
              >
                <option value="piece">Piece (pc)</option>
                <option value="kg">Kilogram (kg)</option>
                <option value="gram">Gram (g)</option>
                <option value="liter">Liter (L)</option>
                <option value="meter">Meter (m)</option>
                <option value="box">Box</option>
                <option value="carton">Carton</option>
                <option value="bag">Bag</option>
                <option value="set">Set</option>
                <option value="dozen">Dozen</option>
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-navy-200 mb-1.5">Description & Specifications</label>
            <textarea
              rows={4}
              className="input-field"
              placeholder="Detail specifications, packaging, grade, shelf life, and shipping terms..."
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          {/* Pricing & MOQ */}
          <div className="bg-navy-950/60 p-4 sm:p-5 rounded-xl border border-navy-800 space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <Info className="w-4 h-4" /> Wholesale Commercials
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-navy-300 mb-1">List Price (₹ / unit) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  className="input-field"
                  placeholder="e.g. 2400"
                  value={formData.list_price}
                  onChange={e => setFormData({ ...formData, list_price: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-navy-300 mb-1">
                  Floor Price (₹ / unit) *
                  <span className="text-[10px] text-amber-400 block">Confidential reserve</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  className="input-field"
                  placeholder="e.g. 2100"
                  value={formData.min_acceptable_price}
                  onChange={e => setFormData({ ...formData, min_acceptable_price: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-navy-300 mb-1">Min Order Qty (MOQ) *</label>
                <input
                  type="number"
                  min="1"
                  required
                  className="input-field"
                  placeholder="e.g. 10"
                  value={formData.moq}
                  onChange={e => setFormData({ ...formData, moq: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-medium text-navy-300 mb-1">Available Bulk Stock Qty *</label>
                <input
                  type="number"
                  min="0"
                  required
                  className="input-field"
                  placeholder="e.g. 500"
                  value={formData.stock_quantity}
                  onChange={e => setFormData({ ...formData, stock_quantity: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-navy-300 mb-1">Tags (comma separated)</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="basmati, organic, wholesale"
                  value={formData.tags}
                  onChange={e => setFormData({ ...formData, tags: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Switches */}
          <div className="space-y-3 pt-2">
            <label className="flex items-center gap-3 p-3.5 rounded-xl border border-navy-800 bg-navy-900/40 cursor-pointer hover:bg-navy-900 transition">
              <input
                type="checkbox"
                className="w-4 h-4 text-amber-500 rounded border-navy-700 bg-navy-950 focus:ring-amber-500"
                checked={formData.is_negotiable}
                onChange={e => setFormData({ ...formData, is_negotiable: e.target.checked })}
              />
              <div>
                <div className="text-sm font-medium text-white">Enable Price Negotiation</div>
                <div className="text-xs text-navy-400">Permit qualified buyers to submit bids down to your reserve floor price</div>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3.5 rounded-xl border border-navy-800 bg-navy-900/40 cursor-pointer hover:bg-navy-900 transition">
              <input
                type="checkbox"
                className="w-4 h-4 text-amber-500 rounded border-navy-700 bg-navy-950 focus:ring-amber-500"
                checked={formData.is_group_buy_enabled}
                onChange={e => setFormData({ ...formData, is_group_buy_enabled: e.target.checked })}
              />
              <div>
                <div className="text-sm font-medium text-white">Allow Group Buying Deals</div>
                <div className="text-xs text-navy-400">Enable cooperative pooling so small kiranas can combine quantities for tier discounts</div>
              </div>
            </label>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-navy-800">
            <Link to="/dashboard" className="btn-secondary">Cancel</Link>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="btn-primary"
            >
              {mutation.isPending ? 'Publishing Product...' : 'Publish Product to Wholesale Marketplace'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
