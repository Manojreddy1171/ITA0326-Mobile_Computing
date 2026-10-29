import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Package, Clock, CheckCircle2, Truck, XCircle, Printer, Building2, MapPin, Phone, Mail } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../lib/api';
import { useAuthStore } from '../store/authStore';
import { formatINR, formatDate } from '../lib/utils';

export default function OrderDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  const { data, isLoading } = useQuery({
    queryKey: ['order', id],
    queryFn: () => api.get(`/orders/${id}`).then(r => r.data),
  });

  const order = data?.order;
  const items = data?.items || [];

  const updateStatusMutation = useMutation({
    mutationFn: (newStatus: string) => api.patch(`/orders/${id}/status`, { status: newStatus }),
    onSuccess: (res) => {
      toast.success(`Order status updated to ${res.data.order.status}`);
      queryClient.invalidateQueries(['order', id]);
      queryClient.invalidateQueries(['orders']);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to update order status');
    },
  });

  if (isLoading) {
    return (
      <div className="page-container max-w-4xl">
        <div className="skeleton h-96 rounded-2xl" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="page-container text-center py-16">
        <p className="text-navy-300">Order not found.</p>
        <Link to="/orders" className="btn-primary mt-4 inline-flex">← Back to Orders</Link>
      </div>
    );
  }

  const isSeller = user?.role === 'seller';

  const steps = [
    { label: 'Order Placed', time: order.placed_at, done: true },
    { label: 'Confirmed', time: order.confirmed_at, done: ['confirmed', 'shipped', 'delivered'].includes(order.status) },
    { label: 'Dispatched & Shipped', time: order.shipped_at, done: ['shipped', 'delivered'].includes(order.status) },
    { label: 'Delivered', time: order.delivered_at, done: order.status === 'delivered' },
  ];

  return (
    <div className="page-container max-w-4xl">
      {/* Top Bar */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Link to="/orders" className="inline-flex items-center gap-1.5 text-sm text-navy-300 hover:text-white transition">
          <ArrowLeft className="w-4 h-4" /> Back to Orders
        </Link>
        <div className="flex items-center gap-3">
          <button
            onClick={() => window.print()}
            className="btn-secondary text-xs py-2 px-3 flex items-center gap-1.5"
          >
            <Printer className="w-3.5 h-3.5" /> Print Invoice
          </button>
        </div>
      </div>

      {/* Main Order Invoice Card */}
      <div className="card p-6 sm:p-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-navy-800">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold font-heading text-white">Tax Invoice #{order.id}</h1>
              <span className={`badge-${order.status === 'delivered' ? 'success' : order.status === 'cancelled' ? 'danger' : 'primary'}`}>
                {order.status.toUpperCase()}
              </span>
            </div>
            <p className="text-xs text-navy-400 mt-1">Placed on {formatDate(order.placed_at)}</p>
          </div>

          {/* Seller Action Controls */}
          {isSeller && order.status !== 'cancelled' && order.status !== 'delivered' && (
            <div className="bg-navy-950 p-3 rounded-xl border border-navy-800 flex items-center gap-2">
              <span className="text-xs text-navy-300 font-medium">Update Status:</span>
              <select
                className="input-field text-xs py-1.5 bg-navy-900"
                value={order.status}
                onChange={e => updateStatusMutation.mutate(e.target.value)}
                disabled={updateStatusMutation.isPending}
              >
                <option value="placed">Placed</option>
                <option value="confirmed">Confirmed</option>
                <option value="shipped">Shipped</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          )}
        </div>

        {/* Status Tracker */}
        {order.status !== 'cancelled' && (
          <div className="py-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {steps.map((st, i) => (
                <div
                  key={i}
                  className={`p-3 rounded-xl border transition ${
                    st.done
                      ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-300'
                      : 'bg-navy-900/40 border-navy-800 text-navy-500'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {st.done ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    ) : (
                      <Clock className="w-4 h-4 text-navy-600 flex-shrink-0" />
                    )}
                    <span className="text-xs font-semibold text-white">{st.label}</span>
                  </div>
                  {st.time && (
                    <div className="text-[10px] text-navy-400 mt-1 pl-6">
                      {formatDate(st.time)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Counterparty details: Seller vs Buyer */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 p-4 rounded-2xl bg-navy-950/60 border border-navy-800 text-xs">
          <div>
            <div className="text-[10px] text-amber-400 font-semibold uppercase tracking-wider mb-2 flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5" /> Supplier / Seller
            </div>
            <div className="text-sm font-bold text-white">{order.seller_business || order.seller_name}</div>
            <div className="text-navy-300 mt-1">{order.seller_name}</div>
            {order.seller_phone && <div className="text-navy-400 mt-1 flex items-center gap-1"><Phone className="w-3 h-3" /> {order.seller_phone}</div>}
          </div>

          <div>
            <div className="text-[10px] text-amber-400 font-semibold uppercase tracking-wider mb-2 flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5" /> Buyer / Consignee
            </div>
            <div className="text-sm font-bold text-white">{order.buyer_business || order.buyer_name}</div>
            <div className="text-navy-300 mt-1">{order.buyer_name}</div>
            {order.buyer_phone && <div className="text-navy-400 mt-1 flex items-center gap-1"><Phone className="w-3 h-3" /> {order.buyer_phone}</div>}
            {order.buyer_city && (
              <div className="text-navy-400 mt-1 flex items-center gap-1">
                <MapPin className="w-3 h-3" /> {order.buyer_city}, {order.buyer_state}
              </div>
            )}
          </div>
        </div>

        {/* Items Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-navy-800 text-navy-400 uppercase text-[10px]">
                <th className="py-3 px-2">Item Description</th>
                <th className="py-3 px-2 text-center">Quantity</th>
                <th className="py-3 px-2 text-right">Unit Price</th>
                <th className="py-3 px-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-800/60">
              {items.map((item: any) => (
                <tr key={item.id} className="text-white">
                  <td className="py-3 px-2">
                    <div className="font-semibold">{item.product_name}</div>
                    {item.brand && <div className="text-[11px] text-navy-400">Brand: {item.brand}</div>}
                  </td>
                  <td className="py-3 px-2 text-center font-mono">
                    {item.quantity} {item.unit || 'pcs'}
                  </td>
                  <td className="py-3 px-2 text-right font-mono">
                    {formatINR(item.unit_price)}
                  </td>
                  <td className="py-3 px-2 text-right font-mono font-bold text-amber-400">
                    {formatINR(item.total_price)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="pt-4 border-t border-navy-800 flex justify-end">
          <div className="w-full max-w-xs space-y-2 text-xs">
            <div className="flex justify-between text-navy-300">
              <span>Subtotal:</span>
              <span className="font-mono text-white">{formatINR(order.subtotal || order.total_amount)}</span>
            </div>
            {order.discount_amount > 0 && (
              <div className="flex justify-between text-emerald-400">
                <span>Group Pool Discount:</span>
                <span className="font-mono">-{formatINR(order.discount_amount)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-bold pt-2 border-t border-navy-800 text-white">
              <span>Invoice Total:</span>
              <span className="text-amber-400 font-mono text-base">{formatINR(order.total_amount)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
