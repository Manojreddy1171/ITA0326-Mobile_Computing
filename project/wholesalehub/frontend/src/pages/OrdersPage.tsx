import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Package, Clock, CheckCircle2, Truck, XCircle, ArrowRight, RefreshCw } from 'lucide-react';
import api from '../lib/api';
import { useAuthStore } from '../store/authStore';
import { getSocket } from '../lib/socket';
import { formatINR, formatDate } from '../lib/utils';

export default function OrdersPage() {
  const { user } = useAuthStore();
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['orders', status, page],
    queryFn: () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: '20',
        ...(status ? { status } : {}),
      });
      return api.get(`/orders?${params}`).then(r => r.data);
    },
  });

  const orders = data?.orders || [];
  const pagination = data?.pagination;

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const handleOrder = () => refetch();
    socket.on('order:created', handleOrder);
    socket.on('order:updated', handleOrder);
    return () => {
      socket.off('order:created', handleOrder);
      socket.off('order:updated', handleOrder);
    };
  }, [refetch]);

  const getStatusBadge = (st: string) => {
    switch (st) {
      case 'placed':
        return <span className="badge-warning flex items-center gap-1"><Clock className="w-3 h-3" /> Placed</span>;
      case 'confirmed':
        return <span className="badge-primary flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Confirmed</span>;
      case 'shipped':
        return <span className="badge-primary flex items-center gap-1"><Truck className="w-3 h-3" /> Shipped</span>;
      case 'delivered':
        return <span className="badge-success flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Delivered</span>;
      case 'cancelled':
        return <span className="badge-danger flex items-center gap-1"><XCircle className="w-3 h-3" /> Cancelled</span>;
      default:
        return <span className="badge-neutral">{st}</span>;
    }
  };

  return (
    <div className="page-container max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold font-heading text-white">Wholesale Orders</h1>
          <p className="text-navy-300 text-sm mt-1">
            {user?.role === 'seller' ? 'Manage and fulfill wholesale orders placed by buyers' : 'Track your bulk orders and shipments'}
          </p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="btn-secondary self-start sm:self-auto flex items-center gap-1.5 text-xs py-2"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-6 scrollbar-none">
        {[
          { label: 'All Orders', value: '' },
          { label: 'Placed', value: 'placed' },
          { label: 'Confirmed', value: 'confirmed' },
          { label: 'Shipped', value: 'shipped' },
          { label: 'Delivered', value: 'delivered' },
          { label: 'Cancelled', value: 'cancelled' },
        ].map(tab => (
          <button
            key={tab.value}
            onClick={() => { setStatus(tab.value); setPage(1); }}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition ${
              status === tab.value
                ? 'bg-amber-500 text-navy-950 font-semibold'
                : 'bg-navy-900/60 text-navy-300 hover:bg-navy-800 border border-navy-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="skeleton h-32 rounded-2xl" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="card p-12 text-center">
          <Package className="w-12 h-12 text-navy-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-white">No orders found</h3>
          <p className="text-navy-400 text-xs mt-1">
            {user?.role === 'buyer'
              ? 'Accept a price offer or join a group pool to generate wholesale orders.'
              : 'When buyers accept your proposals or join pools, orders will appear here.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order: any) => {
            const counterParty = user?.role === 'seller'
              ? (order.buyer_business || order.buyer_name)
              : (order.seller_business || order.seller_name);

            return (
              <Link
                key={order.id}
                to={`/orders/${order.id}`}
                className="card p-5 hover:border-amber-500/50 transition block group"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-navy-800">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm font-bold text-white">
                      Order #{order.id}
                    </span>
                    {getStatusBadge(order.status)}
                    {order.pool_id && (
                      <span className="badge-warning text-[10px]">GROUP POOL ORDER</span>
                    )}
                  </div>
                  <span className="text-xs text-navy-400">
                    Placed {formatDate(order.placed_at)}
                  </span>
                </div>

                <div className="pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-2">
                    <p className="text-xs text-navy-300">
                      {user?.role === 'seller' ? 'Buyer: ' : 'Seller: '}
                      <strong className="text-white">{counterParty}</strong>
                      {order.buyer_city && <span className="text-navy-400 ml-1">({order.buyer_city})</span>}
                    </p>

                    <div className="flex items-center gap-2 flex-wrap">
                      {order.items?.map((item: any) => (
                        <span key={item.id} className="text-xs bg-navy-900 px-2.5 py-1 rounded-lg border border-navy-800 text-navy-200">
                          {item.product_name} × {item.quantity} {item.unit}s
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between border-t sm:border-t-0 pt-2 sm:pt-0 border-navy-800">
                    <div className="text-left sm:text-right">
                      <div className="text-[10px] text-navy-400 uppercase">Total Amount</div>
                      <div className="text-lg font-bold text-amber-400">{formatINR(order.total_amount)}</div>
                    </div>
                    <div className="text-xs text-amber-400 font-medium flex items-center gap-1 group-hover:translate-x-1 transition mt-2">
                      View Invoice & Details <ArrowRight className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.total > 20 && (
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-navy-800">
          <span className="text-xs text-navy-400">Total {pagination.total} orders</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="btn-secondary text-xs py-1.5 px-3 disabled:opacity-40"
            >
              Previous
            </button>
            <span className="text-xs text-white px-2">Page {page}</span>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={page * 20 >= pagination.total}
              className="btn-secondary text-xs py-1.5 px-3 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
