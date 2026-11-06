import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingBag, User, Store } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../lib/api';
import { useAuthStore } from '../store/authStore';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    name: '', email: '', password: '', role: '' as 'buyer' | 'seller' | '',
    phone: '', business_name: '', city: '', state: '',
  });

  const handleRole = (role: 'buyer' | 'seller') => {
    setForm({ ...form, role });
    setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setLoading(true);
    try {
      const res = await api.post('/auth/register', form);
      login(res.data.user, res.data.token);
      toast.success('Account created! Welcome to WholesaleHub 🎉');
      navigate('/dashboard');
    } catch (err: any) {
      const apiErrors = err.response?.data?.errors;
      if (apiErrors) {
        const mapped: Record<string, string> = {};
        apiErrors.forEach((e: any) => { mapped[e.field] = e.message; });
        setErrors(mapped);
      } else {
        setErrors({ general: err.response?.data?.error || 'Registration failed' });
      }
    } finally {
      setLoading(false);
    }
  };

  const update = (field: string, value: string) => setForm(f => ({ ...f, [field]: value }));

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gradient-hero">
      <div className="w-full max-w-md animate-slide-up">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-400 to-orange-600 mb-4 shadow-xl shadow-orange-500/30">
            <ShoppingBag className="w-7 h-7 text-white" />
          </div>
          <h1 className="font-display text-3xl font-bold text-white">Create Account</h1>
          <p className="text-navy-400 mt-2">Join India's wholesale marketplace</p>
        </div>

        {/* Step 1: Choose role */}
        {step === 1 && (
          <div className="card p-6 animate-fade-in">
            <h2 className="text-white font-semibold text-center mb-6">I am a...</h2>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => handleRole('buyer')}
                className="card p-6 flex flex-col items-center gap-3 hover:border-blue-500/50 transition-all hover:-translate-y-0.5 cursor-pointer group"
              >
                <div className="w-14 h-14 rounded-2xl bg-blue-500/20 flex items-center justify-center group-hover:bg-blue-500/30 transition-colors">
                  <User className="w-7 h-7 text-blue-400" />
                </div>
                <div>
                  <p className="font-semibold text-white">Buyer</p>
                  <p className="text-xs text-navy-400 mt-1 text-center">Browse, negotiate & buy wholesale</p>
                </div>
              </button>
              <button
                onClick={() => handleRole('seller')}
                className="card p-6 flex flex-col items-center gap-3 hover:border-orange-500/50 transition-all hover:-translate-y-0.5 cursor-pointer group"
              >
                <div className="w-14 h-14 rounded-2xl bg-orange-500/20 flex items-center justify-center group-hover:bg-orange-500/30 transition-colors">
                  <Store className="w-7 h-7 text-orange-400" />
                </div>
                <div>
                  <p className="font-semibold text-white">Seller</p>
                  <p className="text-xs text-navy-400 mt-1 text-center">List products & receive bulk orders</p>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Registration form */}
        {step === 2 && (
          <div className="card p-6 animate-fade-in">
            <div className="flex items-center gap-2 mb-4">
              <button onClick={() => setStep(1)} className="text-navy-400 hover:text-white">
                ← 
              </button>
              <span className={`badge ${form.role === 'seller' ? 'badge-orange' : 'badge-blue'}`}>
                {form.role === 'seller' ? '🏪 Seller' : '👤 Buyer'}
              </span>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="input-label">Full Name *</label>
                <input className={`input ${errors.name ? 'input-error' : ''}`} placeholder="Ramesh Kumar" value={form.name} onChange={e => update('name', e.target.value)} required />
                {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name}</p>}
              </div>
              <div>
                <label className="input-label">Email *</label>
                <input type="email" className={`input ${errors.email ? 'input-error' : ''}`} placeholder="you@example.com" value={form.email} onChange={e => update('email', e.target.value)} required />
                {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email}</p>}
              </div>
              <div>
                <label className="input-label">Password * <span className="text-navy-500 text-xs">(min 8 chars, 1 uppercase, 1 number, 1 special)</span></label>
                <input type="password" className={`input ${errors.password ? 'input-error' : ''}`} placeholder="••••••••" value={form.password} onChange={e => update('password', e.target.value)} required autoComplete="new-password" />
                {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password}</p>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="input-label">Phone</label>
                  <input className="input" placeholder="9876543210" value={form.phone} onChange={e => update('phone', e.target.value)} />
                </div>
                <div>
                  <label className="input-label">City</label>
                  <input className="input" placeholder="Mumbai" value={form.city} onChange={e => update('city', e.target.value)} />
                </div>
              </div>
              {form.role === 'seller' && (
                <div>
                  <label className="input-label">Business Name</label>
                  <input className="input" placeholder="Your Business Name" value={form.business_name} onChange={e => update('business_name', e.target.value)} />
                </div>
              )}
              {errors.general && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">{errors.general}</div>
              )}
              <button type="submit" disabled={loading} className="btn-primary w-full btn-lg mt-2">
                {loading ? <span className="spinner" /> : 'Create Account'}
              </button>
            </form>
          </div>
        )}

        <p className="text-center text-navy-400 mt-6 text-sm">
          Already have an account?{' '}
          <Link to="/login" className="text-orange-400 hover:text-orange-300 font-medium">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
