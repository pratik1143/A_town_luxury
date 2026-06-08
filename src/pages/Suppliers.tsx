import React, { useEffect, useState } from 'react';
import { 
  listenSuppliers, 
  addSupplier, 
  listenPurchaseOrders, 
  addPurchaseOrder, 
  completePurchaseOrder, 
  listenProducts 
} from '../firebase/db';
import { useAuth } from '../context/AuthContext';
import { 
  Truck, 
  Search, 
  Plus, 
  FileText, 
  CheckSquare, 
  X, 
  Calendar, 
  DollarSign, 
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface POItem {
  productId: string;
  name: string;
  quantity: number;
  costPrice: number;
}

export const Suppliers: React.FC = () => {
  const { user } = useAuth();
  
  // Data list states
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState<string | null>(null);

  // Modals state
  const [isAddSupplierOpen, setIsAddSupplierOpen] = useState(false);
  const [isCreatePOOpen, setIsCreatePOOpen] = useState(false);

  // Form states - Supplier
  const [suppName, setSuppName] = useState('');
  const [suppContact, setSuppContact] = useState('');
  const [suppEmail, setSuppEmail] = useState('');
  const [suppAddress, setSuppAddress] = useState('');

  // Form states - PO
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [poItems, setPoItems] = useState<POItem[]>([]);
  const [deliveryDate, setDeliveryDate] = useState('');
  const [tempProdId, setTempProdId] = useState('');
  const [tempQty, setTempQty] = useState<number>(1);
  const [tempCost, setTempCost] = useState<number>(0);

  useEffect(() => {
    const unsubSupp = listenSuppliers(setSuppliers);
    const unsubPO = listenPurchaseOrders(setPurchaseOrders);
    const unsubProd = listenProducts(setProducts);

    return () => {
      unsubSupp();
      unsubPO();
      unsubProd();
    };
  }, []);

  const triggerAlert = (msg: string) => {
    setAlert(msg);
    setTimeout(() => setAlert(null), 3000);
  };

  // Filter
  const filteredSuppliers = suppliers.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.contact.toLowerCase().includes(search.toLowerCase()) ||
    (s.email && s.email.toLowerCase().includes(search.toLowerCase()))
  );

  // Computations
  const pendingPOs = purchaseOrders.filter(po => po.status === 'pending');
  const totalPOValuation = purchaseOrders.reduce((acc, po) => acc + (po.totalCost || 0), 0);

  const handleAddSupplierSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!suppName.trim() || !suppContact.trim()) return;

    await addSupplier({
      name: suppName,
      contact: suppContact,
      email: suppEmail,
      address: suppAddress
    }, user ? { uid: user.uid, fullName: user.fullName } : undefined);

    setSuppName('');
    setSuppContact('');
    setSuppEmail('');
    setSuppAddress('');
    setIsAddSupplierOpen(false);
    triggerAlert("Supplier registered successfully.");
  };

  const handleAddPOItem = () => {
    if (!tempProdId) return;
    const prod = products.find(p => p.id === tempProdId);
    if (!prod) return;

    // Check if already in list
    if (poItems.some(item => item.productId === tempProdId)) {
      triggerAlert("Product already added to this PO draft.");
      return;
    }

    setPoItems([...poItems, {
      productId: tempProdId,
      name: `${prod.brand} ${prod.name}`,
      quantity: tempQty,
      costPrice: tempCost || prod.sellingPrice * 0.6 // Default cost is 60% of MRP if empty
    }]);

    // Reset item picker
    setTempProdId('');
    setTempQty(1);
    setTempCost(0);
  };

  const handleRemovePOItem = (productId: string) => {
    setPoItems(poItems.filter(item => item.productId !== productId));
  };

  const handleCreatePOSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplierId || poItems.length === 0 || !deliveryDate) {
      triggerAlert("Please select a vendor, add items, and specify expected delivery date.");
      return;
    }

    const supplier = suppliers.find(s => s.id === selectedSupplierId);
    if (!supplier) return;

    const totalCost = poItems.reduce((acc, item) => acc + (item.costPrice * item.quantity), 0);

    await addPurchaseOrder({
      supplierId: selectedSupplierId,
      supplierName: supplier.name,
      items: poItems,
      totalCost,
      deliveryDate,
      status: 'pending'
    }, user ? { uid: user.uid, fullName: user.fullName } : undefined);

    // Reset
    setSelectedSupplierId('');
    setPoItems([]);
    setDeliveryDate('');
    setIsCreatePOOpen(false);
    triggerAlert("Purchase Order created and registered.");
  };

  const handleReceiveStock = async (poId: string) => {
    if (!user) return;
    setLoading(true);
    try {
      await completePurchaseOrder(poId, { uid: user.uid, fullName: user.fullName });
      triggerAlert(`PO ${poId} completed. Stock replenishment imported successfully.`);
    } catch (err: any) {
      triggerAlert(`Intake failed: ${err.message || err}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 select-none z-10 relative text-[#111111]">
      
      {/* Alert Banner */}
      {alert && (
        <div className="p-4 rounded-xl border text-xs flex items-center gap-2 bg-green-50 border-green-200 text-green-600 animate-in fade-in slide-in-from-top-2 duration-200">
          <span>✨</span>
          <span>{alert}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <span className="text-[9px] uppercase tracking-widest text-luxury-gold font-bold">
            Vendor Directory
          </span>
          <h1 className="text-2xl md:text-3xl font-extrabold text-black tracking-wide uppercase font-sans mt-0.5">
            Suppliers & Procurement
          </h1>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setIsAddSupplierOpen(true)}
            className="px-4 py-2.5 border border-zinc-200 bg-white text-black hover:bg-zinc-50 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-premium cursor-pointer"
          >
            <Plus size={14} className="text-luxury-gold" /> Add Vendor
          </button>
          <button
            onClick={() => setIsCreatePOOpen(true)}
            className="px-4 py-2.5 bg-[#111111] text-white hover:bg-zinc-800 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-premium cursor-pointer"
          >
            <FileText size={14} className="text-luxury-gold" /> Compose PO
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="rounded-2xl bg-white border border-zinc-100 p-6 shadow-premium flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-zinc-50 border border-zinc-100 flex items-center justify-center text-luxury-gold">
            <Truck size={20} />
          </div>
          <div>
            <span className="text-[9.5px] uppercase tracking-wider text-zinc-500 font-bold block">Registered Vendors</span>
            <span className="text-2xl font-extrabold text-black">{suppliers.length}</span>
          </div>
        </div>

        <div className="rounded-2xl bg-white border border-zinc-100 p-6 shadow-premium flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-zinc-50 border border-zinc-100 flex items-center justify-center text-luxury-gold">
            <FileText size={20} />
          </div>
          <div>
            <span className="text-[9.5px] uppercase tracking-wider text-zinc-500 font-bold block">Pending Draft POs</span>
            <span className="text-2xl font-extrabold text-black">{pendingPOs.length} active</span>
          </div>
        </div>

        <div className="rounded-2xl bg-white border border-zinc-100 p-6 shadow-premium flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-zinc-50 border border-zinc-100 flex items-center justify-center text-luxury-gold">
            <DollarSign size={20} />
          </div>
          <div>
            <span className="text-[9.5px] uppercase tracking-wider text-zinc-500 font-bold block">Total Procurement Val</span>
            <span className="text-2xl font-extrabold text-black font-mono">Rs. {totalPOValuation.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Main split */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Left: Purchase Orders ledger */}
        <div className="xl:col-span-2 space-y-6">
          <div className="rounded-2xl bg-white border border-zinc-100 p-6 shadow-premium">
            <h2 className="text-xs font-bold text-[#111111] uppercase tracking-wider mb-4">Active Procurement Purchase Orders</h2>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse premium-table">
                <thead>
                  <tr>
                    <th>PO Identifier</th>
                    <th>Supplier Vendor</th>
                    <th>Items</th>
                    <th>Gross Cost</th>
                    <th>Delivery Expected</th>
                    <th>Status</th>
                    <th className="text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {purchaseOrders.map((po) => (
                    <tr key={po.id}>
                      <td className="font-mono font-bold text-xs uppercase text-zinc-800">{po.id.substring(0, 8)}</td>
                      <td className="font-extrabold text-xs text-[#111111]">{po.supplierName}</td>
                      <td>
                        <span className="text-xs font-medium text-zinc-600">{po.items?.length || 0} product lines</span>
                      </td>
                      <td className="font-mono text-xs font-bold text-black">Rs. {po.totalCost}</td>
                      <td>
                        <span className="text-xs text-zinc-500">{new Date(po.deliveryDate).toLocaleDateString()}</span>
                      </td>
                      <td>
                        {po.status === 'completed' ? (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase bg-green-50 border border-green-200 text-green-600">
                            Completed
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase bg-yellow-50 border border-yellow-200 text-yellow-600 animate-pulse">
                            Pending
                          </span>
                        )}
                      </td>
                      <td className="text-right">
                        {po.status === 'pending' ? (
                          <button
                            onClick={() => handleReceiveStock(po.id)}
                            disabled={loading}
                            className="px-2.5 py-1.5 bg-[#111111] hover:bg-zinc-800 text-white rounded-lg text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer disabled:opacity-50"
                          >
                            {loading ? (
                              <Loader2 size={10} className="animate-spin" />
                            ) : (
                              <CheckSquare size={10} />
                            )}
                            Receive & Stock In
                          </button>
                        ) : (
                          <span className="text-[10px] text-zinc-400 font-medium italic">Fulfillment completed</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {purchaseOrders.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-zinc-400 text-xs font-mono">
                        No active purchase orders composed.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right: Vendor Directory List */}
        <div>
          <div className="rounded-2xl bg-white border border-zinc-100 p-6 shadow-premium space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xs font-bold text-[#111111] uppercase tracking-wider">Vendor Directory</h2>
              <span className="text-[9.5px] bg-[#111111]/5 px-2 py-0.5 rounded-full font-bold">{suppliers.length} vendors</span>
            </div>

            <div className="relative">
              <Search size={12} className="absolute left-3 top-3 text-zinc-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search vendors..."
                className="w-full bg-[#F8F9FA] border border-zinc-200 rounded-xl pl-9 pr-4 py-2 text-xs text-[#111111] focus:outline-none placeholder-zinc-400 focus:bg-white transition-all"
              />
            </div>

            <div className="space-y-2 overflow-y-auto max-h-[360px] pr-1 scrollbar-thin">
              {filteredSuppliers.map((supp) => (
                <div key={supp.id} className="p-3 rounded-xl border border-zinc-100 bg-[#F8F9FA] space-y-1.5 text-xs">
                  <div className="flex justify-between items-center">
                    <p className="font-extrabold text-[#111111]">{supp.name}</p>
                    <span className="text-[8px] bg-luxury-gold/10 text-luxury-gold font-bold px-1.5 py-0.5 rounded uppercase">Verified</span>
                  </div>
                  <div className="text-[10.5px] text-zinc-500 space-y-0.5">
                    <p>Phone: {supp.contact}</p>
                    <p className="truncate">Email: {supp.email || 'No email'}</p>
                    <p className="truncate">Address: {supp.address || 'No address'}</p>
                  </div>
                </div>
              ))}
              {filteredSuppliers.length === 0 && (
                <div className="text-center py-6 text-zinc-400 text-xs font-mono">
                  No vendors registered.
                </div>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* Add Supplier Modal */}
      <AnimatePresence>
        {isAddSupplierOpen && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border border-zinc-100 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4"
            >
              <div className="flex justify-between items-center pb-2 border-b border-zinc-100">
                <h3 className="text-xs uppercase font-extrabold tracking-widest text-[#111111] flex items-center gap-1">
                  <Truck size={14} className="text-luxury-gold" /> Vendor Intake
                </h3>
                <button 
                  onClick={() => setIsAddSupplierOpen(false)} 
                  className="p-1 hover:bg-zinc-100 rounded-lg text-zinc-400 hover:text-black cursor-pointer"
                >
                  <X size={14} />
                </button>
              </div>

              <form onSubmit={handleAddSupplierSubmit} className="space-y-4 text-left">
                <div>
                  <label className="text-[9.5px] uppercase tracking-wider text-zinc-500 font-bold block mb-1">Company / Vendor Name *</label>
                  <input
                    type="text"
                    required
                    value={suppName}
                    onChange={(e) => setSuppName(e.target.value)}
                    placeholder="e.g. Luxury Fabrics Ltd"
                    className="w-full bg-[#F8F9FA] border border-zinc-200 rounded-xl px-3 py-2 text-xs text-[#111111] focus:outline-none focus:border-luxury-gold/50 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="text-[9.5px] uppercase tracking-wider text-zinc-500 font-bold block mb-1">Contact Phone *</label>
                  <input
                    type="tel"
                    required
                    value={suppContact}
                    onChange={(e) => setSuppContact(e.target.value)}
                    placeholder="e.g. +91 98888 77777"
                    className="w-full bg-[#F8F9FA] border border-zinc-200 rounded-xl px-3 py-2 text-xs text-[#111111] focus:outline-none focus:border-luxury-gold/50 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="text-[9.5px] uppercase tracking-wider text-zinc-500 font-bold block mb-1">Email Address</label>
                  <input
                    type="email"
                    value={suppEmail}
                    onChange={(e) => setSuppEmail(e.target.value)}
                    placeholder="e.g. logistics@luxuryfabrics.com"
                    className="w-full bg-[#F8F9FA] border border-zinc-200 rounded-xl px-3 py-2 text-xs text-[#111111] focus:outline-none focus:border-luxury-gold/50 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="text-[9.5px] uppercase tracking-wider text-zinc-500 font-bold block mb-1">Factory / Office Address</label>
                  <textarea
                    value={suppAddress}
                    onChange={(e) => setSuppAddress(e.target.value)}
                    placeholder="Factory street and state details..."
                    rows={2}
                    className="w-full bg-[#F8F9FA] border border-zinc-200 rounded-xl px-3 py-2 text-xs text-[#111111] focus:outline-none focus:border-luxury-gold/50 focus:bg-white resize-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-[#111111] hover:bg-zinc-800 text-white font-extrabold rounded-xl text-xs uppercase tracking-widest transition-all cursor-pointer shadow-premium"
                >
                  Intake Supplier
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Compose PO Modal */}
      <AnimatePresence>
        {isCreatePOOpen && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border border-zinc-100 rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center pb-2 border-b border-zinc-100">
                <h3 className="text-xs uppercase font-extrabold tracking-widest text-[#111111] flex items-center gap-1">
                  <FileText size={14} className="text-luxury-gold" /> Compose Purchase Order
                </h3>
                <button 
                  onClick={() => setIsCreatePOOpen(false)} 
                  className="p-1 hover:bg-zinc-100 rounded-lg text-zinc-400 hover:text-black cursor-pointer"
                >
                  <X size={14} />
                </button>
              </div>

              <form onSubmit={handleCreatePOSubmit} className="space-y-4 text-left">
                {/* Supplier selection */}
                <div>
                  <label className="text-[9.5px] uppercase tracking-wider text-zinc-500 font-bold block mb-1">Select Supplier Vendor *</label>
                  <select
                    required
                    value={selectedSupplierId}
                    onChange={(e) => setSelectedSupplierId(e.target.value)}
                    className="w-full bg-[#F8F9FA] border border-zinc-200 rounded-xl px-3 py-2 text-xs text-[#111111] focus:outline-none"
                  >
                    <option value="">Choose Supplier</option>
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                {/* Add item selector */}
                <div className="border border-zinc-100 p-3 rounded-xl bg-zinc-50/50 space-y-3">
                  <span className="text-[9px] uppercase tracking-wider text-[#111111] font-extrabold block">Add Product Line Item</span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <select
                      value={tempProdId}
                      onChange={(e) => setTempProdId(e.target.value)}
                      className="bg-white border border-zinc-200 rounded-xl px-2 py-1.5 text-xs text-[#111111] focus:outline-none"
                    >
                      <option value="">Select Item</option>
                      {products.map(p => (
                        <option key={p.id} value={p.id}>{p.brand} {p.name}</option>
                      ))}
                    </select>

                    <input
                      type="number"
                      min="1"
                      placeholder="Qty"
                      value={tempQty || ''}
                      onChange={(e) => setTempQty(Math.max(1, Number(e.target.value)))}
                      className="bg-white border border-zinc-200 rounded-xl px-2 py-1.5 text-xs text-[#111111] focus:outline-none"
                    />

                    <input
                      type="number"
                      min="0"
                      placeholder="Cost Price (Rs.)"
                      value={tempCost || ''}
                      onChange={(e) => setTempCost(Math.max(0, Number(e.target.value)))}
                      className="bg-white border border-zinc-200 rounded-xl px-2 py-1.5 text-xs text-[#111111] focus:outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleAddPOItem}
                    className="px-3 py-1.5 bg-[#111111] text-white hover:bg-zinc-800 rounded-xl text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer"
                  >
                    <Plus size={10} /> Add Line Item
                  </button>
                </div>

                {/* Items draft list */}
                {poItems.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-[9.5px] uppercase tracking-wider text-zinc-500 font-bold block">Drafted Line Items</span>
                    <div className="border border-zinc-100 rounded-xl divide-y divide-zinc-100 overflow-hidden bg-white max-h-[150px] overflow-y-auto">
                      {poItems.map(item => (
                        <div key={item.productId} className="flex items-center justify-between p-2.5 text-xs">
                          <div>
                            <p className="font-extrabold text-[#111111]">{item.name}</p>
                            <span className="text-[9px] text-zinc-500 font-mono">Qty: {item.quantity} | Cost: Rs. {item.costPrice}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemovePOItem(item.productId)}
                            className="text-red-500 hover:text-red-700 font-bold text-[10px] uppercase cursor-pointer"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Delivery Date */}
                <div>
                  <label className="text-[9.5px] uppercase tracking-wider text-zinc-500 font-bold block mb-1">Expected Delivery Date *</label>
                  <div className="relative">
                    <Calendar size={12} className="absolute left-3 top-3 text-zinc-400" />
                    <input
                      type="date"
                      required
                      value={deliveryDate}
                      onChange={(e) => setDeliveryDate(e.target.value)}
                      className="w-full bg-[#F8F9FA] border border-zinc-200 rounded-xl pl-9 pr-3 py-2 text-xs text-[#111111] focus:outline-none"
                    />
                  </div>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  className="w-full py-2.5 bg-[#111111] hover:bg-zinc-800 text-white font-extrabold rounded-xl text-xs uppercase tracking-widest transition-all cursor-pointer shadow-premium"
                >
                  Generate & Send PO Draft
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
