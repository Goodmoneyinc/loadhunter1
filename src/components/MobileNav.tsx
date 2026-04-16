import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Truck, Clock, Users } from 'lucide-react';

export default function MobileNav() {
  const navItems = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/loads', icon: Truck, label: 'Loads' },
    { to: '/detention', icon: Clock, label: 'Detention' },
    { to: '/drivers', icon: Users, label: 'Drivers' },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 pb-safe">
      <div className="mx-4 mb-4 bg-[#0F0F0F] border border-white/10 rounded-2xl shadow-2xl">
        <div className="flex items-center justify-around px-2 py-3">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all ${
                  isActive
                    ? 'bg-[#FF6B00] text-white'
                    : 'text-gray-400 hover:text-gray-200'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon className={`w-5 h-5 ${isActive ? 'scale-110' : ''} transition-transform`} />
                  <span className="text-[10px] font-medium">{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  );
}
