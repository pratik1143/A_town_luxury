import React, { useEffect, useState } from 'react';
import { listenLogs, listenProducts, listenActivityLogs } from '../firebase/db';
import { Search, Filter, History, ShieldAlert } from 'lucide-react';

export const InventoryLogs: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [activeTab, setActiveTab] = useState<'inventory' | 'activity'>('inventory');

  useEffect(() => {
    const unsubLogs = listenLogs(setLogs);
    const unsubProducts = listenProducts(setProducts);
    const unsubActivityLogs = listenActivityLogs(setActivityLogs);

    return () => {
      unsubLogs();
      unsubProducts();
      unsubActivityLogs();
    };
  }, []);

  const getProductDetails = (productId: string) => {
    return products.find(p => p.id === productId);
  };

  // Filter inventory logs
  const filteredLogs = logs.filter(log => {
    const product = getProductDetails(log.productId);
    const productName = product ? product.name.toLowerCase() : '';
    const productSku = product ? product.sku.toLowerCase() : '';
    
    const matchesSearch = 
      productName.includes(search.toLowerCase()) ||
      productSku.includes(search.toLowerCase()) ||
      log.reason?.toLowerCase().includes(search.toLowerCase());
      
    const matchesType = selectedType ? log.type === selectedType : true;
    
    return matchesSearch && matchesType;
  });

  // Filter security activity logs
  const filteredActivityLogs = activityLogs.filter(log => 
    log.action.toLowerCase().includes(search.toLowerCase()) ||
    log.details.toLowerCase().includes(search.toLowerCase()) ||
    log.userName.toLowerCase().includes(search.toLowerCase())
  );

  const getLogTypeBadge = (type: string) => {
    if (type === 'initial') {
      return 'text-green-600 bg-green-50 border-green-200';
    }
    if (type === 'manual_update') {
      return 'text-blue-600 bg-blue-50 border-blue-200';
    }
    return 'text-zinc-600 bg-zinc-50 border-zinc-200';
  };

  const getLogTypeLabel = (type: string) => {
    if (type === 'initial') return 'INTAKE';
    if (type === 'manual_update') return 'AUDIT ADJUST';
    return type.toUpperCase();
  };

  return (
    <div className="space-y-8 select-none z-10 relative text-[#111111]">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <span className="text-[9px] uppercase tracking-widest text-luxury-gold font-bold">
            Database Ledgers
          </span>
          <h1 className="text-2xl md:text-3xl font-extrabold text-black tracking-wide uppercase font-sans mt-0.5 animate-in fade-in duration-300">
            Security Audit Trails
          </h1>
        </div>

        {/* Tab triggers */}
        <div className="flex bg-zinc-100 p-1 rounded-xl border border-zinc-200">
          <button
            onClick={() => {
              setActiveTab('inventory');
              setSearch('');
            }}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'inventory'
                ? 'bg-[#111111] text-white shadow-premium'
                : 'text-zinc-500 hover:text-black'
            }`}
          >
            Inventory Ledger
          </button>
          <button
            onClick={() => {
              setActiveTab('activity');
              setSearch('');
            }}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'activity'
                ? 'bg-[#111111] text-white shadow-premium'
                : 'text-zinc-500 hover:text-black'
            }`}
          >
            System Security Logs
          </button>
        </div>
      </div>

      {/* Toolbar filters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-2xl bg-white border border-zinc-100 shadow-premium">
        
        {/* Search */}
        <div className="relative sm:col-span-2">
          <Search size={14} className="absolute left-3 top-3.5 text-zinc-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={activeTab === 'inventory' ? "Search SKU, product name or reason..." : "Search action, details or user..."}
            className="w-full bg-[#F8F9FA] border border-zinc-200 rounded-xl pl-9 pr-4 py-2.5 text-xs text-[#111111] focus:outline-none focus:bg-white placeholder-zinc-400 transition-all"
          />
        </div>

        {/* Type Filter (Inventory only) */}
        {activeTab === 'inventory' ? (
          <div className="relative">
            <Filter size={14} className="absolute left-3 top-3.5 text-zinc-400" />
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full bg-[#F8F9FA] border border-zinc-200 rounded-xl pl-9 pr-4 py-2.5 text-xs text-[#111111] focus:outline-none appearance-none cursor-pointer"
            >
              <option value="">All Actions</option>
              <option value="initial">System Intake</option>
              <option value="manual_update">Audit Adjustments</option>
            </select>
          </div>
        ) : (
          <div className="flex items-center justify-end px-2 text-[10px] text-zinc-400 font-bold uppercase tracking-wider">
            Listing {filteredActivityLogs.length} activity audits
          </div>
        )}
      </div>

      {/* Tables based on selected tab */}
      {activeTab === 'inventory' ? (
        filteredLogs.length > 0 ? (
          <div className="rounded-2xl border border-zinc-100 bg-white overflow-hidden shadow-premium">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse premium-table">
                <thead>
                  <tr>
                    <th>Audit Date / Time</th>
                    <th>Product Details</th>
                    <th>Action Type</th>
                    <th>Ledger Adjustment</th>
                    <th>Projected Level</th>
                    <th>Signatory</th>
                    <th>Ledger Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.map((log) => {
                    const product = getProductDetails(log.productId);
                    return (
                      <tr key={log.id}>
                        <td className="font-mono text-zinc-500 text-xs">
                          {new Date(log.createdAt).toLocaleString([], {
                            month: 'short',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit'
                          })}
                        </td>
                        <td>
                          {product ? (
                            <div>
                              <p className="font-extrabold text-[#111111] text-xs">{product.brand} {product.name}</p>
                              <span className="font-mono text-[9px] text-zinc-400 uppercase">SKU: {product.sku}</span>
                            </div>
                          ) : (
                            <span className="text-zinc-500 text-xs italic">Product deleted from logs</span>
                          )}
                        </td>
                        <td>
                          <span className={`px-2 py-0.5 rounded-full border text-[9px] font-extrabold uppercase tracking-wider ${getLogTypeBadge(log.type)}`}>
                            {getLogTypeLabel(log.type)}
                          </span>
                        </td>
                        <td className="font-mono font-bold text-xs">
                          {log.changeQuantity > 0 ? (
                            <span className="text-green-600">+{log.changeQuantity}</span>
                          ) : (
                            <span className="text-red-500">{log.changeQuantity}</span>
                          )}
                        </td>
                        <td className="font-mono text-black text-xs font-bold">
                          {log.newStockQuantity} units
                        </td>
                        <td className="text-zinc-700 text-xs font-bold">
                          {log.userName || 'Mr Harish Chaudhary'}
                        </td>
                        <td className="text-zinc-500 text-xs max-w-xs truncate font-medium">
                          {log.reason || 'Manual ledger balancing'}
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
              <History size={16} />
            </div>
            <p className="text-xs text-zinc-500 font-semibold uppercase tracking-wider">Audit trail clear</p>
            <p className="text-[10px] text-zinc-400">Inventory transactions and intake adjustments will appear here.</p>
          </div>
        )
      ) : (
        // System activity logs tab
        filteredActivityLogs.length > 0 ? (
          <div className="rounded-2xl border border-zinc-100 bg-white overflow-hidden shadow-premium">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse premium-table">
                <thead>
                  <tr>
                    <th>Log Date / Time</th>
                    <th>Action Category</th>
                    <th>Details</th>
                    <th>Executed By</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredActivityLogs.map((log) => (
                    <tr key={log.id}>
                      <td className="font-mono text-zinc-500 text-xs w-[180px]">
                        {new Date(log.createdAt).toLocaleString([], {
                          month: 'short',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit'
                        })}
                      </td>
                      <td>
                        <span className="px-2.5 py-1 rounded-lg text-[9.5px] font-extrabold uppercase bg-zinc-100 border border-zinc-200 text-zinc-700">
                          {log.action}
                        </span>
                      </td>
                      <td className="text-xs text-zinc-600 font-semibold max-w-md leading-relaxed">
                        {log.details}
                      </td>
                      <td className="text-xs font-extrabold text-black">
                        {log.userName}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl bg-white p-12 border border-zinc-100 text-center space-y-3 shadow-premium">
            <div className="w-12 h-12 bg-zinc-50 border border-zinc-100 rounded-full flex items-center justify-center text-zinc-400 mx-auto">
              <ShieldAlert size={16} />
            </div>
            <p className="text-xs text-zinc-500 font-semibold uppercase tracking-wider">No security activity logged</p>
            <p className="text-[10px] text-zinc-400">System logins and configuration edits will appear here.</p>
          </div>
        )
      )}
    </div>
  );
};
