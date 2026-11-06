import { Link, useNavigate } from 'react-router-dom';
import { Bell, LogOut, User, ShoppingBag, Package, LayoutDashboard } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import api from '../lib/api';
import { disconnectSocket } from '../lib/socket';

export default function Navbar() {
  const { isAuthenticated, user, logout } = useAuthStore();
  const navigate = useNavigate();

  const { data: notifData } = useQuery({
    queryKey: ['unread-count'],
    queryFn: () => api.get('/notifications/unread-count').then(r => r.data),
    enabled: isAuthenticated,
    refetchInterval: 30_000,
  });

  const unreadCount = notifData?.count || 0;

  const handleLogout = () => {
    disconnectSocket();
    logout();
    navigate('/login');
  };

  return (
    <nav className="navbar-glass sticky top-0 z-50 h-16">
      <div className="max-w-7xl mx-auto px-4 h-full flex items-center justify-between gap-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/30">
            <ShoppingBag className="w-4 h-4 text-white" />
          </div>
          <span className="font-display font-bold text-lg text-white hidden sm:block">
            Wholesale<span className="text-orange-400">Hub</span>
          </span>
        </Link>

        {/* Right side */}
        <div className="flex items-center gap-1 sm:gap-2">
          {isAuthenticated ? (
            <>
              {/* Dashboard */}
              <Link
                to="/dashboard"
                className="btn-ghost btn-sm hidden sm:flex"
                title="Dashboard"
              >
                <LayoutDashboard className="w-4 h-4" />
                <span className="hidden md:block">Dashboard</span>
              </Link>

              {/* Notifications */}
              <Link
                to="/notifications"
                className="btn-ghost btn-sm relative"
                title="Notifications"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-orange-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center notif-badge">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Link>

              {/* User avatar/name */}
              <Link
                to="/profile"
                className="flex items-center gap-2 btn-ghost btn-sm"
              >
                {user?.avatar_url ? (
                  <img src={user.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover border border-navy-600" />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-navy-700 flex items-center justify-center">
                    <User className="w-3.5 h-3.5 text-navy-300" />
                  </div>
                )}
                <span className="hidden sm:block text-sm font-medium text-navy-200 max-w-[100px] truncate">
                  {user?.name?.split(' ')[0]}
                </span>
              </Link>

              {/* Role badge */}
              <span className={`hidden md:inline-flex badge ${user?.role === 'seller' ? 'badge-orange' : 'badge-blue'}`}>
                {user?.role}
              </span>

              {/* Logout */}
              <button
                onClick={handleLogout}
                className="btn-ghost btn-sm"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn-ghost btn-sm">Login</Link>
              <Link to="/register" className="btn-primary btn-sm">
                Get Started
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
