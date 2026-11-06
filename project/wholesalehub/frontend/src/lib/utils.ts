// Format Indian Rupee
export const formatINR = (amount: number | string): string => {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(num);
};

// Format large numbers in Indian format
export const formatIndianNumber = (num: number): string => {
  return new Intl.NumberFormat('en-IN').format(num);
};

// Time remaining string
export const timeRemaining = (deadline: string | Date): string => {
  const now = new Date();
  const end = new Date(deadline);
  const diff = end.getTime() - now.getTime();
  if (diff <= 0) return 'Expired';
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (days > 0) return `${days}d ${hours}h remaining`;
  if (hours > 0) return `${hours}h ${minutes}m remaining`;
  return `${minutes}m remaining`;
};

// Format date
export const formatDate = (date: string | Date): string => {
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(date));
};

export const formatDateShort = (date: string | Date): string => {
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  }).format(new Date(date));
};

// Time ago
export const timeAgo = (date: string | Date): string => {
  const now = new Date();
  const past = new Date(date);
  const diff = now.getTime() - past.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 30) return `${days}d ago`;
  return formatDateShort(date);
};

// Get tier discount for current quantity
export const getTierDiscount = (
  tierConfig: { min_qty: number; discount_pct: number }[],
  quantity: number
): number => {
  const sorted = [...tierConfig].sort((a, b) => b.min_qty - a.min_qty);
  for (const tier of sorted) {
    if (quantity >= tier.min_qty) return tier.discount_pct;
  }
  return 0;
};

// Get next tier
export const getNextTier = (
  tierConfig: { min_qty: number; discount_pct: number }[],
  quantity: number
) => {
  const sorted = [...tierConfig].sort((a, b) => a.min_qty - b.min_qty);
  return sorted.find((t) => t.min_qty > quantity) || null;
};

// Compress image client-side
export const compressImage = async (
  file: File,
  maxWidth = 1200,
  quality = 0.8
): Promise<File> => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (width > maxWidth) {
        height = (height / width) * maxWidth;
        width = maxWidth;
      }
      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(new File([blob], file.name, { type: 'image/jpeg' }));
          } else {
            resolve(file);
          }
        },
        'image/jpeg',
        quality
      );
    };
    img.src = URL.createObjectURL(file);
  });
};

// Status badge styles
export const getStatusColor = (status: string): string => {
  const map: Record<string, string> = {
    placed: 'badge-blue',
    confirmed: 'badge-orange',
    shipped: 'badge-orange',
    delivered: 'badge-green',
    cancelled: 'badge-red',
    pending: 'badge-blue',
    accepted: 'badge-green',
    rejected: 'badge-red',
    countered: 'badge-orange',
    expired: 'badge-navy',
    active: 'badge-green',
    success: 'badge-green',
    failed: 'badge-red',
    closed: 'badge-navy',
  };
  return map[status] || 'badge-navy';
};

export const API_BASE = '/api';
