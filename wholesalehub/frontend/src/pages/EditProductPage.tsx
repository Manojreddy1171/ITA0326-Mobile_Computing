import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Upload, X, Trash2, Info } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../lib/api';

export default function EditProductPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
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

  const [existingImages, setExistingImages] = useState<any[]>([]);
  const [newImages, setNewImages] = useState<File[]>([]);
  const [newPreviews, setNewPreviews] = useState<string[]>([]);

  const { data: productData, isLoading } = useQuery({
    queryKey: ['product', id],
    queryFn: () => api.get(`/products/${id}`).then(r => r.data),
  });

  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get('/products/categories').then(r => r.data),
  });
  const categories = categoriesData?.categories || [];

  useEffect(() => {
    if (productData?.product) {
      const p = productData.product;
      setFormData({
        name: p.name || '',
        brand: p.brand || '',
        category_id: String(p.category_id || ''),
        description: p.description || '',
        unit: p.unit || 'piece',
        list_price: String(p.list_price || ''),
        moq: String(p.moq || '10'),
        min_acceptable_price: String(p.min_acceptable_price || p.list_price || ''),
        stock_quantity: String(p.stock_quantity || '0'),
        is_negotiable: Boolean(p.is_negotiable),
        is_group_buy_enabled: Boolean(p.is_group_buy_enabled),
        tags: p.tags || '',
      });
      setExistingImages(productData.images || []);
    }
  }, [productData]);

  const handleNewImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    if (existingImages.length + newImages.length + files.length > 5) {
      toast.error('Maximum 5 images total');
      return;
    }
    const previews = files.map(f => URL.createObjectURL(f));
    setNewImages(prev => [...prev, ...files]);
    setNewPreviews(prev => [...prev, ...previews]);
  };

  const removeExistingImage = async (imgId: number) => {
    try {
      await api.delete(`/products/${id}/images/${imgId}`);
      setExistingImages(prev => prev.filter(img => img.id !== imgId));
      toast.success('Image removed');
    } catch (err: any) {
      toast.error('Failed to remove image');
    }
  };

  const removeNewImage = (idx: number) => {
    setNewImages(prev => prev.filter((_, i) => i !== idx));
    setNewPreviews(prev => {
      URL.revokeObjectURL(prev[idx]);
      return prev.filter((_, i) => i !== idx);
    });
  };

  const mutation = useMutation({
    mutationFn: async () => {
      const form = new FormData();
      Object.entries(formData).forEach(([k, v]) => {
        form.append(k, String(v));
      });
      newImages.forEach(img => {
        form.append('images', img);
      });

      return api.patch(`/products/${id}`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },
    onSuccess: () => {
      toast.success('Product updated successfully!');
      queryClient.invalidateQueries(['product', id]);
      navigate(`/products/${id}`);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to update product');
    },
  });

  const deleteProductMutation = useMutation({
    mutationFn: () => api.delete(`/products/${id}`),
    onSuccess: () => {
      toast.success('Product archived');
      navigate('/dashboard');
    },
    onError: () => toast.error('Failed to archive product'),
  });

  if (isLoading) {
    return (
      <div className="page-container max-w-3xl">
        <div className="skeleton h-96 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="page-container max-w-3xl">
      <div className="mb-6 flex items-center justify-between">
        <Link to={`/products/${id}`} className="inline-flex items-center gap-1.5 text-sm text-navy-300 hover:text-white transition">
          <ArrowLeft className="w-4 h-4" /> Back to Product
        </Link>
        <button
          type="button"
          onClick={() => {
            if (confirm('Are you sure you want to archive this product? It will no longer be visible on the marketplace.')) {
              deleteProductMutation.mutate();
            }
          }}
          className="text-red-400 hover:text-red-300 text-xs flex items-center gap-1 p-2 rounded-lg hover:bg-red-950/40 transition"
        >
          <Trash2 className="w-3.5 h-3.5" /> Archive Listing
        </button>
      </div>

      <div className="card p-6 sm:p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold font-heading text-white">Edit Wholesale Product</h1>
          <p className="text-navy-300 text-sm mt-1">Update pricing, bulk stock availability, and commercial parameters.</p>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }} className="space-y-6">
          {/* Images */}
          <div>
            <label className="block text-sm font-medium text-navy-200 mb-2">Product Images</label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {existingImages.map((img) => (
                <div key={img.id} className="relative aspect-square rounded-xl overflow-hidden border border-navy-700 bg-navy-900 group">
                  <img src={img.url} alt="product" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeExistingImage(img.id)}
                    className="absolute top-1.5 right-1.5 p-1 bg-red-600/80 hover:bg-red-600 text-white rounded-full transition"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}

              {newPreviews.map((src, idx) => (
                <div key={`new-${idx}`} className="relative aspect-square rounded-xl overflow-hidden border border-amber-500/50 bg-navy-900 group">
                  <img src={src} alt="new-preview" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeNewImage(idx)}
                    className="absolute top-1.5 right-1.5 p-1 bg-red-600/80 hover:bg-red-600 text-white rounded-full transition"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                  <span className="absolute bottom-1.5 left-1.5 right-1.5 text-[10px] bg-amber-500/80 text-navy-950 font-bold py-0.5 rounded text-center">New</span>
                </div>
              ))}

              {existingImages.length + newImages.length < 5 && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="aspect-square border-2 border-dashed border-navy-700 hover:border-amber-500 rounded-xl flex flex-col items-center justify-center p-3 text-navy-400 hover:text-amber-400 bg-navy-900/50 hover:bg-navy-900 transition"
                >
                  <Upload className="w-6 h-6 mb-1" />
                  <span className="text-xs font-medium">Add Image</span>
                </button>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleNewImageSelect}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-navy-200 mb-1.5">Product Title</label>
              <input
                type="text"
                required
                className="input-field"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-navy-200 mb-1.5">Brand / Manufacturer</label>
              <input
                type="text"
                className="input-field"
                value={formData.brand}
                onChange={e => setFormData({ ...formData, brand: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-navy-200 mb-1.5">Category</label>
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
              <label className="block text-sm font-medium text-navy-200 mb-1.5">Unit</label>
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

          <div>
            <label className="block text-sm font-medium text-navy-200 mb-1.5">Description</label>
            <textarea
              rows={4}
              className="input-field"
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div className="bg-navy-950/60 p-4 sm:p-5 rounded-xl border border-navy-800 space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <Info className="w-4 h-4" /> Wholesale Commercials
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-navy-300 mb-1">List Price (₹ / unit)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  className="input-field"
                  value={formData.list_price}
                  onChange={e => setFormData({ ...formData, list_price: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-navy-300 mb-1">Floor Price (₹ / unit)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  className="input-field"
                  value={formData.min_acceptable_price}
                  onChange={e => setFormData({ ...formData, min_acceptable_price: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-navy-300 mb-1">MOQ</label>
                <input
                  type="number"
                  min="1"
                  required
                  className="input-field"
                  value={formData.moq}
                  onChange={e => setFormData({ ...formData, moq: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-medium text-navy-300 mb-1">Available Stock Qty</label>
                <input
                  type="number"
                  min="0"
                  required
                  className="input-field"
                  value={formData.stock_quantity}
                  onChange={e => setFormData({ ...formData, stock_quantity: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-navy-300 mb-1">Tags</label>
                <input
                  type="text"
                  className="input-field"
                  value={formData.tags}
                  onChange={e => setFormData({ ...formData, tags: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <label className="flex items-center gap-3 p-3.5 rounded-xl border border-navy-800 bg-navy-900/40 cursor-pointer">
              <input
                type="checkbox"
                className="w-4 h-4 text-amber-500 rounded border-navy-700 bg-navy-950"
                checked={formData.is_negotiable}
                onChange={e => setFormData({ ...formData, is_negotiable: e.target.checked })}
              />
              <div>
                <div className="text-sm font-medium text-white">Enable Price Negotiation</div>
                <div className="text-xs text-navy-400">Buyers can submit custom wholesale bids</div>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3.5 rounded-xl border border-navy-800 bg-navy-900/40 cursor-pointer">
              <input
                type="checkbox"
                className="w-4 h-4 text-amber-500 rounded border-navy-700 bg-navy-950"
                checked={formData.is_group_buy_enabled}
                onChange={e => setFormData({ ...formData, is_group_buy_enabled: e.target.checked })}
              />
              <div>
                <div className="text-sm font-medium text-white">Allow Group Buying Deals</div>
                <div className="text-xs text-navy-400">Enable cooperative pooling across multiple small retail stores</div>
              </div>
            </label>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-navy-800">
            <Link to={`/products/${id}`} className="btn-secondary">Cancel</Link>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="btn-primary"
            >
              {mutation.isPending ? 'Saving Changes...' : 'Save Product Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
