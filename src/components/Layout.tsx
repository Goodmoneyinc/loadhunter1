import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import MobileNav from './MobileNav';

export default function Layout() {
  const location = useLocation();
  const isDashboard = location.pathname === '/loads' || location.pathname === '/dashboard';

  return (
    <div className="min-h-screen flex relative bg-[#1A1A1A]">
      <Sidebar />
      <main className="flex-1 md:ml-0 overflow-y-auto pb-20 md:pb-0">
        <div className={`${isDashboard ? 'px-0 py-0 md:px-8 md:py-8' : 'px-4 py-6 md:px-8 md:py-8 pt-16 md:pt-8'} max-w-full mx-auto`}>
          <Outlet />
        </div>
      </main>
      <MobileNav />
    </div>
  );
}
