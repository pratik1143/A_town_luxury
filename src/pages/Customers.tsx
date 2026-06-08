import React, { useEffect, useState } from 'react';
import { listenCustomers, addCustomer, updateCustomer } from '../firebase/db';
import { useAuth } from '../context/AuthContext';
import { 
  Users, 
  Search, 
  Plus, 
  Wallet, 
  Award, 
  ShoppingBag, 
  Sparkles, 
  X, 
  History, 
  UserCheck 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const Customers: React.FC = () => {
  const { user } = useAuth();
  const [customers, setCustomers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [bills, setBills] = useState<any[]>([]);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [selectedCust, setSelectedCust] = useState<any | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [walletAdjustment, setWalletAdjustment] = useState<number>(0);
  const [walletAction, setWalletAction] = useState<'add' | 'deduct'>('add');

  useEffect(() => {
    const unsub = listenCustomers(setCustomers);
    
    // Fetch bills to map purchase history
    const savedBills = localStorage.getItem('town_bills_registry');
    if (savedBills) {
      try {
        setBills(JSON.parse(savedBills));
      } catch {
        setBills([]);
      }
    }

    return () => unsub();
  }, []);

  // Filter
  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone.toLowerCase().includes(search.toLowerCase()) ||
    (c.email && c.email.toLowerCase().includes(search.toLowerCase()))
  );

  // Computations
  const totalPoints = customers.reduce((acc, c) => acc + (c.rewardPoints || 0), 0);
  const totalWallet = customers.reduce((acc, c) => acc + (c.walletBalance || 0), 0);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) return;

    await addCustomer({
      name,
      phone,
      email,
      address,
      rewardPoints: 0,
      walletBalance: 0
    }, user ? { uid: user.uid, fullName: user.fullName } : undefined);

    // Reset
    setName('');
    setPhone('');
    setEmail('');
    setAddress('');
    setIsAddModalOpen(false);
  };

  const handleWalletSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCust || walletAdjustment <= 0) return;

    const currentBal = selectedCust.walletBalance || 0;
    const nextBal = walletAction === 'add' 
      ? currentBal + walletAdjustment 
      : Math.max(0, currentBal - walletAdjustment);

    await updateCustomer(selectedCust.id, {
      walletBalance: nextBal
    }, user ? { uid: user.uid, fullName: user.fullName } : undefined);

    setWalletAdjustment(0);
    setIsWalletModalOpen(false);
    setSelectedCust(null);
  };

  // AI customer recommendations simulation
  const getAIRecommendations = (cust: any) => {
    // Generate dummy recommendations based on name hash or email for demo
    const brands = ["A Town Luxury Premium", "A Town Classics", "Luxury Silk Collections", "Mohali Cotton Co."];
    const items = ["King Size Bedsheet", "Luxury Comforter", "Embroidery Cushion Cover", "Velvet Curtains"];
    const hash = cust.name.length;
    const recBrand = brands[hash % brands.length];
    const recItem = items[(hash * 3) % items.length];
    return { brand: recBrand, item: recItem, confidence: 94 + (hash % 6) };
  };

  const getCustomerBills = (custPhone: string) => {
    // Find bills where customer details match (or bill id belongs to customer)
    // For localPOS, we can check if customer details exist in recent bills
    return bills.filter(b => b.customerPhone === custPhone || b.id.includes(custPhone.slice(-4)));
  };

  return (
    <div className="space-y-8 select-none z-10 relative text-[#111111]">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <span className="text-[9px] uppercase tracking-widest text-luxury-gold font-bold">
            CRM Directory
          </span>
          <h1 className="text-2xl md:text-3xl font-extrabold text-black tracking-wide uppercase font-sans mt-0.5">
            Customer Database
          </h1>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="self-start sm:self-center px-4 py-2.5 bg-[#111111] text-white rounded-xl text-xs font-bold hover:bg-zinc-800 transition-all flex items-center gap-1.5 shadow-premium cursor-pointer"
        >
          <Plus size={14} className="text-luxury-gold" /> Add Customer
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="rounded-2xl bg-white border border-zinc-100 p-6 shadow-premium flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-zinc-50 border border-zinc-100 flex items-center justify-center text-luxury-gold">
            <Users size={20} />
          </div>
          <div>
            <span className="text-[9.5px] uppercase tracking-wider text-zinc-500 font-bold block">Total Members</span>
            <span className="text-2xl font-extrabold text-black">{customers.length}</span>
          </div>
        </div>

        <div className="rounded-2xl bg-white border border-zinc-100 p-6 shadow-premium flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-zinc-50 border border-zinc-100 flex items-center justify-center text-luxury-gold">
            <Award size={20} />
          </div>
          <div>
            <span className="text-[9.5px] uppercase tracking-wider text-zinc-500 font-bold block">Loyalty Points Issued</span>
            <span className="text-2xl font-extrabold text-black">{totalPoints} pts</span>
          </div>
        </div>

        <div className="rounded-2xl bg-white border border-zinc-100 p-6 shadow-premium flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-zinc-50 border border-zinc-100 flex items-center justify-center text-luxury-gold">
            <Wallet size={20} />
          </div>
          <div>
            <span className="text-[9.5px] uppercase tracking-wider text-zinc-500 font-bold block">Wallet Reserves</span>
            <span className="text-2xl font-extrabold text-black font-mono">Rs. {totalWallet.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Toolbar filter */}
      <div className="p-4 rounded-2xl bg-white border border-zinc-100 shadow-premium flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:max-w-md">
          <Search size={14} className="absolute left-3 top-3.5 text-zinc-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, phone or email..."
            className="w-full bg-[#F8F9FA] border border-zinc-200/60 rounded-xl pl-9 pr-4 py-2.5 text-xs text-[#111111] focus:outline-none focus:border-luxury-gold/50 focus:bg-white placeholder-zinc-400 transition-all"
          />
        </div>
        <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
          Listing {filteredCustomers.length} registered profiles
        </div>
      </div>

      {/* CRM Directory Table */}
      {filteredCustomers.length > 0 ? (
        <div className="rounded-2xl border border-zinc-100 bg-white overflow-hidden shadow-premium">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse premium-table">
              <thead>
                <tr>
                  <th>Customer Profile</th>
                  <th>Contact Details</th>
                  <th>Loyalty points</th>
                  <th>Wallet Credit</th>
                  <th>AI Insights</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map((cust) => {
                  const ai = getAIRecommendations(cust);
                  const custBills = getCustomerBills(cust.phone);
                  return (
                    <tr key={cust.id}>
                      <td>
                        <div className="flex items-center space-x-3">
                          <div className="w-9 h-9 rounded-full bg-zinc-50 border border-zinc-100 flex items-center justify-center text-luxury-gold font-bold text-xs uppercase">
                            {cust.name.substring(0, 2)}
                          </div>
                          <div>
                            <p className="font-extrabold text-[#111111] text-xs">{cust.name}</p>
                            <span className="text-[9px] text-zinc-500 uppercase">Since: {new Date(cust.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <p className="text-xs font-bold text-[#111111]">{cust.phone}</p>
                        <span className="text-[10px] text-zinc-500 block truncate max-w-[150px]">{cust.email || 'No email registered'}</span>
                      </td>
                      <td>
                        <div className="flex items-center space-x-1.5">
                          <Award size={12} className="text-luxury-gold" />
                          <span className="font-bold text-xs">{cust.rewardPoints || 0} pts</span>
                        </div>
                      </td>
                      <td>
                        <span className="font-mono text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-lg">
                          Rs. {cust.walletBalance || 0}
                        </span>
                      </td>
                      <td>
                        <div className="p-2 bg-yellow-50/50 border border-yellow-200/30 rounded-xl max-w-[200px]">
                          <span className="text-[8px] uppercase tracking-wider text-luxury-gold font-extrabold flex items-center gap-0.5">
                            <Sparkles size={8} /> AI Recommend ({ai.confidence}%)
                          </span>
                          <p className="text-[9.5px] font-bold text-zinc-700 truncate">{ai.brand} {ai.item}</p>
                        </div>
                      </td>
                      <td className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setSelectedCust(cust);
                              setIsWalletModalOpen(true);
                            }}
                            className="p-2 hover:bg-zinc-50 border border-zinc-100 rounded-lg text-zinc-600 hover:text-black transition-colors cursor-pointer"
                            title="Manage Wallet"
                          >
                            <Wallet size={12} />
                          </button>
                          
                          <button
                            onClick={() => {
                              setSelectedCust(cust);
                              setIsHistoryOpen(true);
                            }}
                            className="px-2.5 py-1.5 border border-zinc-100 hover:bg-zinc-50 rounded-lg text-zinc-500 hover:text-black transition-colors text-[9.5px] font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer"
                          >
                            <History size={10} /> History ({custBills.length})
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl bg-white p-12 border border-zinc-100 text-center space-y-3 shadow-premium">
          <div className="w-12 h-12 bg-zinc-50 border border-zinc-100 rounded-full flex items-center justify-center text-zinc-400 mx-auto">
            <Users size={16} />
          </div>
          <p className="text-xs text-zinc-500 font-semibold uppercase tracking-wider">No matching customers</p>
          <p className="text-[10px] text-zinc-400">Add a new member profile to start capturing loyalty sales.</p>
        </div>
      )}

      {/* Add Customer Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border border-zinc-100 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4"
            >
              <div className="flex justify-between items-center pb-2 border-b border-zinc-100">
                <h3 className="text-xs uppercase font-extrabold tracking-widest text-[#111111] flex items-center gap-1">
                  <UserCheck size={14} className="text-luxury-gold" /> CRM Member Intake
                </h3>
                <button 
                  onClick={() => setIsAddModalOpen(false)} 
                  className="p-1 hover:bg-zinc-100 rounded-lg text-zinc-400 hover:text-black cursor-pointer"
                >
                  <X size={14} />
                </button>
              </div>

              <form onSubmit={handleAddSubmit} className="space-y-4 text-left">
                <div>
                  <label className="text-[9.5px] uppercase tracking-wider text-zinc-500 font-bold block mb-1">Customer Full Name *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Rahul Sharma"
                    className="w-full bg-[#F8F9FA] border border-zinc-200 rounded-xl px-3 py-2 text-xs text-[#111111] focus:outline-none focus:border-luxury-gold/50 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="text-[9.5px] uppercase tracking-wider text-zinc-500 font-bold block mb-1">Mobile Number *</label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. +91 98765 43210"
                    className="w-full bg-[#F8F9FA] border border-zinc-200 rounded-xl px-3 py-2 text-xs text-[#111111] focus:outline-none focus:border-luxury-gold/50 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="text-[9.5px] uppercase tracking-wider text-zinc-500 font-bold block mb-1">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. rahul@gmail.com"
                    className="w-full bg-[#F8F9FA] border border-zinc-200 rounded-xl px-3 py-2 text-xs text-[#111111] focus:outline-none focus:border-luxury-gold/50 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="text-[9.5px] uppercase tracking-wider text-zinc-500 font-bold block mb-1">Residence Address</label>
                  <textarea
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Street, City, Pin"
                    rows={2}
                    className="w-full bg-[#F8F9FA] border border-zinc-200 rounded-xl px-3 py-2 text-xs text-[#111111] focus:outline-none focus:border-luxury-gold/50 focus:bg-white resize-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-[#111111] hover:bg-zinc-800 text-white font-extrabold rounded-xl text-xs uppercase tracking-widest transition-all cursor-pointer shadow-premium"
                >
                  Intake Customer Profile
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Wallet Modal */}
      <AnimatePresence>
        {isWalletModalOpen && selectedCust && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border border-zinc-100 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4"
            >
              <div className="flex justify-between items-center pb-2 border-b border-zinc-100">
                <h3 className="text-xs uppercase font-extrabold tracking-widest text-[#111111] flex items-center gap-1">
                  <Wallet size={14} className="text-luxury-gold" /> Customer Wallet Ledger
                </h3>
                <button 
                  onClick={() => setIsWalletModalOpen(false)} 
                  className="p-1 hover:bg-zinc-100 rounded-lg text-zinc-400 hover:text-black cursor-pointer"
                >
                  <X size={14} />
                </button>
              </div>

              <div className="p-3 bg-zinc-50 border border-zinc-100 rounded-xl text-xs space-y-1">
                <p className="font-bold text-zinc-700">Customer: {selectedCust.name}</p>
                <p className="text-zinc-500 font-mono">Current Wallet Credit: <span className="font-bold text-green-600">Rs. {selectedCust.walletBalance || 0}</span></p>
              </div>

              <form onSubmit={handleWalletSubmit} className="space-y-4 text-left">
                <div>
                  <label className="text-[9.5px] uppercase tracking-wider text-zinc-500 font-bold block mb-1">Adjustment Action</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setWalletAction('add')}
                      className={`p-2 rounded-xl text-xs font-bold uppercase border cursor-pointer ${
                        walletAction === 'add'
                          ? 'bg-green-50 border-green-200 text-green-600'
                          : 'bg-white border-zinc-200 text-zinc-500 hover:bg-zinc-50'
                      }`}
                    >
                      Add Credit
                    </button>
                    <button
                      type="button"
                      onClick={() => setWalletAction('deduct')}
                      className={`p-2 rounded-xl text-xs font-bold uppercase border cursor-pointer ${
                        walletAction === 'deduct'
                          ? 'bg-red-50 border-red-200 text-red-600'
                          : 'bg-white border-zinc-200 text-zinc-500 hover:bg-zinc-50'
                      }`}
                    >
                      Deduct Balance
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-[9.5px] uppercase tracking-wider text-zinc-500 font-bold block mb-1">Adjustment Amount (Rs.) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={walletAdjustment || ''}
                    onChange={(e) => setWalletAdjustment(Number(e.target.value))}
                    placeholder="0.00"
                    className="w-full bg-[#F8F9FA] border border-zinc-200 rounded-xl px-3 py-2 text-xs text-[#111111] focus:outline-none focus:border-luxury-gold/50 focus:bg-white"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-[#111111] hover:bg-zinc-800 text-white font-extrabold rounded-xl text-xs uppercase tracking-widest transition-all cursor-pointer shadow-premium"
                >
                  Adjust Wallet Balance
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* History Drawer Modal */}
      <AnimatePresence>
        {isHistoryOpen && selectedCust && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[999] flex items-center justify-end">
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="bg-white border-l border-zinc-100 w-full max-w-md h-full shadow-2xl flex flex-col justify-between"
            >
              <div className="p-6 border-b border-zinc-100 flex justify-between items-center">
                <div>
                  <span className="text-[8px] uppercase tracking-wider text-luxury-gold font-bold">Purchase Audit</span>
                  <h3 className="text-sm font-extrabold text-[#111111] uppercase tracking-wide">
                    {selectedCust.name}'s History
                  </h3>
                </div>
                <button 
                  onClick={() => setIsHistoryOpen(false)} 
                  className="p-1.5 hover:bg-zinc-100 rounded-lg text-zinc-400 hover:text-black cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {getCustomerBills(selectedCust.phone).length > 0 ? (
                  getCustomerBills(selectedCust.phone).map((b: any) => (
                    <div key={b.id} className="p-4 rounded-xl border border-zinc-100 bg-[#F8F9FA] space-y-2 text-xs">
                      <div className="flex justify-between items-center font-mono font-bold text-zinc-800">
                        <span>{b.id}</span>
                        <span className="text-[10px] text-zinc-500">{b.date.split(',')[0]}</span>
                      </div>
                      <div className="border-t border-zinc-200/50 pt-2 flex justify-between">
                        <span className="text-zinc-500">Items: {b.items.length} lines</span>
                        <span className="font-bold text-black font-mono">Rs. {b.total}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-zinc-400 text-xs gap-1 py-12">
                    <ShoppingBag size={20} className="text-zinc-300 animate-pulse" />
                    No purchases logged for this user.
                  </div>
                )}
              </div>

              <div className="p-6 border-t border-zinc-100 bg-zinc-50 text-[10px] text-zinc-500 flex items-center justify-between">
                <span>Loyalty: <strong>{selectedCust.rewardPoints || 0} Points</strong></span>
                <span>Reserves: <strong>Rs. {selectedCust.walletBalance || 0} Balance</strong></span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
