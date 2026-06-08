import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Sidebar } from './components/Sidebar';
import { Navbar } from './components/Navbar';
import { StartupIntro } from './components/StartupIntro';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Products } from './pages/Products';
import { Categories } from './pages/Categories';
import { InventoryLogs } from './pages/InventoryLogs';
import { Billing } from './pages/Billing';
import { BarcodeDesigner } from './pages/BarcodeDesigner';
import { Customers } from './pages/Customers';
import { Suppliers } from './pages/Suppliers';
import { AnimatePresence, motion } from 'framer-motion';

// Route animation wrapper
const PageWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -15, scale: 0.98 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }} // Apple style cubic-bezier transition
      className="w-full flex-1 flex flex-col"
    >
      {children}
    </motion.div>
  );
};

// Route Security Guard for Multi-User Roles
const RoleGate: React.FC<{ children: React.ReactNode; allowedRoles: string[] }> = ({ children, allowedRoles }) => {
  const { user } = useAuth();
  
  if (!user || !allowedRoles.includes(user.role)) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-white rounded-2xl border border-zinc-100 shadow-premium min-h-[400px] select-none">
        <div className="w-16 h-16 rounded-full bg-red-50 border border-red-100 flex items-center justify-center text-red-500 mb-4 text-xl shadow-[0_0_15px_rgba(239,68,68,0.05)]">
          🔒
        </div>
        <h2 className="text-sm font-extrabold text-[#111111] uppercase tracking-wider mb-2">Access Restricted</h2>
        <p className="text-xs text-zinc-500 max-w-xs leading-relaxed">
          You do not have the security clearance required to view this administrative audit trail.
        </p>
      </div>
    );
  }
  return <>{children}</>;
};

const AnimatedRoutes: React.FC = () => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<PageWrapper><Dashboard /></PageWrapper>} />
        <Route path="/products" element={<PageWrapper><Products /></PageWrapper>} />
        <Route path="/categories" element={<PageWrapper><Categories /></PageWrapper>} />
        <Route path="/customers" element={<PageWrapper><Customers /></PageWrapper>} />
        <Route path="/suppliers" element={<PageWrapper><Suppliers /></PageWrapper>} />
        <Route path="/logs" element={<PageWrapper><RoleGate allowedRoles={['admin', 'manager']}><InventoryLogs /></RoleGate></PageWrapper>} />
        <Route path="/billing" element={<PageWrapper><Billing /></PageWrapper>} />
        <Route path="/barcodes" element={<PageWrapper><BarcodeDesigner /></PageWrapper>} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </AnimatePresence>
  );
};

const AppContent: React.FC = () => {
  const { user, loading } = useAuth();
  const [showIntro, setShowIntro] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  // 1. Show startup intro first
  if (showIntro) {
    return <StartupIntro onComplete={() => setShowIntro(false)} />;
  }

  // 2. Show loading spinner while loading user authentication state
  if (loading) {
    return (
      <div className="min-h-screen w-screen bg-[#F8F9FA] flex items-center justify-center flex-col space-y-4">
        <div className="w-10 h-10 border-2 border-luxury-gold/20 border-t-luxury-gold rounded-full animate-spin" />
        <span className="text-[10px] tracking-widest uppercase text-luxury-bronze animate-pulse">Establishing Session Link...</span>
      </div>
    );
  }

  // 3. Unauthenticated Login Gate
  if (!user) {
    return <Login />;
  }

  const mainPanelLeftMargin = 'lg:pl-24';

  // 4. Authenticated ERP Panel Layout
  return (
    <div className="min-h-screen flex flex-col bg-[#F4F5FC] relative overflow-hidden">
      
      {/* Sidebar Navigation Drawer */}
      <Sidebar 
        collapsed={false} 
        setCollapsed={() => {}}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />

      {/* Main Panel Wrapper */}
      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${mainPanelLeftMargin} lg:py-4 lg:pr-4`}>
        
        {/* Navigation Header */}
        <Navbar setMobileOpen={setMobileOpen} />

        {/* Dynamic Route Content container */}
        <main className="flex-1 overflow-x-hidden py-6 px-6 lg:px-8 flex flex-col">
          <AnimatedRoutes />
        </main>
      </div>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
};
export default App;
