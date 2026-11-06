import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCheck, MessageSquare, Package, Users, CheckCircle2, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../lib/api';
import { getSocket } from '../lib/socket';
import { formatRelativeTime } from '../lib/utils';
import { useNavigate } from 'react-router-dom';

export default function NotificationsPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [page, setPage] = useState(1);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['notifications', unreadOnly, page],
    queryFn: () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: '20',
        unread_only: unreadOnly ? 'true' : 'false',
      });
      return api.get(`/notifications?${params}`).then(r => r.data);
    },
  });

  const notifications = data?.notifications || [];
  const unreadCount = data?.unread_count || 0;

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const handleNotif = () => {
      refetch();
      queryClient.invalidateQueries(['notifications-count']);
    };
    socket.on('notification', handleNotif);
    return () => {
      socket.off('notification', handleNotif);
    };
  }, [refetch, queryClient]);

  const readAllMutation = useMutation({
    mutationFn: () => api.patch('/notifications/read-all'),
    onSuccess: () => {
      toast.success('All marked as read');
      refetch();
      queryClient.invalidateQueries(['notifications-count']);
    },
  });

  const handleNotificationClick = async (notif: any) => {
    if (!notif.is_read) {
      await api.patch(`/notifications/${notif.id}/read`);
      refetch();
      queryClient.invalidateQueries(['notifications-count']);
    }

    // Parse notification data to navigate
    if (notif.data) {
      try {
        const parsed = typeof notif.data === 'string' ? JSON.parse(notif.data) : notif.data;
        if (parsed.offer_id) navigate(`/offers/${parsed.offer_id}/thread`);
        else if (parsed.order_id) navigate(`/orders/${parsed.order_id}`);
        else if (parsed.pool_id) navigate(`/pools/${parsed.pool_id}`);
      } catch (e) {
        // Fallback
      }
    }
  };

  const getIcon = (type: string) => {
    if (type.includes('offer')) return <MessageSquare className="w-5 h-5 text-amber-400" />;
    if (type.includes('order')) return <Package className="w-5 h-5 text-blue-400" />;
    if (type.includes('pool')) return <Users className="w-5 h-5 text-purple-400" />;
    return <Bell className="w-5 h-5 text-navy-300" />;
  };

  return (
    <div className="page-container max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold font-heading text-white">Notifications</h1>
          <p className="text-navy-300 text-xs sm:text-sm mt-1">
            Real-time updates regarding bids, pool progress, and order status.
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={() => readAllMutation.mutate()}
            disabled={readAllMutation.isPending}
            className="btn-secondary text-xs py-2 px-3 flex items-center gap-1.5"
          >
            <CheckCheck className="w-3.5 h-3.5" /> Mark All Read
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 mb-6">
        <button
          onClick={() => { setUnreadOnly(false); setPage(1); }}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
            !unreadOnly
              ? 'bg-amber-500 text-navy-950 font-bold'
              : 'bg-navy-900/60 text-navy-300 hover:bg-navy-800 border border-navy-800'
          }`}
        >
          All Notifications
        </button>
        <button
          onClick={() => { setUnreadOnly(true); setPage(1); }}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
            unreadOnly
              ? 'bg-amber-500 text-navy-950 font-bold'
              : 'bg-navy-900/60 text-navy-300 hover:bg-navy-800 border border-navy-800'
          }`}
        >
          Unread Only {unreadCount > 0 && `(${unreadCount})`}
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => <div key={i} className="skeleton h-20 rounded-2xl" />)}
        </div>
      ) : notifications.length === 0 ? (
        <div className="card p-12 text-center">
          <Bell className="w-12 h-12 text-navy-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-white">No notifications</h3>
          <p className="text-navy-400 text-xs mt-1">You're all caught up with your marketplace updates.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((notif: any) => (
            <div
              key={notif.id}
              onClick={() => handleNotificationClick(notif)}
              className={`card p-4 flex items-start gap-4 cursor-pointer hover:border-amber-500/50 transition ${
                !notif.is_read ? 'bg-navy-900/90 border-amber-500/40 shadow-md' : 'bg-navy-900/40 border-navy-800'
              }`}
            >
              <div className="w-10 h-10 rounded-xl bg-navy-950 flex items-center justify-center border border-navy-800 flex-shrink-0 mt-0.5">
                {getIcon(notif.type)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-sm font-semibold text-white truncate">{notif.title}</h4>
                  <span className="text-[11px] text-navy-400 whitespace-nowrap">
                    {formatRelativeTime(notif.created_at)}
                  </span>
                </div>
                <p className="text-xs text-navy-300 mt-1 leading-relaxed">{notif.message}</p>
              </div>

              {!notif.is_read && (
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500 flex-shrink-0 mt-1.5" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
