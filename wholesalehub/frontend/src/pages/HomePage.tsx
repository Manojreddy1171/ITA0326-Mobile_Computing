import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, SlidersHorizontal, Tag, Users, ChevronRight, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import ProductCard from '../components/ProductCard';
import { useAuthStore } from '../store/authStore';

const CATEGORIES = [
  { slug: '', icon: '🏪', label: 'All' },
  { slug: 'grocery', icon: '🛒', label: 'Grocery' },
  { slug: 'fmcg', icon: '🧴', label: 'FMCG' },
  { slug: 'apparel', icon: '👕', label: 'Apparel' },
  { slug: 'electronics', icon: '📱', label: 'Electronics' },
  { slug: 'kitchenware', icon: '🍳', label: 'Kitchen' },
  { slug: 'personal-care', icon: '🧼', label: 'Personal Care' },
  { slug: 'stationery', icon: '📝', label: 'Stationery' },
  { slug: 'agri', icon: '🌾', label: 'Agri' },
];

const SORTS = [
  { value: 'created_at', label: 'Latest' },
  { value: 'price', label: 'Price: Low' },
  { value: 'price&order=desc', label: 'Price: High' },
  { value: 'name', label: 'Name' },
];

export default function HomePage() {
  const { isAuthenticated, user } = useAuthStore();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [sort, setSort] = useState('created_at');
  const [negotiable, setNegotiable] = useState(false);
  const [groupBuy, setGroupBuy] = useState(false);
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['products', search, category, sort, negotiable, groupBuy, page],
    queryFn: () => {
      const params = new URLSearchParams({
        search, category, page: String(page), limit: '20',
        ...(sort.includes('&') ? { sort: sort.split('&')[0], order: 'desc' } : { sort }),
        ...(negotiable && { negotiable: 'true' }),
        ...(groupBuy && { group_buy: 'true' }),
      });
      return api.get(`/products?${params}`).then(r => r.data);
    },
    keepPreviousData: true,
  });

  const { data: poolsData } = useQuery({
    queryKey: ['pools', 'active'],
    queryFn: () => api.get('/pools?status=active&limit=3').then(r => r.data),
  });

  const products = data?.products || [];
  const pagination = data?.pagination;
  const activePools = poolsData?.pools || [];

  return (
    <div className="min-h-screen bg-gradient-hero">
      {/* Hero Section */}
      <section className="px-4 pt-8 pb-6 max-w-7xl mx-auto">
        {!isAuthenticated ? (
          <div className="text-center mb-8 animate-fade-in">
            <div className="inline-flex items-center gap-2 badge badge-orange mb-4 text-sm px-3 py-1">
              🇮🇳 India's #1 B2B Wholesale Marketplace
            </div>
            <h1 className="font-display text-4xl sm:text-5xl font-bold text-white mb-4 text-balance">
              Buy & Sell Wholesale
              <span className="block gradient-text mt-1">Smarter Together</span>
            </h1>
            <p className="text-navy-300 text-lg mb-6 max-w-2xl mx-auto text-balance">
              Negotiate prices, join group deals, and grow your MSME business with direct access to manufacturers and distributors.
            </p>
            <div className="flex gap-3 justify-center flex-wrap">
              <Link to="/register" className="btn-primary btn-lg">
                Start Free — Join as Buyer or Seller
              </Link>
              <Link to="/pools" className="btn-secondary btn-lg">
                <Users className="w-5 h-5" /> View Group Deals
              </Link>
            </div>
          </div>
        ) : (
          <div className="mb-6 animate-fade-in">
            <h1 className="font-display text-2xl font-bold text-white">
              Welcome back, <span className="text-orange-400">{user?.name?.split(' ')[0]}</span> 👋
            </h1>
            <p className="text-navy-400 text-sm mt-1">
              {user?.role === 'seller' ? 'Manage your products and orders' : 'Discover the best wholesale deals'}
            </p>
          </div>
        )}

        {/* Search bar */}
        <div className="relative max-w-2xl mx-auto mb-4">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-navy-400" />
          <input
            type="search"
            placeholder="Search products, brands, categories..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="input pl-12 pr-14 text-base h-12 rounded-2xl bg-navy-900"
          />
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-colors ${showFilters ? 'bg-orange-500 text-white' : 'text-navy-400 hover:text-white'}`}
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
        </div>

        {/* Filter chips */}
        {showFilters && (
          <div className="flex flex-wrap gap-2 mb-4 animate-slide-down">
            <button
              onClick={() => { setNegotiable(!negotiable); setPage(1); }}
              className={`badge cursor-pointer text-sm py-1.5 px-3 ${negotiable ? 'badge-orange' : 'badge-navy'}`}
            >
              <Tag className="w-3 h-3" /> Negotiable
            </button>
            <button
              onClick={() => { setGroupBuy(!groupBuy); setPage(1); }}
              className={`badge cursor-pointer text-sm py-1.5 px-3 ${groupBuy ? 'badge-blue' : 'badge-navy'}`}
            >
              <Users className="w-3 h-3" /> Group Deals
            </button>
            <select
              value={sort}
              onChange={e => { setSort(e.target.value); setPage(1); }}
              className="badge badge-navy cursor-pointer text-sm py-1.5 px-3 bg-navy-700 border-navy-600"
            >
              {SORTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
            {(search || category || negotiable || groupBuy) && (
              <button
                onClick={() => { setSearch(''); setCategory(''); setNegotiable(false); setGroupBuy(false); setPage(1); }}
                className="badge badge-red cursor-pointer text-sm py-1.5 px-3"
              >
                <X className="w-3 h-3" /> Clear
              </button>
            )}
          </div>
        )}

        {/* Category pills */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2 -mx-4 px-4">
          {CATEGORIES.map(cat => (
            <button
              key={cat.slug}
              onClick={() => { setCategory(cat.slug); setPage(1); }}
              className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                category === cat.slug
                  ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30'
                  : 'bg-navy-800 text-navy-300 hover:bg-navy-700 hover:text-white border border-navy-700'
              }`}
            >
              <span>{cat.icon}</span>
              <span>{cat.label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Active Group Pools Banner */}
      {activePools.length > 0 && (
        <section className="px-4 mb-6 max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-3">
            <h2 className="section-title mb-0">🔥 Active Group Deals</h2>
            <Link to="/pools" className="text-orange-400 text-sm flex items-center gap-1 hover:text-orange-300">
              View all <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {activePools.map((pool: any) => {
              const tiers = typeof pool.tier_config === 'string' ? JSON.parse(pool.tier_config) : pool.tier_config;
              const maxTier = tiers.reduce((a: any, b: any) => b.min_qty > a.min_qty ? b : a, tiers[0]);
              const progress = Math.min(100, (pool.current_quantity / maxTier.min_qty) * 100);
              const currentTier = [...tiers].sort((a: any, b: any) => b.min_qty - a.min_qty).find((t: any) => pool.current_quantity >= t.min_qty);
              const currentDiscount = currentTier?.discount_pct || 0;

              return (
                <Link key={pool.id} to={`/pools/${pool.id}`} className="card p-4 hover:border-orange-500/40 transition-all hover:-translate-y-0.5 group">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-navy-400 mb-0.5">{pool.product_name}</p>
                      <h3 className="text-sm font-semibold text-white line-clamp-1 group-hover:text-orange-300 transition-colors">
                        {pool.title}
                      </h3>
                    </div>
                    <span className="badge badge-orange text-xs ml-2 shrink-0">
                      {currentDiscount > 0 ? `-${currentDiscount}%` : 'Join'}
                    </span>
                  </div>
                  <div className="progress-bar mb-1">
                    <div className="progress-fill" style={{ width: `${progress}%` }} />
                  </div>
                  <div className="flex justify-between text-xs text-navy-400">
                    <span>{pool.current_quantity} / {maxTier.min_qty} units</span>
                    <span>{pool.member_count} buyers</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Products Grid */}
      <section className="page-container">
        <div className="flex items-center justify-between mb-4">
          <h2 className="section-title mb-0">
            {category ? CATEGORIES.find(c => c.slug === category)?.label : 'All Products'}
            {pagination && (
              <span className="text-navy-400 text-base font-normal ml-2">
                ({pagination.total})
              </span>
            )}
          </h2>
          {user?.role === 'seller' && (
            <Link to="/products/create" className="btn-primary btn-sm">
              + Add Product
            </Link>
          )}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="card overflow-hidden">
                <div className="skeleton aspect-[4/3]" />
                <div className="p-3 space-y-2">
                  <div className="skeleton h-3 w-3/4 rounded" />
                  <div className="skeleton h-4 rounded" />
                  <div className="skeleton h-4 w-1/2 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">📦</div>
            <p className="text-navy-300 text-lg font-medium">No products found</p>
            <p className="text-navy-500 text-sm mt-1">Try a different search or category</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {products.map((p: any) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>

            {/* Pagination */}
            {pagination && pagination.pages > 1 && (
              <div className="flex justify-center gap-2 mt-8">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="btn-secondary btn-sm"
                >
                  ← Prev
                </button>
                <span className="btn-ghost btn-sm cursor-default text-navy-300">
                  {page} / {pagination.pages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(pagination.pages, p + 1))}
                  disabled={page === pagination.pages}
                  className="btn-secondary btn-sm"
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
