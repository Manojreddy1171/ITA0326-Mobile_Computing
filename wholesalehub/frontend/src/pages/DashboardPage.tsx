import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Package, MessageSquare, Users, ShoppingBag, Plus, ArrowRight, TrendingUp, Clock, AlertCircle } from 'lucide-react';
import api from '../lib/api';
import { useAuthStore } from '../store/authStore';
import { formatINR, formatDate, timeRemaining } from '../lib/utils';

export default function DashboardPage() {
  const { user } = useAuthStore();
  const isSeller = user?.role === 'seller';

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', user?.role],
    queryFn: () => api.get(`/dashboard/${isSeller ? 'seller' : 'buyer'}`).then(r => r.data),
  });

  if (isLoading) {
    return (
      <div className="page-container max-w-5xl space-y-6">
        <div className="skeleton h-12 w-64 rounded-xl" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="skeleton h-24 rounded-2xl" />)}
        </div>
        <div className="skeleton h-64 rounded-2xl" />
      </div>
    );
  }

  const stats = data?.stats || {};
  const recent = data?.recent || {};

  return (
    <div className="page-container max-w-5xl space-y-8">
      {/* Welcome Banner */}
      <div className="card p-6 sm:p-8 bg-gradient-to-r from-navy-900 via-navy-900 to-navy-800 border-navy-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="badge-primary uppercase text-[10px] tracking-wider font-bold">
              {isSeller ? 'Seller Hub' : 'Retailer Buyer Hub'}
            </span>
            <span className="text-xs text-navy-400 font-mono">ID: #{user?.id}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-heading text-white mt-1">
            Welcome, {user?.name}
          </h1>
          <p className="text-navy-300 text-xs sm:text-sm mt-1">
            {user?.business_name ? `${user.business_name} • ` : ''}
            {isSeller ? 'Grow your wholesale distribution across independent retailers.' : 'Save money on bulk inventory through negotiated offers & group buying.'}
          </p>
        </div>

        {isSeller && (
          <div className="flex items-center gap-2 flex-wrap">
            <Link to="/products/create" className="btn-primary text-xs py-2.5 flex items-center gap-1.5">
              <Plus className="w-4 h-4" /> Add Product
            </Link>
            <Link to="/pools/create" className="btn-secondary text-xs py-2.5 flex items-center gap-1.5">
              <Users className="w-4 h-4" /> Start Group Deal
            </Link>
          </div>
        )}
      </div>

      {/* KPI Stats Grid */}
      {isSeller ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="card p-5 border-navy-800">
            <div className="flex items-center justify-between text-navy-400 mb-2">
              <span className="text-xs font-medium">Wholesale Revenue</span>
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-xl sm:text-2xl font-bold font-mono text-emerald-400">
              {formatINR(stats.orders?.revenue || 0)}
            </div>
            <div className="text-[11px] text-navy-400 mt-1">
              {stats.orders?.total || 0} total orders
            </div>
          </div>

          <div className="card p-5 border-navy-800">
            <div className="flex items-center justify-between text-navy-400 mb-2">
              <span className="text-xs font-medium">Pending Offers</span>
              <MessageSquare className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-xl sm:text-2xl font-bold font-mono text-amber-400">
              {stats.offers?.pending || 0}
            </div>
            <div className="text-[11px] text-navy-400 mt-1">
              Awaiting your response
            </div>
          </div>

          <div className="card p-5 border-navy-800">
            <div className="flex items-center justify-between text-navy-400 mb-2">
              <span className="text-xs font-medium">Catalog Products</span>
              <Package className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-xl sm:text-2xl font-bold font-mono text-white">
              {stats.products?.total || 0}
            </div>
            <div className="text-[11px] text-navy-400 mt-1">
              {stats.products?.total_stock || 0} total bulk units
            </div>
          </div>

          <div className="card p-5 border-navy-800">
            <div className="flex items-center justify-between text-navy-400 mb-2">
              <span className="text-xs font-medium">Active Group Pools</span>
              <Users className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-xl sm:text-2xl font-bold font-mono text-purple-400">
              {stats.pools?.active || 0}
            </div>
            <div className="text-[11px] text-navy-400 mt-1">
              Running cooperative campaigns
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="card p-5 border-navy-800">
            <div className="flex items-center justify-between text-navy-400 mb-2">
              <span className="text-xs font-medium">Total Bulk Spend</span>
              <ShoppingBag className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold font-mono text-emerald-400">
              {formatINR(stats.orders?.spent || 0)}
            </div>
            <div className="text-[11px] text-navy-400 mt-1">{stats.orders?.total || 0} completed orders</div>
          </div>

          <div className="card p-5 border-navy-800">
            <div className="flex items-center justify-between text-navy-400 mb-2">
              <span className="text-xs font-medium">Active Price Bids</span>
              <MessageSquare className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-bold font-mono text-amber-400">
              {stats.offers?.pending || 0}
            </div>
            <div className="text-[11px] text-navy-400 mt-1">{stats.offers?.accepted || 0} accepted offers</div>
          </div>

          <div className="card p-5 border-navy-800">
            <div className="flex items-center justify-between text-navy-400 mb-2">
              <span className="text-xs font-medium">Joined Group Pools</span>
              <Users className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-2xl font-bold font-mono text-blue-400">
              {stats.pools?.joined || 0}
            </div>
            <div className="text-[11px] text-navy-400 mt-1">Cooperative deals pledged</div>
          </div>
        </div>
      )}

      {/* Main Section: Actionable Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Offers / Negotiations */}
        <div className="card p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-amber-400" />
                {isSeller ? 'Pending Negotiations' : 'Active Price Offers'}
              </h2>
              <Link to="/offers" className="text-xs text-amber-400 hover:underline">
                View all ({recent.offers?.length || 0}) →
              </Link>
            </div>

            {(!recent.offers || recent.offers.length === 0) ? (
              <div className="py-8 text-center text-xs text-navy-400">
                No active price negotiations right now.
              </div>
            ) : (
              <div className="divide-y divide-navy-800/80">
                {recent.offers.map((offer: any) => (
                  <Link
                    key={offer.id}
                    to={`/offers/${offer.id}/thread`}
                    className="py-3 flex items-center justify-between hover:bg-navy-900/40 -mx-3 px-3 rounded-lg transition"
                  >
                    <div>
                      <div className="text-xs font-semibold text-white truncate max-w-[200px]">
                        {offer.product_name}
                      </div>
                      <div className="text-[11px] text-navy-400 mt-0.5">
                        {isSeller ? `From: ${offer.buyer_name}` : `Seller: ${offer.seller_name}`}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-bold text-amber-400">
                        {formatINR(offer.price_per_unit)}
                      </div>
                      <div className="text-[10px] text-navy-400">Qty: {offer.quantity}</div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Group Pools */}
        <div className="card p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-amber-400" />
                {isSeller ? 'Your Running Pools' : 'Joined Cooperative Deals'}
              </h2>
              <Link to="/pools" className="text-xs text-amber-400 hover:underline">
                View all pools →
              </Link>
            </div>

            {(!recent.pools || recent.pools.length === 0) ? (
              <div className="py-8 text-center text-xs text-navy-400">
                {isSeller ? 'You have no active pools.' : 'You have not joined any group pools yet.'}
              </div>
            ) : (
              <div className="divide-y divide-navy-800/80">
                {recent.pools.map((p: any) => {
                  const rem = timeRemaining(p.deadline);
                  return (
                    <Link
                      key={p.id}
                      to={`/pools/${p.id}`}
                      className="py-3 flex items-center justify-between hover:bg-navy-900/40 -mx-3 px-3 rounded-lg transition"
                    >
                      <div>
                        <div className="text-xs font-semibold text-white truncate max-w-[200px]">
                          {p.title}
                        </div>
                        <div className="text-[11px] text-navy-400 mt-0.5 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-amber-400" />
                          {rem.ended ? 'Ended' : `${rem.text} left`}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-bold text-emerald-400">
                          {p.current_quantity || 0} / {p.moq} units
                        </div>
                        <span className="badge-warning text-[10px] mt-0.5 inline-block">Active</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Seller Catalog Management Quick Table */}
      {isSeller && (
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Package className="w-4 h-4 text-amber-400" />
              Your Catalog Listings
            </h2>
            <Link to="/products/create" className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1">
              <Plus className="w-3.5 h-3.5" /> Add Listing
            </Link>
          </div>

          {(!recent.products || recent.products.length === 0) ? (
            <p className="text-xs text-navy-400 py-4">No products listed in catalog yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-navy-800 text-navy-400 uppercase text-[10px]">
                    <th className="py-2.5 px-2">Product</th>
                    <th className="py-2.5 px-2">Category</th>
                    <th className="py-2.5 px-2 text-right">List Price</th>
                    <th className="py-2.5 px-2 text-center">Available Stock</th>
                    <th className="py-2.5 px-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-navy-800/60">
                  {recent.products.map((p: any) => (
                    <tr key={p.id} className="text-white">
                      <td className="py-3 px-2 font-medium">
                        <Link to={`/products/${p.id}`} className="hover:text-amber-400 truncate max-w-[240px] block">
                          {p.name}
                        </Link>
                      </td>
                      <td className="py-3 px-2 text-navy-400">{p.category_name}</td>
                      <td className="py-3 px-2 text-right font-mono text-amber-400">{formatINR(p.list_price)}</td>
                      <td className="py-3 px-2 text-center font-mono">{p.stock_quantity}</td>
                      <td className="py-3 px-2 text-right">
                        <Link to={`/products/${p.id}/edit`} className="text-amber-400 hover:underline">
                          Edit
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
