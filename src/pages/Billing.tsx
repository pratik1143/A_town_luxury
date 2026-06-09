import React, { useState, useEffect, useRef } from 'react';
import { listenProducts, adjustStock, listenCategories, listenCustomers, updateCustomer, addCustomer, deriveBarcodeId } from '../firebase/db';
import { useAuth } from '../context/AuthContext';
import { ThermalReceipt, type BillData, type BillItem } from '../components/ThermalReceipt';
import { PrintPortal } from '../components/PrintPortal';
import { connectUSBPrinter, printUSBReceipt } from '../utils/usbPrinter';
import { 
  ReceiptTemplateDesigner, 
  getReceiptConfig, 
  type ReceiptConfig 
} from '../components/ReceiptTemplateDesigner';
import { 
  Search, Plus, Minus, Trash2, Printer, QrCode, CreditCard, Wallet, Settings,
  Usb, CheckCircle2, X, ShoppingBag, Sparkles, AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface CartItem {
  id: string;
  name: string;
  sku: string;
  brand: string;
  sellingPrice: number;
  stockQuantity: number;
  quantity: number;
  size?: string;
  color?: string;
}

export const Billing: React.FC = () => {
  const { user } = useAuth();
  
  // Data lists
  const [products, setProducts] = useState<any[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [receiptConfig, setReceiptConfig] = useState<ReceiptConfig>(getReceiptConfig());
  const [recentBills, setRecentBills] = useState<BillData[]>([]);
  const [categories, setCategories] = useState<any[]>([]);

  // CRM States
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [applyWallet, setApplyWallet] = useState(false);
  
  // Quick Add Customer Form
  const [showQuickAddModal, setShowQuickAddModal] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustEmail, setNewCustEmail] = useState('');

  // Search & Scanner
  const [searchQuery, setSearchQuery] = useState('');
  const [scannerInput, setScannerInput] = useState('');
  const scannerInputRef = useRef<HTMLInputElement | null>(null);

  // Bill parameters
  const [discount, setDiscount] = useState<number>(0);
  const [paymentMode, setPaymentMode] = useState<string>('upi'); // upi, cash, card
  const [paperWidth, setPaperWidth] = useState<'58mm' | '80mm'>('80mm');

  // Preview Drawer
  const [showDesigner, setShowDesigner] = useState(false);
  const [activeBill, setActiveBill] = useState<BillData | null>(null);

  // Status alerts
  const [alertMessage, setAlertMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // WebUSB & Print modes
  const [printMode, setPrintMode] = useState<'system' | 'usb'>('system');
  const [usbDevice, setUsbDevice] = useState<any | null>(null);

  // Checkout Success overlay states
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [lastCompletedBill, setLastCompletedBill] = useState<BillData | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    const unsubProducts = listenProducts(setProducts);
    const unsubCategories = listenCategories(setCategories);
    const unsubCustomers = listenCustomers(setCustomers);

    // Load recent bills from local storage
    const savedBills = localStorage.getItem('town_bills_registry');
    if (savedBills) {
      try {
        setRecentBills(JSON.parse(savedBills));
      } catch {
        setRecentBills([]);
      }
    }

    // Auto focus scanner input
    if (scannerInputRef.current) {
      scannerInputRef.current.focus();
    }

    return () => {
      unsubProducts();
      unsubCategories();
      unsubCustomers();
    };
  }, []);

  // Global keydown capture listener for hardware scanner
  useEffect(() => {
    let buffer = '';
    let lastKeyTime = Date.now();

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key.length > 1 && e.key !== 'Enter') return;
      const currentTime = Date.now();
      const timeDiff = currentTime - lastKeyTime;

      // Hardware scanners send chars < 50ms apart; 300ms gap = new scan
      if (timeDiff > 300) {
        buffer = '';
      }
      lastKeyTime = currentTime;

      if (e.key === 'Enter') {
        if (buffer.length > 2) {
          const scannedVal = buffer.trim().toLowerCase();
          const matched = products.find(p => {
            const sku      = (p.sku        || '').toString().trim().toLowerCase();
            const barcode  = (p.barcode   || '').toString().trim().toLowerCase();
            const barcodeId= (p.barcodeId || '').toString().trim().toLowerCase();
            const derived  = deriveBarcodeId(p.sku || p.id || '').toString().trim().toLowerCase();
            return sku === scannedVal || barcode === scannedVal || barcodeId === scannedVal || derived === scannedVal;
          });

          if (matched) {
            addToCart(matched);
            triggerAlert('success', `✅ Scanned: ${matched.brand} ${matched.name} added to cart.`);
            setScannerInput('');
            setSearchQuery('');
            e.preventDefault();
            e.stopPropagation();
          } else {
            // Show error so user knows scan happened but product not found
            triggerAlert('error', `❌ Barcode "${buffer.trim()}" not found. Check product SKU.`);
          }
          buffer = '';
        }
      } else {
        buffer += e.key;
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown, true);
    };
  }, [products, cart]);

  const triggerAlert = (type: 'success' | 'error', text: string) => {
    setAlertMessage({ type, text });
    setTimeout(() => setAlertMessage(null), 3000);
  };

  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const scannedVal = scannerInput.trim().toLowerCase();
    if (!scannedVal) return;

    const matchedProduct = products.find(p => {
      const sku      = (p.sku        || '').toString().trim().toLowerCase();
      const barcode  = (p.barcode   || '').toString().trim().toLowerCase();
      const barcodeId= (p.barcodeId || '').toString().trim().toLowerCase();
      const derived  = deriveBarcodeId(p.sku || p.id || '').toString().trim().toLowerCase();
      return sku === scannedVal || barcode === scannedVal || barcodeId === scannedVal || derived === scannedVal;
    });

    if (matchedProduct) {
      addToCart(matchedProduct);
      setScannerInput('');
      triggerAlert('success', `✅ Added ${matchedProduct.brand} ${matchedProduct.name} to cart.`);
    } else {
      triggerAlert('error', `❌ "${scannerInput.trim()}" not found. Check product SKU in inventory.`);
      setScannerInput('');
    }

    if (scannerInputRef.current) {
      scannerInputRef.current.focus();
    }
  };

  const addToCart = (product: any) => {
    const existing = cart.find(item => item.id === product.id);
    if (existing) {
      if (existing.quantity >= product.stockQuantity) {
        triggerAlert('error', `Cannot exceed available stock (${product.stockQuantity} units).`);
        return;
      }
      setCart(cart.map(item => 
        item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
      ));
    } else {
      if (product.stockQuantity <= 0) {
        triggerAlert('error', `Product is currently out of stock.`);
        return;
      }
      setCart([...cart, {
        id: product.id,
        name: product.name,
        sku: product.sku,
        brand: product.brand,
        sellingPrice: product.sellingPrice,
        stockQuantity: product.stockQuantity,
        quantity: 1,
        size: product.size,
        color: product.color
      }]);
    }
  };

  const updateCartQty = (id: string, delta: number) => {
    const item = cart.find(i => i.id === id);
    if (!item) return;

    const newQty = item.quantity + delta;
    if (newQty <= 0) {
      setCart(cart.filter(i => i.id !== id));
      return;
    }

    if (newQty > item.stockQuantity) {
      triggerAlert('error', `Cannot exceed available inventory.`);
      return;
    }

    setCart(cart.map(i => i.id === id ? { ...i, quantity: newQty } : i));
  };

  const subtotal = cart.reduce((acc, item) => acc + (item.sellingPrice * item.quantity), 0);
  const gstInclusive = subtotal * 0.18;
  const discountDeduction = Math.round(((subtotal * discount) / 100) * 100) / 100;
  const totalBeforeWallet = Math.max(0, subtotal - discountDeduction);
  const walletDeduction = (applyWallet && selectedCustomer) 
    ? Math.min(totalBeforeWallet, selectedCustomer.walletBalance || 0) 
    : 0;
  const total = Math.max(0, totalBeforeWallet - walletDeduction);

  const filteredCustomers = customers.filter(cust => 
    cust.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
    (cust.phone && cust.phone.includes(customerSearch))
  );

  const handleCheckoutAndPrint = async () => {
    if (cart.length === 0) {
      triggerAlert('error', 'Add items to the cart first.');
      return;
    }

    try {
      for (const item of cart) {
        if (user) {
          await adjustStock(
            item.id, 
            -item.quantity, 
            `POS checkout invoice TL-${Date.now().toString().slice(-5)}`, 
            { uid: user.uid, fullName: user.fullName }
          );
        }
      }

      const newBillItems: BillItem[] = cart.map(item => ({
        name: `${item.brand} ${item.name}${item.size || item.color ? ` (${[item.size, item.color].filter(Boolean).join('/')})` : ''}`,
        sku: item.sku,
        quantity: item.quantity,
        price: item.sellingPrice
      }));

      const rewardPointsEarned = Math.floor(total / 10);

      const newBill: BillData = {
        id: `ATL-POS-${Date.now().toString().slice(-6)}`,
        date: new Date().toLocaleString([], { hour12: false }),
        cashierName: user?.fullName || 'Mr Harish Chaudhary',
        items: newBillItems,
        subtotal: subtotal,
        gst: 0,
        discount: discountDeduction,
        total: total,
        paymentMode: paymentMode,
        customerName: selectedCustomer?.name,
        customerPhone: selectedCustomer?.phone,
        loyaltyPointsEarned: selectedCustomer ? rewardPointsEarned : undefined,
        walletDeducted: selectedCustomer && walletDeduction > 0 ? walletDeduction : undefined
      };

      if (selectedCustomer) {
        const updatedPoints = (selectedCustomer.rewardPoints || 0) + rewardPointsEarned;
        const updatedWallet = (selectedCustomer.walletBalance || 0) - walletDeduction;
        await updateCustomer(selectedCustomer.id, {
          rewardPoints: updatedPoints,
          walletBalance: updatedWallet
        }, user ? { uid: user.uid, fullName: user.fullName } : undefined);
      }

      const updatedRegistry = [newBill, ...recentBills];
      setRecentBills(updatedRegistry);
      localStorage.setItem('town_bills_registry', JSON.stringify(updatedRegistry));

      setActiveBill(newBill);
      setCart([]);
      setDiscount(0);
      setSelectedCustomer(null);
      setApplyWallet(false);

      if (printMode === 'usb') {
        if (usbDevice) {
          try {
            await printUSBReceipt(usbDevice, newBill, paperWidth, receiptConfig);
            triggerAlert('success', `Direct USB Print command spooled.`);
          } catch (printErr: any) {
            console.error('USB print error:', printErr);
            triggerAlert('error', `USB print failed: ${printErr.message}. Falling back to system print...`);
            setTimeout(() => {
              window.print();
            }, 500);
          }
        } else {
          triggerAlert('error', 'No USB printer connected. Falling back to system print...');
          setTimeout(() => {
            window.print();
          }, 500);
        }
      } else {
        setTimeout(() => {
          window.print();
        }, 500);
      }

      setLastCompletedBill(newBill);
      setShowSuccessModal(true);

    } catch (err: any) {
      triggerAlert('error', err.message || 'Checkout failed.');
    }
  };

  const reprintBill = async (bill: BillData) => {
    setActiveBill(bill);
    triggerAlert('success', `Reprinting ${bill.id}...`);
    
    if (printMode === 'usb') {
      if (usbDevice) {
        try {
          await printUSBReceipt(usbDevice, bill, paperWidth, receiptConfig);
          triggerAlert('success', `Direct USB Reprint command spooled.`);
        } catch (printErr: any) {
          console.error('USB reprint error:', printErr);
          triggerAlert('error', `USB reprint failed. Fallback to system print...`);
          setTimeout(() => {
            window.print();
          }, 500);
        }
      } else {
        triggerAlert('error', 'No printer. Fallback to system print...');
        setTimeout(() => {
          window.print();
        }, 500);
      }
    } else {
      setTimeout(() => {
        window.print();
      }, 500);
    }
  };

  const handleConnectUSB = async () => {
    try {
      const device = await connectUSBPrinter();
      setUsbDevice(device);
      setPrintMode('usb');
      triggerAlert('success', `Connected: ${device.productName || 'Thermal Printer'}`);
    } catch (err: any) {
      console.error(err);
      triggerAlert('error', `Printer connection failed: ${err.message}`);
    }
  };

  const filteredProducts = products.filter(p => {
    if (!searchQuery) return false;
    return (
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  return (
    <div className="space-y-6 select-none z-10 relative text-[#1C1A17] font-sans pb-12">
      
      <style>{`
        @media print {
          body > #root {
            display: none !important;
          }
          body > #print-root {
            display: block !important;
            background: white !important;
          }
          .print-receipt-wrapper {
            display: flex !important;
            justify-content: flex-start !important;
            align-items: flex-start !important;
            background: white !important;
            width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          #thermal-receipt-print {
            width: ${paperWidth === '58mm' ? '58mm' : '80mm'} !important;
            margin: 0 !important;
            padding: 4px !important;
            box-shadow: none !important;
            border: none !important;
          }
        }
      `}</style>

      {/* Modern Dashboard Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-[2rem] border border-zinc-200/80 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center space-x-2 bg-[#5D5FEF]/10 border border-[#5D5FEF]/20 px-3 py-0.5 rounded-full w-max text-[#5D5FEF]">
            <Sparkles size={11} className="animate-pulse" />
            <span className="text-[9px] uppercase font-black tracking-widest font-mono">Showroom Checkout POS</span>
          </div>
          <h1 className="text-xl md:text-2xl font-black text-black tracking-wide uppercase font-sans">
            Thermal Billing Terminal
          </h1>
        </div>

        {/* Action pills bar */}
        <div className="flex flex-wrap gap-2 items-center">
          {/* System vs USB Print mode */}
          <div className="flex bg-zinc-50 border border-zinc-200/80 rounded-full p-1 shadow-sm">
            <button
              onClick={() => setPrintMode('system')}
              className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                printMode === 'system'
                  ? 'bg-[#5D5FEF] text-white shadow-md'
                  : 'text-zinc-400 hover:text-zinc-700'
              }`}
            >
              System Spool
            </button>
            <button
              onClick={() => {
                setPrintMode('usb');
                if (!usbDevice) handleConnectUSB();
              }}
              className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
                printMode === 'usb'
                  ? 'bg-[#5D5FEF] text-white shadow-md'
                  : 'text-zinc-400 hover:text-zinc-700'
              }`}
            >
              <Usb size={10} /> Direct USB
            </button>
          </div>

          {printMode === 'usb' && (
            <button
              onClick={handleConnectUSB}
              className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 border ${
                usbDevice
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-600'
                  : 'bg-amber-50 border-amber-200 text-amber-600 animate-pulse'
              }`}
            >
              {usbDevice ? `🟢 ${usbDevice.productName || 'Printer'}` : '🔌 Connect USB'}
            </button>
          )}

          {/* Paper roll selector */}
          <div className="flex border border-zinc-200 rounded-xl p-1 bg-white shadow-sm">
            <button
              onClick={() => setPaperWidth('58mm')}
              className={`px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                paperWidth === '58mm' 
                  ? 'bg-[#5D5FEF] text-white shadow-sm' 
                  : 'text-zinc-400 hover:text-zinc-700'
              }`}
            >
              58mm Roll
            </button>
            <button
              onClick={() => setPaperWidth('80mm')}
              className={`px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                paperWidth === '80mm' 
                  ? 'bg-[#5D5FEF] text-white shadow-sm' 
                  : 'text-zinc-400 hover:text-zinc-700'
              }`}
            >
              80mm Roll
            </button>
          </div>

          <button
            onClick={() => setShowDesigner(!showDesigner)}
            className="px-4 py-2 bg-white hover:bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold text-zinc-500 hover:text-black transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
          >
            <Settings size={13} /> {showDesigner ? 'Hide Editor' : 'Receipt Design'}
          </button>
        </div>
      </div>

      {/* Alerts */}
      <AnimatePresence>
        {alertMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`p-4 rounded-2xl border text-xs flex items-center gap-2 shadow-sm font-bold ${
              alertMessage.type === 'success' 
                ? 'bg-emerald-50 border-emerald-100 text-emerald-600' 
                : 'bg-red-50 border-red-100 text-red-600'
            }`}
          >
            <span>{alertMessage.type === 'success' ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}</span>
            <span>{alertMessage.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {showDesigner && (
        <div className="border border-zinc-200/80 bg-white rounded-[2rem] p-6 shadow-sm">
          <ReceiptTemplateDesigner onConfigChange={setReceiptConfig} />
        </div>
      )}

      {/* Grid workspace split */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Left column: Lookup & Catalog cards selection */}
        <div className="xl:col-span-2 space-y-6">
          
          {/* Quick Search & Scanning Desk */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-5 rounded-[2rem] border border-zinc-200/80 shadow-sm">
            
            {/* Barcode scanner active status card */}
            <form onSubmit={handleBarcodeSubmit} className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[9px] uppercase tracking-widest text-[#5D5FEF] font-black block">
                  Barcode Scanner Link
                </span>
                <span className="flex items-center gap-1 text-[8px] uppercase tracking-wider font-mono text-emerald-500 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100 animate-pulse">
                  🟢 Scanner active
                </span>
              </div>
              <div className="relative">
                <Search size={14} className="absolute left-3.5 top-3.5 text-zinc-400" />
                <input
                  ref={scannerInputRef}
                  type="text"
                  value={scannerInput}
                  onChange={(e) => setScannerInput(e.target.value)}
                  placeholder="Scan clothing tag barcode..."
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl pl-10 pr-4 py-3 text-xs text-[#1C1A17] focus:outline-none focus:border-[#5D5FEF] focus:bg-white transition-all placeholder-zinc-400 font-medium"
                />
              </div>
            </form>

            {/* Manual Product Search */}
            <div className="space-y-2 relative">
              <span className="text-[9px] uppercase tracking-widest text-zinc-400 font-black block">
                Manual Product Search
              </span>
              <div className="relative">
                <Search size={14} className="absolute left-3.5 top-3.5 text-zinc-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search products by brand, title..."
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl pl-10 pr-4 py-3 text-xs text-[#1C1A17] focus:outline-none focus:border-[#5D5FEF] focus:bg-white transition-all placeholder-zinc-400 font-medium"
                />
              </div>

              {/* Instant Search Dropdown results overlay */}
              {searchQuery && (
                <div className="absolute left-0 right-0 top-full mt-2 max-h-56 overflow-y-auto bg-white border border-zinc-200 rounded-2xl shadow-2xl z-30 divide-y divide-zinc-100 animate-in fade-in slide-in-from-top-2 duration-150">
                  {filteredProducts.length > 0 ? (
                    filteredProducts.map(p => (
                      <button
                        key={p.id}
                        onClick={() => {
                          addToCart(p);
                          setSearchQuery('');
                        }}
                        className="w-full flex justify-between items-center p-3.5 text-left hover:bg-zinc-50 text-xs transition-colors cursor-pointer"
                      >
                        <div>
                          <span className="font-extrabold text-[#1c1a17] block">{p.brand} {p.name}</span>
                          <span className="text-[9px] text-zinc-400 uppercase font-bold">SKU: {p.sku} | Stock: {p.stockQuantity}</span>
                        </div>
                        <span className="font-extrabold text-[#5D5FEF] font-mono">Rs. {p.sellingPrice}</span>
                      </button>
                    ))
                  ) : (
                    <div className="p-4 text-center text-zinc-400 text-xs font-mono">No matching inventory items</div>
                  )}
                </div>
              )}
            </div>

          </div>

          {/* Categories Horizontal Carousel */}
          {categories.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              <button
                type="button"
                onClick={() => setSelectedCategory('all')}
                className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap border ${
                  selectedCategory === 'all'
                    ? 'bg-[#5D5FEF] text-white border-transparent shadow-sm'
                    : 'bg-white border-zinc-200/80 text-zinc-500 hover:text-black hover:bg-zinc-50'
                }`}
              >
                All Catalog
              </button>
              {categories.map(cat => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap border ${
                    selectedCategory === cat.id
                      ? 'bg-[#5D5FEF] text-white border-transparent shadow-sm'
                      : 'bg-white border-zinc-200/80 text-zinc-500 hover:text-black hover:bg-zinc-50'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          )}

          {/* God-level Product Cards grid block */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 max-h-[300px] overflow-y-auto pr-1 scrollbar-thin p-1 bg-zinc-100/30 border border-zinc-200/40 rounded-[2.5rem]">
            {products
              .filter(p => selectedCategory === 'all' || p.categoryId === selectedCategory)
              .map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => addToCart(p)}
                  disabled={p.stockQuantity <= 0}
                  className="p-4 rounded-3xl border border-zinc-200 bg-white hover:border-[#5D5FEF]/50 text-left transition-all active:scale-95 duration-100 flex flex-col justify-between h-28 relative overflow-hidden group cursor-pointer disabled:opacity-20 disabled:cursor-not-allowed shadow-sm"
                >
                  {/* Subtle hover color tab */}
                  <span className="absolute top-0 left-0 right-0 h-1 bg-transparent group-hover:bg-[#5D5FEF]" />
                  
                  <div className="space-y-0.5">
                    <span className="text-[8px] uppercase tracking-wider text-zinc-400 block font-bold">{p.brand}</span>
                    <span className="text-xs font-extrabold text-[#1C1A17] block truncate group-hover:text-[#5D5FEF] transition-colors">{p.name}</span>
                  </div>
                  <div className="flex justify-between items-center w-full mt-4 border-t border-zinc-100 pt-2">
                    <span className="text-xs font-black text-[#5D5FEF] font-mono">Rs. {p.sellingPrice.toLocaleString()}</span>
                    <span className="text-[8px] text-zinc-400 font-mono font-bold bg-zinc-50 border border-zinc-100 px-1.5 py-0.5 rounded">Qty: {p.stockQuantity}</span>
                  </div>
                </button>
              ))}
            {products.filter(p => selectedCategory === 'all' || p.categoryId === selectedCategory).length === 0 && (
              <div className="col-span-full py-16 text-center text-zinc-400 text-xs font-mono uppercase tracking-wider font-bold">
                No items currently loaded in this category.
              </div>
            )}
          </div>

        </div>

        {/* Right column: Cart, customer CRM, and totals boxes */}
        <div className="space-y-6">
          
          {/* Invoice-styled Cart block */}
          <div className="rounded-[2.5rem] bg-white border border-zinc-200/80 overflow-hidden flex flex-col justify-between shadow-sm min-h-[400px]">
            
            {/* Header */}
            <div className="p-5 border-b border-zinc-100 bg-zinc-50 flex justify-between items-center">
              <h2 className="text-xs font-black text-black uppercase tracking-wider flex items-center gap-1.5">
                <ShoppingBag size={14} className="text-[#5D5FEF]" /> Billing Cart
              </h2>
              <span className="text-[10px] bg-[#5D5FEF]/10 text-[#5D5FEF] border border-[#5D5FEF]/20 px-3 py-0.5 rounded-full font-black font-mono">
                {cart.reduce((a, c) => a + c.quantity, 0)} Pcs
              </span>
            </div>

            {/* Scrollable list */}
            <div className="flex-1 overflow-y-auto divide-y divide-zinc-100 px-5 py-2 scrollbar-thin max-h-[260px] min-h-[160px]">
              <AnimatePresence initial={false}>
                {cart.length > 0 ? (
                  cart.map(item => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: 30 }}
                      transition={{ duration: 0.2 }}
                      className="flex justify-between items-center py-4 first:pt-2 last:pb-2"
                    >
                      <div className="space-y-0.5 pr-4">
                        <h4 className="text-black text-xs font-bold leading-normal">{item.brand} {item.name}</h4>
                        {(item.size || item.color) && (
                          <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">
                            Size {item.size} • {item.color}
                          </span>
                        )}
                        <span className="text-[9px] font-mono text-zinc-400 uppercase font-bold">SKU: {item.sku}</span>
                      </div>

                      <div className="flex items-center space-x-3">
                        <div className="text-right">
                          <span className="text-xs font-black text-black font-mono block">Rs. {(item.sellingPrice * item.quantity).toLocaleString()}</span>
                          <span className="text-[8.5px] text-zinc-400 block font-mono">@ Rs. {item.sellingPrice}</span>
                        </div>

                        {/* Increment/decrement buttons */}
                        <div className="flex items-center space-x-1 border border-zinc-200 rounded-xl bg-zinc-50 p-1">
                          <button
                            type="button"
                            onClick={() => updateCartQty(item.id, -1)}
                            className="p-1 hover:bg-zinc-200 rounded text-zinc-400 hover:text-black cursor-pointer"
                          >
                            <Minus size={10} />
                          </button>
                          <span className="text-xs font-mono font-bold text-zinc-700 w-5 text-center">{item.quantity}</span>
                          <button
                            type="button"
                            onClick={() => updateCartQty(item.id, 1)}
                            className="p-1 hover:bg-zinc-200 rounded text-zinc-400 hover:text-black cursor-pointer"
                          >
                            <Plus size={10} />
                          </button>
                        </div>

                        {/* Trash */}
                        <button
                          type="button"
                          onClick={() => setCart(cart.filter(c => c.id !== item.id))}
                          className="p-1.5 text-zinc-400 hover:text-red-500 cursor-pointer"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="h-full flex flex-col items-center justify-center space-y-2 text-zinc-400 py-12">
                    <div className="w-12 h-12 rounded-full border-2 border-dashed border-zinc-200 flex items-center justify-center text-lg">📦</div>
                    <p className="text-xs font-black uppercase tracking-wider text-zinc-500">Cart is empty</p>
                    <p className="text-[9px] text-zinc-400 max-w-[200px] text-center leading-relaxed">Scan clothing barcode tag or select catalog products on the left.</p>
                  </div>
                )}
              </AnimatePresence>
            </div>

            {/* CRM Linkage Panel */}
            <div className="p-4 border-t border-zinc-100 bg-zinc-50/50 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-extrabold flex items-center gap-1">
                  👤 CRM Association
                </span>
                {!selectedCustomer && (
                  <button
                    type="button"
                    onClick={() => {
                      setNewCustName('');
                      setNewCustPhone('');
                      setNewCustEmail('');
                      setShowQuickAddModal(true);
                    }}
                    className="text-[9px] text-[#5D5FEF] hover:text-[#4c4ddc] font-black uppercase tracking-wider cursor-pointer"
                  >
                    + Register customer
                  </button>
                )}
              </div>

              {!selectedCustomer ? (
                <div className="relative">
                  <div className="relative">
                    <Search size={12} className="absolute left-3 top-3 text-zinc-400" />
                    <input
                      type="text"
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                      placeholder="Search member by name or mobile..."
                      className="w-full bg-white border border-zinc-200 rounded-xl pl-8 pr-3 py-2 text-xs text-[#111111] focus:outline-none focus:border-[#5D5FEF]"
                    />
                  </div>
                  {customerSearch && (
                    <div className="absolute left-0 right-0 bottom-full mb-1 max-h-40 overflow-y-auto bg-white border border-zinc-200 rounded-xl shadow-2xl z-30 divide-y divide-zinc-100">
                      {filteredCustomers.length > 0 ? (
                        filteredCustomers.map(cust => (
                          <button
                            key={cust.id}
                            type="button"
                            onClick={() => {
                              setSelectedCustomer(cust);
                              setCustomerSearch('');
                              setApplyWallet(false);
                            }}
                            className="w-full flex justify-between items-center p-3 text-left hover:bg-zinc-50 text-xs transition-colors cursor-pointer"
                          >
                            <div>
                              <span className="font-extrabold text-[#111111] block">{cust.name}</span>
                              <span className="text-[9px] text-zinc-400 font-mono">{cust.phone}</span>
                            </div>
                            <span className="text-[9px] bg-zinc-100 text-zinc-500 px-2 py-0.5 rounded font-mono font-bold">
                              {cust.rewardPoints || 0} pts
                            </span>
                          </button>
                        ))
                      ) : (
                        <div className="p-4 text-center text-zinc-500 text-xs space-y-2">
                          <p>No customer found.</p>
                          <button
                            type="button"
                            onClick={() => {
                              setNewCustName(customerSearch);
                              setNewCustPhone('');
                              setNewCustEmail('');
                              setShowQuickAddModal(true);
                            }}
                            className="px-3.5 py-1.5 bg-[#5D5FEF] text-white text-[9px] font-black rounded-lg uppercase tracking-wider cursor-pointer hover:bg-[#4c4ddc] shadow-sm"
                          >
                            Register "{customerSearch}"
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-3 bg-white border border-zinc-200 rounded-2xl flex items-center justify-between shadow-sm">
                  <div className="space-y-0.5">
                    <p className="text-xs font-black text-[#1C1A17]">{selectedCustomer.name}</p>
                    <p className="text-[9px] text-zinc-400 font-mono font-bold">{selectedCustomer.phone}</p>
                    <div className="flex gap-2 pt-1.5">
                      <span className="text-[8px] uppercase tracking-wider font-extrabold text-[#5D5FEF] bg-[#5D5FEF]/10 border border-[#5D5FEF]/20 px-2 py-0.5 rounded">
                        ★ {selectedCustomer.rewardPoints || 0} pts
                      </span>
                      <span className="text-[8px] uppercase tracking-wider font-extrabold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded font-mono">
                        Wallet: Rs. {selectedCustomer.walletBalance || 0}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {(selectedCustomer.walletBalance || 0) > 0 && (
                      <button
                        type="button"
                        onClick={() => setApplyWallet(!applyWallet)}
                        className={`px-2.5 py-1.5 rounded-lg border text-[9px] font-black uppercase transition-all cursor-pointer ${
                          applyWallet
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-600'
                            : 'bg-white border-zinc-200 text-zinc-500 hover:bg-zinc-50'
                        }`}
                      >
                        {applyWallet ? 'Applied' : 'Use Wallet'}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCustomer(null);
                        setApplyWallet(false);
                      }}
                      className="text-[9px] font-bold text-red-500 hover:text-red-700 uppercase tracking-wider cursor-pointer"
                    >
                      Unlink
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Calculations & Checkout Box */}
            <div className="p-5 border-t border-zinc-100 bg-zinc-50 space-y-4">
              
              {/* Discount selection */}
              <div>
                <label className="text-[9px] uppercase tracking-wider text-zinc-500 font-black block mb-1">Promo Discount Percentage (%)</label>
                <div className="flex flex-col gap-2">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={discount || ''}
                    onChange={(e) => {
                      const raw = e.target.value;
                      if (raw === '') {
                        setDiscount(0);
                        return;
                      }
                      const val = Number(raw);
                      if (val >= 0 && val <= 100) {
                        setDiscount(val);
                      } else if (val > 100) {
                        setDiscount(100);
                      } else {
                        setDiscount(0);
                      }
                    }}
                    placeholder="Enter discount percentage..."
                    className="w-full bg-white border border-zinc-200 rounded-xl px-3 py-2 text-xs text-[#1C1A17] focus:outline-none focus:border-[#5D5FEF] font-semibold"
                  />
                  
                  {/* Coupon Pills */}
                  <div className="flex gap-2">
                    {[
                      { label: '5%', val: 5 },
                      { label: '10%', val: 10 },
                      { label: '15%', val: 15 },
                      { label: '20%', val: 20 },
                      { label: '50%', val: 50 }
                    ].map(promo => (
                      <button
                        key={promo.label}
                        type="button"
                        onClick={() => setDiscount(promo.val)}
                        className={`px-2.5 py-1 rounded-lg border text-[8px] font-black uppercase transition-all cursor-pointer ${
                          discount === promo.val
                            ? 'bg-[#5D5FEF]/20 border-[#5D5FEF] text-[#5D5FEF]'
                            : 'bg-white border-zinc-200 text-zinc-400 hover:text-black'
                        }`}
                      >
                        {promo.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Payment Select */}
              <div>
                <span className="text-[9px] uppercase tracking-wider text-zinc-500 font-black block mb-2">Payment Instrument</span>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'upi', label: 'UPI Pay', icon: QrCode },
                    { id: 'cash', label: 'Cash', icon: Wallet },
                    { id: 'card', label: 'Card Swipe', icon: CreditCard }
                  ].map(mode => {
                    const Icon = mode.icon;
                    return (
                      <button
                        key={mode.id}
                        type="button"
                        onClick={() => setPaymentMode(mode.id)}
                        className={`p-2.5 rounded-xl border text-[10px] font-black uppercase tracking-wider flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                          paymentMode === mode.id 
                            ? 'bg-[#5D5FEF] text-white border-transparent shadow-sm' 
                            : 'bg-white border-zinc-200 text-zinc-400 hover:border-zinc-300 hover:bg-zinc-50'
                        }`}
                      >
                        <Icon size={13} /> {mode.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Totals values box */}
              <div className="space-y-2.5 text-xs text-zinc-500 pt-2 border-t border-zinc-200/60">
                <div className="flex justify-between font-bold text-zinc-500">
                  <span>Subtotal Amount:</span>
                  <span className="text-black font-mono">Rs. {subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>

                {discount > 0 && (
                  <div className="flex justify-between text-red-500 font-black">
                    <span>Discount Deduction ({discount}%):</span>
                    <span className="font-mono">-Rs. {discountDeduction.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
                {walletDeduction > 0 && (
                  <div className="flex justify-between text-green-600 font-black">
                    <span>Wallet Balance Applied:</span>
                    <span className="font-mono">-Rs. {walletDeduction.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-3 border-t border-zinc-200 text-black">
                  <span className="text-[10px] uppercase font-black tracking-widest text-[#5D5FEF]">Net Billed Total:</span>
                  <span className="text-2xl font-black font-mono text-[#5D5FEF]">Rs. {total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>

                <button
                  onClick={handleCheckoutAndPrint}
                  disabled={cart.length === 0}
                  className="w-full mt-4 py-3.5 bg-[#5D5FEF] hover:bg-[#4c4ddc] text-white font-extrabold rounded-2xl text-xs uppercase tracking-widest transition-all duration-200 shadow-lg flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <Printer size={13} /> Checkout & Spool Invoice
                </button>
              </div>

            </div>

          </div>

        </div>

      </div>

      {/* Success Modal */}
      <AnimatePresence>
        {showSuccessModal && lastCompletedBill && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white border border-zinc-100 rounded-[2.5rem] p-8 max-w-md w-full text-center space-y-6 shadow-2xl relative"
            >
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 border-2 border-emerald-500 flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle2 className="text-emerald-500 w-8 h-8" />
              </div>

              <div className="space-y-1">
                <span className="text-[9px] uppercase font-black tracking-widest text-emerald-500">Checkout Success</span>
                <h2 className="text-xl font-extrabold text-black uppercase tracking-wide">Transaction Logged</h2>
              </div>

              <div className="rounded-2xl border border-zinc-200/60 bg-zinc-50/50 p-4 text-xs divide-y divide-zinc-200/40 space-y-2 text-left">
                <div className="flex justify-between pb-2">
                  <span className="text-zinc-500">Invoice ID:</span>
                  <span className="font-extrabold text-black uppercase font-mono">{lastCompletedBill.id}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-zinc-500">Billed Total:</span>
                  <span className="font-extrabold text-[#5D5FEF] font-mono text-sm">Rs. {lastCompletedBill.total.toFixed(2)}</span>
                </div>
                {lastCompletedBill.customerName && (
                  <div className="flex justify-between py-2">
                    <span className="text-zinc-500">Customer Name:</span>
                    <span className="font-bold text-black">{lastCompletedBill.customerName}</span>
                  </div>
                )}
                {lastCompletedBill.loyaltyPointsEarned !== undefined && lastCompletedBill.loyaltyPointsEarned > 0 && (
                  <div className="flex justify-between py-2">
                    <span className="text-zinc-500">Points Earned:</span>
                    <span className="font-bold text-green-600">+{lastCompletedBill.loyaltyPointsEarned} pts</span>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => setShowSuccessModal(false)}
                className="w-full py-3.5 bg-[#0F0E26] hover:bg-zinc-800 text-white font-extrabold rounded-2xl text-xs uppercase tracking-widest transition-all cursor-pointer"
              >
                Dismiss & Next checkout
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Customer Quick Registration Modal */}
      <AnimatePresence>
        {showQuickAddModal && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border border-zinc-200 rounded-[2.5rem] p-6 max-w-md w-full shadow-2xl space-y-4"
            >
              <div className="flex justify-between items-center pb-2 border-b border-zinc-100">
                <h3 className="text-xs uppercase font-black tracking-widest text-[#111111] flex items-center gap-1.5">
                  👤 CRM Quick Registry
                </h3>
                <button 
                  onClick={() => setShowQuickAddModal(false)} 
                  className="p-1 hover:bg-zinc-100 rounded-lg text-zinc-400 hover:text-black cursor-pointer"
                >
                  <X size={14} />
                </button>
              </div>

              <form onSubmit={async (e) => {
                e.preventDefault();
                if (!newCustName.trim() || !newCustPhone.trim()) {
                  triggerAlert('error', 'Name and phone values are required.');
                  return;
                }
                try {
                  const newCust = {
                    name: newCustName.trim(),
                    phone: newCustPhone.trim(),
                    email: newCustEmail.trim(),
                    address: '',
                    rewardPoints: 0,
                    walletBalance: 0
                  };
                  await addCustomer(newCust, user ? { uid: user.uid, fullName: user.fullName } : undefined);
                  triggerAlert('success', `Linked customer: ${newCustName}`);
                  setCustomerSearch(newCustPhone);
                  
                  setNewCustName('');
                  setNewCustPhone('');
                  setNewCustEmail('');
                  setShowQuickAddModal(false);
                } catch (err: any) {
                  triggerAlert('error', err.message || 'Customer registration failed.');
                }
              }} className="space-y-4 text-left">
                <div>
                  <label className="text-[9px] uppercase tracking-wider text-zinc-500 font-black block mb-1">Customer Full Name *</label>
                  <input
                    type="text"
                    required
                    value={newCustName}
                    onChange={(e) => setNewCustName(e.target.value)}
                    placeholder="e.g. Rahul Sharma"
                    className="w-full bg-[#F8F9FA] border border-zinc-200 rounded-xl px-3 py-2 text-xs text-[#111111] focus:outline-none focus:border-[#5D5FEF] focus:bg-white"
                  />
                </div>

                <div>
                  <label className="text-[9px] uppercase tracking-wider text-zinc-500 font-black block mb-1">Mobile Number *</label>
                  <input
                    type="tel"
                    required
                    value={newCustPhone}
                    onChange={(e) => setNewCustPhone(e.target.value)}
                    placeholder="e.g. 9876543210"
                    className="w-full bg-[#F8F9FA] border border-zinc-200 rounded-xl px-3 py-2 text-xs text-[#111111] focus:outline-none focus:border-[#5D5FEF] focus:bg-white"
                  />
                </div>

                <div>
                  <label className="text-[9px] uppercase tracking-wider text-zinc-500 font-black block mb-1">Email Address</label>
                  <input
                    type="email"
                    value={newCustEmail}
                    onChange={(e) => setNewCustEmail(e.target.value)}
                    placeholder="e.g. rahul@gmail.com"
                    className="w-full bg-[#F8F9FA] border border-zinc-200 rounded-xl px-3 py-2 text-xs text-[#111111] focus:outline-none focus:border-[#5D5FEF] focus:bg-white"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-[#5D5FEF] hover:bg-[#4c4ddc] text-white font-extrabold rounded-xl text-xs uppercase tracking-widest transition-all cursor-pointer shadow-premium"
                >
                  Register CRM Member
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Interactive print spooled preview panel */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Printable visual frame */}
        <div className="rounded-[2.5rem] bg-white border border-zinc-200/80 p-6 shadow-sm relative overflow-hidden flex flex-col min-h-[380px]">
          <h2 className="text-xs font-black text-black uppercase tracking-wider mb-4 flex items-center gap-1">
            🖨️ Active Receipt Spool Output
          </h2>
          <div className="flex-1 overflow-y-auto rounded-2xl bg-zinc-50 border border-zinc-200/60 p-2 scrollbar-thin max-h-[320px]">
            <ThermalReceipt
              bill={activeBill || (recentBills.length > 0 ? recentBills[0] : null)}
              paperWidth={paperWidth}
              config={receiptConfig}
            />
          </div>
          {recentBills.length === 0 && !activeBill && (
            <div className="absolute inset-0 bg-white/70 backdrop-blur-sm flex items-center justify-center text-zinc-400 text-xs font-bold uppercase tracking-wider font-mono">
              No active receipts printed.
            </div>
          )}
        </div>

        {/* Audit Logs list */}
        <div className="rounded-[2.5rem] bg-white border border-zinc-200/80 p-6 shadow-sm flex flex-col justify-between min-h-[380px]">
          <div className="space-y-4">
            <h2 className="text-xs font-black text-black uppercase tracking-wider flex items-center gap-1">
              📝 Invoice Audit Logs
            </h2>
            <div className="space-y-2 overflow-y-auto max-h-[280px] pr-1 scrollbar-thin">
              {recentBills.length > 0 ? (
                recentBills.map((b) => (
                  <div 
                    key={b.id}
                    className="flex justify-between items-center p-3 rounded-2xl bg-zinc-50 hover:bg-zinc-100/80 border border-zinc-200 transition-all text-xs"
                  >
                    <div>
                      <span className="font-black text-black uppercase block">{b.id}</span>
                      <span className="text-[9px] text-zinc-400 font-mono font-bold">{b.date.split(',')[0]} | Rs. {b.total.toLocaleString()}</span>
                    </div>
                    <button
                      onClick={() => reprintBill(b)}
                      className="px-3 py-1.5 bg-white hover:bg-zinc-100 rounded-xl border border-zinc-200 text-[#5D5FEF] hover:text-[#4c4ddc] transition-all cursor-pointer font-black uppercase tracking-wider text-[9px] flex items-center gap-1 shadow-sm"
                    >
                      <Printer size={10} /> Reprint
                    </button>
                  </div>
                ))
              ) : (
                <div className="text-zinc-400 text-xs py-12 text-center font-mono uppercase tracking-wider font-bold">
                  No transactions saved in this session.
                </div>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* PrintPortal */}
      {activeBill && (
        <PrintPortal>
          <div className="print-receipt-wrapper bg-white text-black min-h-screen">
            <ThermalReceipt
              bill={activeBill}
              paperWidth={paperWidth}
              config={receiptConfig}
            />
          </div>
        </PrintPortal>
      )}

    </div>
  );
};

export default Billing;
