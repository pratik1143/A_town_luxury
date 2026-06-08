import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, ShieldCheck, Terminal, ShoppingBag, Trash2, Edit2, TrendingUp
} from 'lucide-react';
import { listenProducts } from '../firebase/db';
import { useAuth } from '../context/AuthContext';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [products, setProducts] = useState<any[]>([]);
  const [bills, setBills] = useState<any[]>([]);
  const [notificationToggle, setNotificationToggle] = useState(true);
  const [activeDateIndex, setActiveDateIndex] = useState(4); // 18th May index
  
  useEffect(() => {
    const unsubProducts = listenProducts(setProducts);

    const fetchBills = () => {
      const savedBills = localStorage.getItem('town_bills_registry');
      if (savedBills) {
        try {
          setBills(JSON.parse(savedBills));
        } catch {
          setBills([]);
        }
      }
    };
    fetchBills();

    window.addEventListener('storage', fetchBills);
    return () => {
      unsubProducts();
      window.removeEventListener('storage', fetchBills);
    };
  }, []);

  const totalProductsCount = products.length;

  const todaySalesTotal = bills.reduce((acc, bill) => {
    try {
      const todayDateStr = new Date().toLocaleDateString();
      const billDateStr = new Date(bill.date).toLocaleDateString();
      if (billDateStr === todayDateStr) {
        return acc + (Number(bill.total) || 0);
      }
      const datePart = bill.date.split(',')[0].trim();
      const todayFormatted = new Date().toLocaleString([], { hour12: false }).split(',')[0].trim();
      if (datePart === todayFormatted) {
        return acc + (Number(bill.total) || 0);
      }
    } catch (e) {
      console.warn("Date parse error for bill:", bill.date, e);
    }
    return acc;
  }, 0);

  const todayInvoicesCount = bills.filter(bill => {
    try {
      const todayDateStr = new Date().toLocaleDateString();
      const billDateStr = new Date(bill.date).toLocaleDateString();
      if (billDateStr === todayDateStr) return true;
      const datePart = bill.date.split(',')[0].trim();
      const todayFormatted = new Date().toLocaleString([], { hour12: false }).split(',')[0].trim();
      return datePart === todayFormatted;
    } catch {
      return false;
    }
  }).length;

  // Calendar dates mock
  const calendarDays = [
    { day: 'Mon', num: 14 },
    { day: 'Tue', num: 15 },
    { day: 'Wed', num: 16 },
    { day: 'Thu', num: 17 },
    { day: 'Fri', num: 18 },
    { day: 'Sat', num: 19 },
    { day: 'Sun', num: 20 },
  ];

  return (
    <div className="w-full text-[#1C1A17] space-y-8 pb-12 select-none">
      
      {/* Top Greeting and Hero Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-center">
        
        {/* Left Greeting Text Area */}
        <div className="xl:col-span-1 space-y-3">
          <div className="flex items-center space-x-3">
            <h1 className="text-4xl font-extrabold tracking-tight text-[#1C1A17]">
              Hi, {user?.fullName ? user.fullName.split(' ')[0] : 'James'}!
            </h1>
            {/* Visual overlapping avatars */}
            <div className="flex -space-x-2">
              <div className="w-7 h-7 rounded-full bg-[#5D5FEF]/20 border-2 border-[#F4F5FC] flex items-center justify-center text-[10px] font-bold text-[#5D5FEF]">
                JD
              </div>
              <div className="w-7 h-7 rounded-full bg-emerald-500/20 border-2 border-[#F4F5FC] flex items-center justify-center text-[10px] font-bold text-emerald-600">
                HC
              </div>
            </div>
          </div>
          <h2 className="text-3xl font-black text-[#1C1A17] leading-tight">
            What are your plans for today?
          </h2>
          <p className="text-xs text-zinc-500 font-medium leading-relaxed max-w-sm">
            This platform is designed to revolutionize the way you organize, view and track your showroom inventory and real-time sales transactions.
          </p>
        </div>

        {/* Right Cards Row (Flex row of cards) */}
        <div className="xl:col-span-2 grid grid-cols-1 sm:grid-cols-4 gap-4">
          
          {/* Card 1: Add New Button Card */}
          <div 
            onClick={() => navigate('/products')}
            className="bg-[#5D5FEF]/5 border-2 border-dashed border-[#5D5FEF]/30 hover:border-[#5D5FEF]/60 rounded-3xl p-5 flex flex-col justify-center items-center h-44 cursor-pointer transition-all duration-300 group"
          >
            <div className="w-10 h-10 rounded-full bg-[#5D5FEF] text-white flex items-center justify-center shadow-md group-hover:scale-110 transition-all">
              <Plus size={20} className="stroke-[3]" />
            </div>
          </div>

          {/* Card 2: Stay Organized Card */}
          <div className="bg-white border border-zinc-200/80 rounded-3xl p-5 flex flex-col justify-between h-44 shadow-sm">
            <div className="space-y-1">
              <div className="w-8 h-8 rounded-lg bg-[#5D5FEF]/10 flex items-center justify-center text-[#5D5FEF]">
                <ShoppingBag size={16} />
              </div>
            </div>
            <div className="space-y-1">
              <h4 className="text-xs font-black text-[#1C1A17] uppercase tracking-wider">Stay organized</h4>
              <p className="text-[10px] text-zinc-400 font-bold leading-normal">
                {totalProductsCount} Styles loaded in catalog
              </p>
            </div>
          </div>

          {/* Card 3: Today's Sales Card */}
          <div className="bg-white border border-zinc-200/80 rounded-3xl p-5 flex flex-col justify-between h-44 shadow-sm">
            <div className="space-y-1">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                <TrendingUp size={16} />
              </div>
            </div>
            <div className="space-y-1">
              <h4 className="text-xs font-black text-[#1C1A17] uppercase tracking-wider">Today's Sales</h4>
              <p className="text-base font-black text-emerald-600 font-mono tracking-tight">
                Rs. {todaySalesTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
              <p className="text-[10px] text-zinc-400 font-bold leading-normal">
                {todayInvoicesCount} invoices billed today
              </p>
            </div>
          </div>

          {/* Card 4: Collaborate and share Card */}
          <div className="bg-white border border-zinc-200/80 rounded-3xl p-5 flex flex-col justify-between h-44 shadow-sm">
            <div className="space-y-1">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-600">
                <Terminal size={16} />
              </div>
            </div>
            <div className="space-y-1">
              <h4 className="text-xs font-black text-[#1C1A17] uppercase tracking-wider">Checkout terminals</h4>
              <p className="text-[10px] text-zinc-400 font-bold leading-normal">
                Active registers: Counter #1
              </p>
            </div>
          </div>

        </div>

      </div>

      {/* Middle Row: Notifications, Assignments, Calendar Schedule */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Widget 1: Notifications */}
        <div className="bg-white border border-zinc-200/80 rounded-[2rem] p-6 shadow-sm flex flex-col justify-between space-y-4 min-h-[360px]">
          <div className="flex justify-between items-center pb-2 border-b border-zinc-100">
            <h3 className="text-sm font-black text-[#1C1A17] uppercase tracking-wider">Notifications</h3>
            <button className="text-[10px] font-bold text-zinc-400 hover:text-zinc-600 uppercase tracking-widest">Clear</button>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto pr-1 scrollbar-none">
            {/* Event notifications layout */}
            <div className="bg-zinc-50 border border-zinc-100 rounded-2xl p-4 space-y-2 relative">
              <div className="flex justify-between items-start">
                <div className="space-y-0.5">
                  <span className="text-[9px] uppercase tracking-widest font-black text-[#5D5FEF] flex items-center gap-1">
                    Upcoming event <span className="w-1.5 h-1.5 bg-[#5D5FEF] rounded-full animate-ping" />
                  </span>
                  <p className="text-[11px] font-black text-[#1C1A17]">Landing design meeting</p>
                </div>
                <div className="flex items-center space-x-2">
                  <button 
                    onClick={() => setNotificationToggle(!notificationToggle)}
                    className={`w-7 h-4 rounded-full p-0.5 transition-all ${
                      notificationToggle ? 'bg-[#5D5FEF] flex justify-end' : 'bg-zinc-300 flex justify-start'
                    }`}
                  >
                    <span className="w-3 h-3 rounded-full bg-white shadow-sm" />
                  </button>
                </div>
              </div>
              <p className="text-[9px] text-zinc-400 font-bold">Duration | Time: 120 min</p>
              <div className="flex items-center space-x-4 pt-1 text-[10px] font-bold text-zinc-500 font-mono">
                <span>📅 Sat, 10 May</span>
                <span>⏰ 11 AM - 11:45 AM</span>
              </div>
            </div>

            {/* Direct message block */}
            <div className="bg-zinc-50 border border-zinc-100 rounded-2xl p-4 flex items-center justify-between">
              <div className="space-y-1">
                <h4 className="text-[11px] font-black text-[#1C1A17]">Message | Product design</h4>
                <p className="text-[9px] text-zinc-400 font-bold">Harish: "Check low stock alerts on bedcovers"</p>
              </div>
              <div className="flex items-center space-x-1">
                <button className="p-1.5 hover:bg-zinc-200 rounded-lg text-zinc-500">
                  <Edit2 size={10} />
                </button>
                <button className="p-1.5 hover:bg-zinc-200 rounded-lg text-red-500">
                  <Trash2 size={10} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Widget 2: Assignments */}
        <div className="bg-white border border-zinc-200/80 rounded-[2rem] p-6 shadow-sm flex flex-col justify-between space-y-4 min-h-[360px]">
          <div className="flex justify-between items-center pb-2 border-b border-zinc-100">
            <h3 className="text-sm font-black text-[#1C1A17] uppercase tracking-wider">Assignments</h3>
            <button className="text-[10px] font-bold text-zinc-400 hover:text-zinc-600 uppercase tracking-widest">Edit</button>
          </div>

          <div className="flex-1 space-y-4 mt-2">
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full bg-[#5D5FEF]/10 text-[#5D5FEF] text-[8px] font-black uppercase tracking-wider">Motion design</span>
              <span className="px-2.5 py-0.5 rounded-full bg-[#5D5FEF]/10 text-[#5D5FEF] text-[8px] font-black uppercase tracking-wider">Logo</span>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-start">
                <h4 className="text-xs font-black text-[#1C1A17] leading-snug max-w-xs">
                  Design a packaging concept for a new product
                </h4>
                <span className="px-2 py-0.5 rounded bg-red-100 text-red-600 text-[8px] font-black uppercase tracking-wider">
                  High
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 rounded-full bg-[#5D5FEF]/20 text-[#5D5FEF] font-bold text-[9px] flex items-center justify-center">
                  RL
                </div>
                <span className="text-[10px] text-zinc-500 font-bold">Rachel Lee</span>
              </div>
            </div>

            <button 
              onClick={() => navigate('/products')}
              className="w-full py-2.5 bg-[#5D5FEF]/10 hover:bg-[#5D5FEF]/20 text-[#5D5FEF] rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5"
            >
              <Plus size={14} className="stroke-[2.5]" /> Add new assignment
            </button>
          </div>
        </div>

        {/* Widget 3: Calendar Schedule */}
        <div className="bg-white border border-zinc-200/80 rounded-[2rem] p-6 shadow-sm flex flex-col justify-between space-y-4 min-h-[360px]">
          <div className="flex justify-between items-center pb-2 border-b border-zinc-100">
            <h3 className="text-sm font-black text-[#1C1A17] uppercase tracking-wider">May 2021</h3>
            <div className="flex space-x-1">
              <button className="w-5 h-5 rounded-full bg-zinc-100 hover:bg-zinc-200 flex items-center justify-center text-[10px] text-zinc-500 font-bold">◀</button>
              <button className="w-5 h-5 rounded-full bg-zinc-100 hover:bg-zinc-200 flex items-center justify-center text-[10px] text-zinc-500 font-bold">▶</button>
            </div>
          </div>

          {/* Week date row */}
          <div className="grid grid-cols-7 gap-1 text-center font-mono">
            {calendarDays.map((cal, idx) => {
              const isSelected = activeDateIndex === idx;
              return (
                <button
                  key={idx}
                  onClick={() => setActiveDateIndex(idx)}
                  className={`py-2 rounded-xl transition-all cursor-pointer flex flex-col items-center justify-center space-y-1 ${
                    isSelected ? 'bg-[#5D5FEF] text-white shadow-md' : 'hover:bg-zinc-50 text-zinc-400'
                  }`}
                >
                  <span className="text-[8px] uppercase font-bold">{cal.day}</span>
                  <span className="text-xs font-black">{cal.num}</span>
                </button>
              );
            })}
          </div>

          {/* Daily schedule listing */}
          <div className="space-y-3 font-mono">
            <div className="flex items-start space-x-3">
              <span className="text-[8px] font-bold text-zinc-400 uppercase pt-0.5">04:30 - 05:00 PM</span>
              <div className="flex-1 bg-[#5D5FEF]/5 border-l-4 border-[#5D5FEF] p-2.5 rounded-r-xl space-y-1">
                <h5 className="text-[10px] font-black text-[#1C1A17]">Team meeting</h5>
                <p className="text-[8px] text-zinc-400">12:00 - 12:30 • UI/UX design</p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <span className="text-[8px] font-bold text-zinc-400 uppercase pt-0.5">11:30 - 12:30 PM</span>
              <div className="flex-1 bg-zinc-50 border-l-4 border-zinc-300 p-2.5 rounded-r-xl space-y-1">
                <h5 className="text-[10px] font-black text-[#1C1A17]">Meeting with new client</h5>
                <p className="text-[8px] text-zinc-400">Discuss apparel custom orders</p>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Bottom Row: Today tasks, Go Premium Promo, Analytics & Boards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Widget 1: Today tasks */}
        <div className="bg-white border border-zinc-200/80 rounded-[2rem] p-6 shadow-sm flex flex-col justify-between space-y-4 min-h-[380px]">
          <div className="flex justify-between items-center pb-2 border-b border-zinc-100">
            <div className="flex items-center space-x-2">
              <h3 className="text-sm font-black text-[#1C1A17] uppercase tracking-wider">Today tasks</h3>
              {/* Profile indicators */}
              <div className="flex -space-x-1">
                <div className="w-5 h-5 rounded-full bg-[#5D5FEF]/20 text-[#5D5FEF] font-bold text-[8px] flex items-center justify-center">R</div>
                <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-600 font-bold text-[8px] flex items-center justify-center">H</div>
              </div>
            </div>
            <div className="flex items-center space-x-2 text-[10px] font-bold text-zinc-400 uppercase font-mono">
              <button className="hover:text-zinc-600">Edit</button>
              <span>•</span>
              <button className="hover:text-zinc-600">Share</button>
            </div>
          </div>

          <div className="flex-1 space-y-4 pr-1 scrollbar-none mt-2">
            {/* Task Row 1 */}
            <div className="space-y-1">
              <div className="flex justify-between items-center text-xs">
                <span className="font-black text-[#1C1A17]">Conduct research</span>
                <span className="text-[10px] text-zinc-400 font-bold">Duration: 02 h 45 m</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="flex-1 h-1.5 rounded-full bg-zinc-100 relative">
                  <div className="absolute top-0 bottom-0 left-0 bg-[#5D5FEF] rounded-full" style={{ width: '90%' }} />
                </div>
                <span className="text-[10px] font-bold text-[#5D5FEF] font-mono">90%</span>
              </div>
            </div>

            {/* Task Row 2 */}
            <div className="space-y-1">
              <div className="flex justify-between items-center text-xs">
                <span className="font-black text-[#1C1A17]">Schedule a meeting</span>
                <span className="text-[10px] text-zinc-400 font-bold">Duration: 06 h 55 m</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="flex-1 h-1.5 rounded-full bg-zinc-100 relative">
                  <div className="absolute top-0 bottom-0 left-0 bg-[#5D5FEF] rounded-full" style={{ width: '50%' }} />
                </div>
                <span className="text-[10px] font-bold text-[#5D5FEF] font-mono">50%</span>
              </div>
            </div>

            {/* Task Row 3 */}
            <div className="space-y-1">
              <div className="flex justify-between items-center text-xs">
                <span className="font-black text-[#1C1A17]">Send out reminders</span>
                <span className="text-[10px] text-zinc-400 font-bold">Duration: 01 h 30 m</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="flex-1 h-1.5 rounded-full bg-zinc-100 relative">
                  <div className="absolute top-0 bottom-0 left-0 bg-[#5D5FEF] rounded-full" style={{ width: '10%' }} />
                </div>
                <span className="text-[10px] font-bold text-[#5D5FEF] font-mono">10%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Widget 2: Go Premium! Promo Banner */}
        <div className="bg-[#5D5FEF] text-white rounded-[2rem] p-6 shadow-lg flex flex-col justify-between items-center text-center space-y-4 min-h-[380px] relative overflow-hidden group">
          {/* Subtle design illustrations/shapes */}
          <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-white/10 blur-xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-32 h-32 rounded-full bg-white/10 blur-xl pointer-events-none" />

          <div className="space-y-4 z-10">
            {/* Gift Box Icon / Premium Monogram */}
            <div className="w-16 h-16 rounded-full bg-white/10 border border-white/20 flex items-center justify-center mx-auto text-white text-3xl shadow-sm">
              🎁
            </div>
            
            <h3 className="text-xl font-extrabold tracking-wide">Go premium!</h3>
            <p className="text-xs text-white/80 font-medium leading-relaxed max-w-xs">
              Gain access to a range of benefits designed to enhance your user experience, custom reports and automated POS tag printers.
            </p>
          </div>

          <button 
            onClick={() => alert("Premium Showroom licenses fully active.")}
            className="w-full py-3 bg-[#0F0E26] hover:bg-zinc-900 text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-all z-10"
          >
            Find out more
          </button>
        </div>

        {/* Widget 3: Analytics & Board Meeting Invite */}
        <div className="space-y-6">
          
          {/* Upper Progress Indicators */}
          <div className="bg-white border border-zinc-200/80 rounded-[2rem] p-5 shadow-sm grid grid-cols-2 gap-4">
            
            {/* Gauge 1 */}
            <div className="text-center space-y-2 border-r border-zinc-100 pr-2">
              <div className="relative w-14 h-14 mx-auto flex items-center justify-center rounded-full bg-[#5D5FEF]/5 border-2 border-[#5D5FEF]">
                <span className="text-[10px] font-black text-[#5D5FEF] font-mono">90%</span>
              </div>
              <div className="space-y-0.5">
                <span className="text-[8px] uppercase tracking-widest text-[#5D5FEF] font-black block">DATA RESEARCH</span>
                <span className="text-[10px] font-black text-[#1C1A17] block">Marketing</span>
              </div>
            </div>

            {/* Gauge 2 */}
            <div className="text-center space-y-2 pl-2">
              <div className="relative w-14 h-14 mx-auto flex items-center justify-center rounded-full bg-amber-500/5 border-2 border-amber-500">
                <span className="text-[10px] font-black text-amber-600 font-mono">65%</span>
              </div>
              <div className="space-y-0.5">
                <span className="text-[8px] uppercase tracking-widest text-amber-600 font-black block">UI/UX DESIGN</span>
                <span className="text-[10px] font-black text-[#1C1A17] block">Typography</span>
              </div>
            </div>

          </div>

          {/* Lower Board Meeting Details */}
          <div className="bg-white border border-zinc-200/80 rounded-[2rem] p-5 shadow-sm space-y-4">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <h4 className="text-xs font-black text-[#1C1A17]">Board meeting</h4>
                <p className="text-[9px] text-zinc-400 font-bold font-mono">March 24 at 4:00 PM</p>
              </div>
              <button className="p-1 hover:bg-zinc-100 rounded-lg text-zinc-400">
                <Edit2 size={11} />
              </button>
            </div>
            
            <p className="text-[10px] text-zinc-500 font-medium leading-relaxed">
              Meeting with John Smith, 4th floor, room 159
            </p>

            <div className="flex items-center space-x-2 pt-1">
              <button 
                onClick={() => alert("Rescheduled call request logged.")}
                className="flex-1 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-600 rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors"
              >
                Reschedule
              </button>
              <button 
                onClick={() => alert("Meeting invite approved.")}
                className="flex-1 py-2 bg-[#5D5FEF] hover:bg-[#4c4ddc] text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors shadow-sm"
              >
                Accept Invite
              </button>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};

export default Dashboard;
