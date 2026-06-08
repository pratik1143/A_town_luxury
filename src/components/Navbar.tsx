import React from 'react';
import { Bell, Menu, Settings, Search, Sun, Moon } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

interface NavbarProps {
  setMobileOpen: (open: boolean) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ setMobileOpen }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const tabs = [
    { name: 'Dashboard', path: '/' },
    { name: 'Inventory', path: '/products' },
    { name: 'Billing Terminal', path: '/billing' }
  ];

  return (
    <header className="h-24 bg-transparent flex items-center justify-between px-6 lg:px-8 relative z-30 select-none">
      
      {/* Mobile Toggle & Horizontal Tabs */}
      <div className="flex items-center space-x-6">
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 -ml-2 rounded-xl text-zinc-500 hover:text-black hover:bg-zinc-100 lg:hidden cursor-pointer"
        >
          <Menu size={20} />
        </button>

        {/* Horizontal tabs like Reference UI */}
        <div className="hidden lg:flex items-center space-x-8">
          {tabs.map((tab) => {
            const isActive = location.pathname === tab.path;
            return (
              <button
                key={tab.path}
                onClick={() => navigate(tab.path)}
                className={`text-xs uppercase tracking-wider font-bold transition-all relative py-2 cursor-pointer ${
                  isActive ? 'text-[#1C1A17] font-black' : 'text-zinc-400 hover:text-[#1C1A17]'
                }`}
              >
                <span>{tab.name}</span>
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-[#5D5FEF] rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Centered Search Command Input like Reference */}
      <div className="hidden md:flex items-center space-x-2 bg-white border border-zinc-200/80 rounded-full px-4 py-2 text-xs w-64 shadow-sm focus-within:border-[#5D5FEF] focus-within:ring-1 focus-within:ring-[#5D5FEF]/30 transition-all">
        <Search size={14} className="text-zinc-400" />
        <input
          type="text"
          placeholder="Search or type command"
          className="bg-transparent border-none outline-none text-xs text-zinc-800 w-full placeholder-zinc-400 font-medium"
        />
      </div>

      {/* Right side utilities */}
      <div className="flex items-center space-x-4">
        
        {/* Light / Dark Mode Toggle Pill like Reference */}
        <div className="hidden sm:flex items-center bg-white border border-zinc-200/80 rounded-full p-1 shadow-sm">
          <button className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-[#5D5FEF] text-white text-[10px] font-black uppercase tracking-wider shadow-sm transition-all">
            <Sun size={10} className="stroke-[3]" />
            <span>Light</span>
          </button>
          <button className="flex items-center space-x-1.5 px-3 py-1 rounded-full text-zinc-400 hover:text-zinc-700 text-[10px] font-bold uppercase tracking-wider transition-all">
            <Moon size={10} />
            <span>Dark</span>
          </button>
        </div>

        {/* Notification Bell */}
        <button
          onClick={() => navigate('/')}
          className="p-2.5 rounded-full bg-white border border-zinc-200/80 text-zinc-400 hover:text-zinc-800 transition-all cursor-pointer relative shadow-sm"
        >
          <Bell size={15} />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
        </button>

        {/* Settings Gear */}
        <button
          onClick={() => navigate('/logs')}
          className="p-2.5 rounded-full bg-white border border-zinc-200/80 text-zinc-400 hover:text-zinc-800 transition-all cursor-pointer shadow-sm"
        >
          <Settings size={15} />
        </button>

        {/* Export Data Button with Badge count */}
        <button 
          onClick={() => alert("Exporting database ledger values...")}
          className="hidden md:flex items-center space-x-2 bg-white hover:bg-zinc-50 border border-zinc-200/80 rounded-full px-4 py-2 text-xs text-zinc-700 font-bold transition-all shadow-sm cursor-pointer"
        >
          <span>Export data</span>
          <span className="w-5 h-5 bg-[#5D5FEF]/10 text-[#5D5FEF] rounded-full flex items-center justify-center text-[9px] font-mono font-black border border-[#5D5FEF]/20">
            2k
          </span>
        </button>

        {/* Add New Action Button */}
        <button
          onClick={() => navigate('/products')}
          className="bg-[#0F0E26] hover:bg-zinc-800 text-white rounded-full px-5 py-2 text-xs font-bold transition-all shadow-md cursor-pointer flex items-center space-x-1"
        >
          <span>Add new board</span>
        </button>

      </div>
    </header>
  );
};
