import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  ShoppingBag, 
  Tags, 
  History, 
  LogOut, 
  Users, 
  Truck,
  Receipt,
  Barcode
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { LuxuryLogo } from '../components/LuxuryLogo';

interface SidebarProps {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  mobileOpen,
  setMobileOpen
}) => {
  const { logout } = useAuth();
  const location = useLocation();

  const menuItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Products', path: '/products', icon: ShoppingBag },
    { name: 'Categories', path: '/categories', icon: Tags },
    { name: 'CRM (Customers)', path: '/customers', icon: Users },
    { name: 'Suppliers', path: '/suppliers', icon: Truck },
    { name: 'Billing Terminal', path: '/billing', icon: Receipt },
    { name: 'Barcode Generator', path: '/barcodes', icon: Barcode },
    { name: 'Audit Logs', path: '/logs', icon: History }
  ];

  return (
    <>
      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 z-40 bg-zinc-950/20 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed left-0 top-0 bottom-0 z-50 flex flex-col justify-center items-center w-24 h-screen transition-all duration-300 ease-in-out ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Curved Wave Shape Container */}
        <div className="relative w-20 h-[710px] flex flex-col items-center justify-between py-8 z-10">
          
          {/* SVG Background Path that draws the identical curved wave shape */}
          <div className="absolute inset-0 -z-10 filter drop-shadow-[0_8px_24px_rgba(93,95,239,0.25)]">
            <svg className="w-full h-full text-[#5D5FEF] fill-current" viewBox="0 0 80 710" preserveAspectRatio="none">
              <path d="M 0,0 
                       C 30,0 80,30 80,80 
                       L 80,630 
                       C 80,680 30,710 0,710 
                       Z" />
            </svg>
          </div>

          {/* Top Logo Grid Box like Reference */}
          <div className="w-12 h-12 rounded-[20px] bg-white flex items-center justify-center shadow-md mb-6 cursor-pointer overflow-hidden flex-shrink-0">
            <LuxuryLogo className="w-9 h-9" />
          </div>

          {/* Navigation Items - Stacked vertically */}
          <nav className="flex-1 flex flex-col items-center justify-center space-y-3.5 w-full">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileOpen(false)}
                  title={item.name}
                  className={`
                    w-12 h-12 flex items-center justify-center rounded-[20px] transition-all duration-200 relative group flex-shrink-0
                    ${isActive 
                      ? 'bg-white text-[#5D5FEF] shadow-lg scale-105' 
                      : 'text-white/70 hover:text-white hover:bg-white/10'
                    }
                  `}
                >
                  <Icon size={20} className="stroke-[2]" />
                  
                  {/* Tooltip on hover */}
                  <span className="absolute left-16 px-2.5 py-1 bg-zinc-900 text-white text-[10px] uppercase font-bold tracking-wider rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 shadow-md">
                    {item.name}
                  </span>
                </NavLink>
              );
            })}
          </nav>

          {/* Footer Logout */}
          <div className="mt-6 flex-shrink-0">
            <button
              onClick={() => {
                if (confirm("Are you sure you want to log out of A Town Luxury?")) {
                  logout();
                }
              }}
              title="Logout System"
              className="w-12 h-12 flex items-center justify-center text-white/60 hover:text-red-300 hover:bg-white/10 rounded-[20px] transition-all cursor-pointer flex-shrink-0"
            >
              <LogOut size={20} />
            </button>
          </div>

        </div>
      </aside>
    </>
  );
};

