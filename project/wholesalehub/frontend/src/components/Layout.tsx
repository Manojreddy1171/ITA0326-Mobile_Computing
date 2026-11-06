import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import BottomNav from './BottomNav';
import { useAuthStore } from '../store/authStore';

export default function Layout() {
  const { isAuthenticated } = useAuthStore();

  return (
    <div className="min-h-screen bg-navy-950 flex flex-col">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      {isAuthenticated && <BottomNav />}
    </div>
  );
}
