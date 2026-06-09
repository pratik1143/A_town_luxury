import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, Eye, EyeOff, LogIn, UserPlus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { LuxuryLogo } from '../components/LuxuryLogo';

export const Login: React.FC = () => {
  const { login, register } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (isRegister) {
      if (!fullName.trim() || !username.trim() || !password.trim()) {
        setError('Please fill in all registration fields.');
        return;
      }
      if (password.length < 6) {
        setError('Security Keycode (Password) must be at least 6 characters.');
        return;
      }

      setLoading(true);
      try {
        await register(username, password, fullName);
      } catch (err: any) {
        setError(err.message || 'Registration failed.');
      } finally {
        setLoading(false);
      }
    } else {
      if (!username.trim() || !password.trim()) {
        setError('Please fill in all security fields.');
        return;
      }

      setLoading(true);
      try {
        await login(username, password);
      } catch (err: any) {
        setError(err.message || 'Access Denied: Invalid security signature.');
      } finally {
        setLoading(false);
      }
    }
  };

  const toggleMode = () => {
    setIsRegister(!isRegister);
    setError('');
    setFullName('');
    setUsername('');
    setPassword('');
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

        <div className="text-center space-y-1 mb-6">
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
            <span className="font-medium">{error}</span>
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="w-full space-y-4">
          <AnimatePresence mode="wait">
            {isRegister && (
              <motion.div
                key="fullname-input"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold block mb-1.5">
                  Full Name / Operator Name
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => {
                    setFullName(e.target.value);
                    setError('');
                  }}
                  placeholder="e.g. Harish Chaudhary"
                  className="w-full bg-[#F8F9FA] border border-zinc-200 rounded-xl px-4 py-2.5 text-xs text-[#111111] focus:outline-none focus:border-luxury-gold/50 focus:bg-white transition-all"
                  disabled={loading}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Username/Email Input */}
          <div>
            <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold block mb-1.5">
              {isRegister ? 'Access Email Address' : 'Access Signature (User / Email)'}
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                setError('');
              }}
              placeholder={isRegister ? "harish@gmail.com" : "e.g. admin"}
              className="w-full bg-[#F8F9FA] border border-zinc-200 rounded-xl px-4 py-2.5 text-xs text-[#111111] focus:outline-none focus:border-luxury-gold/50 focus:bg-white transition-all"
              disabled={loading}
            />
          </div>

          {/* Password Input */}
          <div>
            <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold block mb-1.5">
              {isRegister ? 'New Security Keycode (Password)' : 'Security Keycode (Password)'}
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
            <span>{isRegister ? 'Ready to configure user node...' : 'Establishing secure terminal connection...'}</span>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-[#111111] hover:bg-zinc-800 text-white font-extrabold rounded-xl text-xs uppercase tracking-widest transition-all duration-200 shadow-premium flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <>{isRegister ? 'Creating Node...' : 'Establishing Connection...'}</>
            ) : (
              <>
                {isRegister ? (
                  <>Create Access Account <UserPlus size={12} /></>
                ) : (
                  <>Authenticate Credentials <LogIn size={12} /></>
                )}
              </>
            )}
          </button>
        </form>

        {/* Toggle Mode Button */}
        <div className="mt-4 text-center">
          <button
            onClick={toggleMode}
            disabled={loading}
            className="text-xs text-luxury-gold hover:text-luxury-bronze font-bold transition-all cursor-pointer"
          >
            {isRegister ? 'Already have an authorized key? Sign In' : 'No account? Request Terminal Access Key'}
          </button>
        </div>

        {/* Demo Credentials Box - Only shown in login mode */}
        {!isRegister && (
          <div className="mt-6 pt-5 border-t border-zinc-100 w-full text-center">
            <p className="text-[9px] uppercase tracking-wider text-zinc-400 font-bold">
              Intake Security Overrides (Password: luxuryadmin123)
            </p>
            <div className="mt-2.5 grid grid-cols-3 gap-2 text-[9px] font-mono bg-zinc-50 border border-zinc-200/50 rounded-lg p-2.5">
              <div className="text-zinc-600">Admin:<br /><strong className="text-black">admin</strong></div>
              <div className="text-zinc-600 border-l border-zinc-200/60">Manager:<br /><strong className="text-black">manager</strong></div>
              <div className="text-zinc-600 border-l border-zinc-200/60">Cashier:<br /><strong className="text-black">cashier</strong></div>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};
export default Login;
