import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Truck, Users, Clock, CreditCard, Menu, X, LogOut } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/loads', icon: Truck, label: 'Active Loads' },
  { to: '/drivers', icon: Users, label: 'Drivers' },
  { to: '/detention', icon: Clock, label: 'Detention' },
  { to: '/billing', icon: CreditCard, label: 'Billing' },
];

export default function Sidebar() {
  const [open, setOpen] = useState(false);
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    setOpen(false);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="md:hidden fixed top-4 left-4 z-50 p-3 bg-[#1A1A1A] border border-white/10 rounded-lg text-gray-300 hover:text-[#FF6B00] transition-all"
        aria-label="Open menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      {open && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={`
          fixed top-0 left-0 z-50 h-full w-64 bg-[#0F0F0F] border-r border-white/10
          flex flex-col transition-transform duration-300 ease-in-out
          md:translate-x-0 md:static md:z-auto
          ${open ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="flex items-center justify-between px-5 py-5 border-b border-white/10 bg-[#1A1A1A]">
          <div className="flex items-center flex-1 min-w-0">
            <img
              src="/Adobe_Express_-_file.png"
              alt="LoadHunters"
              className="w-full max-w-[160px] h-auto object-contain"
              style={{ display: 'block', background: 'transparent' }}
            />
          </div>
          <button
            onClick={() => setOpen(false)}
            className="md:hidden p-2 text-gray-400 hover:text-white transition-colors"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-[#FF6B00] text-white border border-[#FF6B00]'
                    : 'text-gray-300 hover:text-white hover:bg-white/5 border border-transparent'
                }`
              }
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="px-4 py-4 border-t border-white/10 bg-[#1A1A1A] space-y-3">
          <div className="flex items-center gap-3 px-2">
            <div className="w-8 h-8 rounded-full bg-[#FF6B00] flex items-center justify-center">
              <span className="text-xs font-bold text-white">
                {user?.email?.charAt(0).toUpperCase() || 'U'}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-white truncate">
                {user?.email || 'User'}
              </p>
              <p className="text-[10px] text-gray-400">Dispatcher</p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-gray-300 hover:text-white hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
}
