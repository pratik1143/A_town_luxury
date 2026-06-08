import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, Eye, EyeOff, LogIn } from 'lucide-react';
import { motion } from 'framer-motion';
import { LuxuryLogo } from '../components/LuxuryLogo';

export const Login: React.FC = () => {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Please fill in all security fields.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await login(username, password);
    } catch (err: any) {
      setError(err.message || 'Access Denied: Invalid security signature.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-screen bg-[#F8F9FA] flex items-center justify-center relative px-4 select-none z-10">
      
      {/* Golden spotlight radial background */}
      <div className="absolute inset-0 bg-gold-radial pointer-events-none z-0" />
      
      {/* Login Card Panel */}
      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className="w-full max-w-md rounded-2xl glass-panel-gold p-8 shadow-premium flex flex-col items-center relative"
      >
        
        {/* Glowing Monogram Branding */}
        <LuxuryLogo className="w-16 h-16 shadow-premium mb-6 select-none relative overflow-hidden" />

        <div className="text-center space-y-1 mb-8">
          <h1 className="text-xl md:text-2xl font-extrabold tracking-[0.2em] text-[#111111] uppercase font-sans">
            A TOWN LUXURY
          </h1>
          <p className="text-[9px] uppercase tracking-[0.3em] text-luxury-gold font-bold">
            CLOTHING SHOWROOM
          </p>
        </div>

        {error && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full p-3 mb-6 bg-red-50 border border-red-200 text-red-600 text-xs rounded-xl flex items-center gap-2"
          >
            <span>⚠️</span>
            <span>{error}</span>
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="w-full space-y-5">
          {/* Username/Email Input */}
          <div>
            <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold block mb-1.5">
              Access Signature (User / Email)
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                setError('');
              }}
              placeholder="e.g. admin"
              className="w-full bg-[#F8F9FA] border border-zinc-200 rounded-xl px-4 py-2.5 text-xs text-[#111111] focus:outline-none focus:border-luxury-gold/50 focus:bg-white transition-all"
              disabled={loading}
            />
          </div>

          {/* Password Input */}
          <div>
            <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold block mb-1.5">
              Security Keycode (Password)
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError('');
                }}
                placeholder="••••••••••••"
                className="w-full bg-[#F8F9FA] border border-zinc-200 rounded-xl pl-4 pr-10 py-2.5 text-xs text-[#111111] focus:outline-none focus:border-luxury-gold/50 focus:bg-white transition-all"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-zinc-400 hover:text-zinc-600"
                disabled={loading}
              >
                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          {/* Remember secure link info box */}
          <div className="flex items-center space-x-2 text-[10px] text-zinc-500 py-1 font-medium bg-zinc-50 p-3 rounded-lg border border-zinc-100">
            <ShieldCheck size={12} className="text-luxury-gold" />
            <span>Establishing secure terminal connection...</span>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-[#111111] hover:bg-zinc-800 text-white font-extrabold rounded-xl text-xs uppercase tracking-widest transition-all duration-200 shadow-premium flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <>Establishing Connection...</>
            ) : (
              <>Authenticate Credentials <LogIn size={12} /></>
            )}
          </button>
        </form>

        {/* Demo Credentials Box */}
        <div className="mt-8 pt-6 border-t border-zinc-100 w-full text-center">
          <p className="text-[9px] uppercase tracking-wider text-zinc-400 font-bold">
            Intake Security Overrides (Password: luxuryadmin123)
          </p>
          <div className="mt-3 grid grid-cols-3 gap-2 text-[9px] font-mono bg-zinc-50 border border-zinc-200/50 rounded-lg p-2.5">
            <div className="text-zinc-600">Admin:<br /><strong className="text-black">admin</strong></div>
            <div className="text-zinc-600 border-l border-zinc-200/60">Manager:<br /><strong className="text-black">manager</strong></div>
            <div className="text-zinc-600 border-l border-zinc-200/60">Cashier:<br /><strong className="text-black">cashier</strong></div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
