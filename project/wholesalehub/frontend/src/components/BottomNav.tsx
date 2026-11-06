import { NavLink } from 'react-router-dom';
import { Home, LayoutDashboard, Tag, Users, Package } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

export default function BottomNav() {
  const { user } = useAuthStore();

  const navItems = [
    { to: '/', icon: Home, label: 'Home' },
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/offers', icon: Tag, label: 'Offers' },
    { to: '/pools', icon: Users, label: 'Pools' },
    { to: '/orders', icon: Package, label: 'Orders' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden navbar-glass border-t border-white/05"
         style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      <div className="flex items-center justify-around h-16">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-0.5 min-w-[52px] py-1 px-2 rounded-xl transition-all duration-200 ${
                isActive
                  ? 'text-orange-400'
                  : 'text-navy-400 hover:text-navy-200'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon className={`w-5 h-5 transition-transform duration-200 ${isActive ? 'scale-110' : ''}`} />
                <span className="text-[10px] font-medium">{label}</span>
                {isActive && (
                  <div className="absolute bottom-1 w-1 h-1 bg-orange-400 rounded-full" />
                )}
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
