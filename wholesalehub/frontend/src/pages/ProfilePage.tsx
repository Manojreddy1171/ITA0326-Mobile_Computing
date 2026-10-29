import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { User, Building2, MapPin, Phone, Mail, ShieldCheck, Upload, LogOut, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../lib/api';
import { useAuthStore } from '../store/authStore';

export default function ProfilePage() {
  const { user, setUser, logout } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    business_name: '',
    gstin: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
  });

  const { data, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: () => api.get('/auth/profile').then(r => r.data),
  });

  useEffect(() => {
    if (data?.user) {
      const u = data.user;
      setFormData({
        name: u.name || '',
        phone: u.phone || '',
        business_name: u.business_name || '',
        gstin: u.gstin || '',
        address: u.address || '',
        city: u.city || '',
        state: u.state || '',
        pincode: u.pincode || '',
      });
    }
  }, [data]);

  const updateProfileMutation = useMutation({
    mutationFn: (body: any) => api.patch('/auth/profile', body),
    onSuccess: (res) => {
      toast.success('Business profile updated successfully!');
      setUser(res.data.user);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Profile update failed');
    },
  });

  const avatarMutation = useMutation({
    mutationFn: (file: File) => {
      const fd = new FormData();
      fd.append('avatar', file);
      return api.post('/auth/avatar', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },
    onSuccess: (res) => {
      toast.success('Profile avatar updated!');
      if (user) {
        setUser({ ...user, avatar_url: res.data.avatar_url });
      }
    },
    onError: () => toast.error('Avatar upload failed'),
  });

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      avatarMutation.mutate(e.target.files[0]);
    }
  };

  if (isLoading) {
    return (
      <div className="page-container max-w-2xl">
        <div className="skeleton h-96 rounded-2xl" />
      </div>
    );
  }

  const currentUser = data?.user || user;

  return (
    <div className="page-container max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-heading text-white">Business Profile</h1>
          <p className="text-navy-300 text-xs sm:text-sm mt-1">
            Manage your verified business credentials and contact parameters.
          </p>
        </div>
        <button
          onClick={logout}
          className="text-red-400 hover:text-red-300 text-xs flex items-center gap-1.5 p-2 rounded-lg hover:bg-red-950/40 transition"
        >
          <LogOut className="w-3.5 h-3.5" /> Logout
        </button>
      </div>

      {/* Profile Header Card */}
      <div className="card p-6 flex flex-col sm:flex-row items-center gap-5">
        <div className="relative group">
          <div className="w-20 h-20 rounded-full overflow-hidden bg-navy-800 border-2 border-amber-500/50 flex items-center justify-center text-2xl font-bold text-amber-400">
            {currentUser?.avatar_url ? (
              <img src={currentUser.avatar_url} alt="avatar" className="w-full h-full object-cover" />
            ) : (
              currentUser?.name?.charAt(0) || 'U'
            )}
          </div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="absolute bottom-0 right-0 p-1.5 bg-amber-500 hover:bg-amber-400 text-navy-950 rounded-full shadow-lg transition"
            title="Change Avatar"
          >
            <Upload className="w-3.5 h-3.5" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarSelect}
          />
        </div>

        <div className="text-center sm:text-left flex-1">
          <div className="flex items-center justify-center sm:justify-start gap-2">
            <h2 className="text-lg font-bold text-white">{currentUser?.name}</h2>
            <span className="badge-primary capitalize text-[10px]">{currentUser?.role}</span>
          </div>
          <p className="text-xs text-navy-300 mt-0.5">{currentUser?.email}</p>
          <div className="flex items-center justify-center sm:justify-start gap-3 text-xs text-navy-400 mt-2">
            <span className="flex items-center gap-1 text-emerald-400 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" /> Verified MSME
            </span>
            {currentUser?.business_name && (
              <span>• {currentUser.business_name}</span>
            )}
          </div>
        </div>
      </div>

      {/* Edit Form */}
      <div className="card p-6 sm:p-8">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            updateProfileMutation.mutate(formData);
          }}
          className="space-y-4"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-navy-200 mb-1">Full Contact Name *</label>
              <input
                type="text"
                required
                className="input-field"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-navy-200 mb-1">Mobile / WhatsApp Number</label>
              <input
                type="tel"
                className="input-field"
                placeholder="+91 98765 43210"
                value={formData.phone}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-navy-200 mb-1">Registered Business Name</label>
              <input
                type="text"
                className="input-field"
                placeholder="e.g. Balaji Kirana Stores"
                value={formData.business_name}
                onChange={e => setFormData({ ...formData, business_name: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-navy-200 mb-1">GSTIN / Udyam Reg. No.</label>
              <input
                type="text"
                className="input-field font-mono"
                placeholder="27AAAAA0000A1Z5"
                value={formData.gstin}
                onChange={e => setFormData({ ...formData, gstin: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-navy-200 mb-1">Warehouse / Shop Address</label>
            <input
              type="text"
              className="input-field"
              placeholder="Shop No. 12, APMC Market Yard"
              value={formData.address}
              onChange={e => setFormData({ ...formData, address: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-navy-200 mb-1">City</label>
              <input
                type="text"
                className="input-field"
                value={formData.city}
                onChange={e => setFormData({ ...formData, city: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-navy-200 mb-1">State</label>
              <input
                type="text"
                className="input-field"
                value={formData.state}
                onChange={e => setFormData({ ...formData, state: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-navy-200 mb-1">Pincode</label>
              <input
                type="text"
                className="input-field font-mono"
                value={formData.pincode}
                onChange={e => setFormData({ ...formData, pincode: e.target.value })}
              />
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <button
              type="submit"
              disabled={updateProfileMutation.isPending}
              className="btn-primary"
            >
              {updateProfileMutation.isPending ? 'Saving...' : 'Update Business Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
