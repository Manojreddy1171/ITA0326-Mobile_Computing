import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { MessageSquare, ArrowRight, Clock, CheckCircle2, XCircle, AlertCircle, RefreshCw } from 'lucide-react';
import api from '../lib/api';
import { useAuthStore } from '../store/authStore';
import { formatINR, formatRelativeTime } from '../lib/utils';

export default function OffersPage() {
  const { user } = useAuthStore();
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['offers', statusFilter, page],
    queryFn: () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: '20',
        ...(statusFilter ? { status: statusFilter } : {}),
      });
      return api.get(`/offers?${params}`).then(r => r.data);
    },
  });

  const offers = data?.offers || [];
  const pagination = data?.pagination;

  const getStatusBadge = (status: string, offeredBy: string) => {
    switch (status) {
      case 'pending':
        return (
          <span className="badge-warning flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {offeredBy === user?.role ? 'Awaiting Response' : 'Action Needed'}
          </span>
        );
      case 'countered':
        return (
          <span className="badge-primary flex items-center gap-1">
            <RefreshCw className="w-3 h-3" /> Countered
          </span>
        );
      case 'accepted':
        return (
          <span className="badge-success flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Accepted
          </span>
        );
      case 'rejected':
        return (
          <span className="badge-danger flex items-center gap-1">
            <XCircle className="w-3 h-3" /> Rejected
          </span>
        );
      case 'expired':
        return (
          <span className="badge-neutral flex items-center gap-1">
            <Clock className="w-3 h-3" /> Expired
          </span>
        );
      default:
        return <span className="badge-neutral">{status}</span>;
    }
  };

  return (
    <div className="page-container max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold font-heading text-white">Price Negotiations</h1>
          <p className="text-navy-300 text-sm mt-1">
            {user?.role === 'seller'
              ? 'Incoming buyer offers and active counter-proposals for your bulk listings'
              : 'Your wholesale bids, discounts requested, and seller counter-offers'}
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

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-6 scrollbar-none">
        {[
          { label: 'All Offers', value: '' },
          { label: 'Pending Action', value: 'pending' },
          { label: 'Countered', value: 'countered' },
          { label: 'Accepted', value: 'accepted' },
          { label: 'Rejected', value: 'rejected' },
          { label: 'Expired', value: 'expired' },
        ].map(tab => (
          <button
            key={tab.value}
            onClick={() => { setStatusFilter(tab.value); setPage(1); }}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition ${
              statusFilter === tab.value
                ? 'bg-amber-500 text-navy-950 font-semibold'
                : 'bg-navy-900/60 text-navy-300 hover:bg-navy-800 hover:text-white border border-navy-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="skeleton h-28 rounded-2xl" />
          ))}
        </div>
      ) : offers.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-navy-800/80 mx-auto flex items-center justify-center text-amber-400 mb-4">
            <MessageSquare className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-semibold text-white">No negotiations found</h3>
          <p className="text-navy-300 text-sm max-w-md mx-auto mt-1">
            {user?.role === 'buyer'
              ? 'Browse products and submit offers below list price to start negotiating with wholesale sellers.'
              : 'When buyers submit custom pricing proposals for your products, they will appear here.'}
          </p>
          {user?.role === 'buyer' && (
            <Link to="/" className="btn-primary mt-6 inline-flex">
              Explore Products
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {offers.map((offer: any) => {
            const isMyTurn =
              offer.status === 'pending' &&
              ((user?.role === 'seller' && offer.offered_by === 'buyer') ||
                (user?.role === 'buyer' && offer.offered_by === 'seller'));

            const otherParty = user?.role === 'seller'
              ? (offer.buyer_business || offer.buyer_name)
              : (offer.seller_business || offer.seller_name);

            return (
              <Link
                key={offer.id}
                to={`/offers/${offer.id}/thread`}
                className={`card p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-amber-500/50 transition group ${
                  isMyTurn ? 'border-amber-500/40 bg-amber-500/[0.02]' : ''
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-navy-950 flex-shrink-0 border border-navy-800">
                    {offer.product_image ? (
                      <img src={offer.product_image} alt={offer.product_name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-2xl">📦</div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-xs text-navy-400 font-medium">Round {offer.round_number || 1} of 5</span>
                      {getStatusBadge(offer.status, offer.offered_by)}
                      {isMyTurn && (
                        <span className="badge-warning text-[10px] animate-pulse">Your Turn</span>
                      )}
                    </div>

                    <h3 className="text-base font-semibold text-white group-hover:text-amber-400 transition truncate">
                      {offer.product_name}
                    </h3>
                    <p className="text-xs text-navy-300 mt-0.5">
                      With: <span className="text-white font-medium">{otherParty}</span>
                    </p>

                    <div className="flex items-center gap-3 mt-2 text-xs">
                      <div>
                        <span className="text-navy-400">Offered: </span>
                        <span className="text-amber-400 font-bold">{formatINR(offer.price_per_unit)}</span>
                        <span className="text-navy-400">/{offer.unit}</span>
                      </div>
                      <div className="text-navy-500">•</div>
                      <div>
                        <span className="text-navy-400">Qty: </span>
                        <span className="text-white font-medium">{offer.quantity} {offer.unit}s</span>
                      </div>
                      <div className="text-navy-500">•</div>
                      <div>
                        <span className="text-navy-400">Total: </span>
                        <span className="text-white font-semibold">{formatINR(offer.price_per_unit * offer.quantity)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 pt-3 sm:pt-0 border-navy-800">
                  <span className="text-[11px] text-navy-400">
                    {formatRelativeTime(offer.created_at)}
                  </span>
                  <div className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1 group-hover:bg-amber-500 group-hover:text-navy-950 transition">
                    Open Thread <ArrowRight className="w-3.5 h-3.5" />
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
          <span className="text-xs text-navy-400">Total {pagination.total} negotiations</span>
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
