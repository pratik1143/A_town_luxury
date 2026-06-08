import React, { useState, useEffect } from 'react';
import { Layout, Eye, ArrowUp, ArrowDown, Settings, Save } from 'lucide-react';

export interface ReceiptBlock {
  id: string;
  name: string;
  enabled: boolean;
}

export interface ReceiptConfig {
  storeName: string;
  address: string;
  phone: string;
  gstin: string;
  footerText: string;
  upiId: string;
  returnPolicy: string;
  showLogo: boolean;
  showAddress: boolean;
  showGSTIN: boolean;
  showPhone: boolean;
  showQR: boolean;
  showReturnPolicy: boolean;
  blocks: ReceiptBlock[];
}

const DEFAULT_CONFIG: ReceiptConfig = {
  storeName: 'A TOWN LUXURY',
  address: 'SHOWROOM NO. 4, MNG COMPLEX LANDRAN ROAD SOHANA, SECTOR 78 MOHALI, OPPOSITE HOMELAND',
  phone: '+91 98765-43210',
  gstin: '03AABCT9988F1Z2',
  footerText: 'Thank You For Shopping\nVisit Again',
  upiId: 'atownluxury@oksbi',
  returnPolicy: 'No refunds. Exchange within 7 days only with original tags attached.',
  showLogo: true,
  showAddress: true,
  showGSTIN: true,
  showPhone: true,
  showQR: true,
  showReturnPolicy: true,
  blocks: [
    { id: 'logo-header', name: 'Brand Header Logo', enabled: true },
    { id: 'store-details', name: 'Address & GSTIN Metadata', enabled: true },
    { id: 'bill-meta', name: 'Invoice Numbers & Date', enabled: true },
    { id: 'items-grid', name: 'Billed Products Grid', enabled: true },
    { id: 'payment-summary', name: 'Subtotals, Discounts & GST', enabled: true },
    { id: 'upi-qr', name: 'UPI Dynamic Pay QR', enabled: true },
    { id: 'footer-policy', name: 'Return Policy & Footer Greetings', enabled: true }
  ]
};

export const getReceiptConfig = (): ReceiptConfig => {
  const saved = localStorage.getItem('town_receipt_config');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (!parsed.blocks) parsed.blocks = DEFAULT_CONFIG.blocks;
      // Auto-migrate old default address
      if (parsed.address === 'Sector 82, JLPL Industrial Area, Mohali') {
        parsed.address = DEFAULT_CONFIG.address;
        localStorage.setItem('town_receipt_config', JSON.stringify(parsed));
      }
      return parsed;
    } catch {
      return DEFAULT_CONFIG;
    }
  }
  return DEFAULT_CONFIG;
};

interface ReceiptTemplateDesignerProps {
  onConfigChange?: (config: ReceiptConfig) => void;
}

export const ReceiptTemplateDesigner: React.FC<ReceiptTemplateDesignerProps> = ({ onConfigChange }) => {
  const [config, setConfig] = useState<ReceiptConfig>(DEFAULT_CONFIG);
  const [activeTab, setActiveTab] = useState<'content' | 'layout'>('content');
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    setConfig(getReceiptConfig());
  }, []);

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setConfig(prev => ({ ...prev, [name]: value }));
  };

  const handleToggle = (name: keyof ReceiptConfig) => {
    setConfig(prev => ({ ...prev, [name]: !prev[name] }));
  };

  const moveBlock = (index: number, direction: 'up' | 'down') => {
    const newBlocks = [...config.blocks];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (targetIndex < 0 || targetIndex >= newBlocks.length) return;
    
    const temp = newBlocks[index];
    newBlocks[index] = newBlocks[targetIndex];
    newBlocks[targetIndex] = temp;
    
    setConfig(prev => ({ ...prev, blocks: newBlocks }));
  };

  const handleSave = () => {
    localStorage.setItem('town_receipt_config', JSON.stringify(config));
    setSaveSuccess(true);
    if (onConfigChange) onConfigChange(config);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  return (
    <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10 select-none text-[#1C1A17]">
      
      {/* Controls panel */}
      <div className="rounded-[2rem] bg-white p-6 border border-zinc-200/80 shadow-sm flex flex-col justify-between space-y-6">
        <div>
          {/* Header tabs */}
          <div className="flex justify-between items-center border-b border-zinc-100 pb-4 mb-6">
            <div className="flex space-x-2">
              <button
                onClick={() => setActiveTab('content')}
                className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'content' 
                    ? 'bg-[#5D5FEF] text-white shadow-sm' 
                    : 'bg-zinc-50 border border-zinc-200 text-zinc-500 hover:text-black hover:bg-zinc-100/50'
                }`}
              >
                <Settings size={13} /> Edit Bill Content
              </button>
              <button
                onClick={() => setActiveTab('layout')}
                className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'layout' 
                    ? 'bg-[#5D5FEF] text-white shadow-sm' 
                    : 'bg-zinc-50 border border-zinc-200 text-zinc-500 hover:text-black hover:bg-zinc-100/50'
                }`}
              >
                <Layout size={13} /> Arrange Layout
              </button>
            </div>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-[#0F0E26] hover:bg-zinc-800 text-white rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 shadow-md"
            >
              <Save size={13} /> {saveSuccess ? 'Saved!' : 'Save Config'}
            </button>
          </div>

          {/* TAB 1: Edit Content */}
          {activeTab === 'content' && (
            <div className="space-y-4 max-h-[420px] overflow-y-auto pr-2 scrollbar-thin">
              <div>
                <label className="text-[9px] uppercase tracking-wider text-zinc-400 font-extrabold block mb-1.5">Store Name Header</label>
                <input 
                  type="text" 
                  name="storeName" 
                  value={config.storeName} 
                  onChange={handleTextChange} 
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2 text-xs text-[#1C1A17] font-semibold focus:outline-none focus:border-[#5D5FEF] focus:bg-white transition-all" 
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] uppercase tracking-wider text-zinc-400 font-extrabold block mb-1.5">Store Address</label>
                  <input 
                    type="text" 
                    name="address" 
                    value={config.address} 
                    onChange={handleTextChange} 
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2 text-xs text-[#1C1A17] font-semibold focus:outline-none focus:border-[#5D5FEF] focus:bg-white transition-all" 
                  />
                </div>
                <div>
                  <label className="text-[9px] uppercase tracking-wider text-zinc-400 font-extrabold block mb-1.5">GSTIN Number</label>
                  <input 
                    type="text" 
                    name="gstin" 
                    value={config.gstin} 
                    onChange={handleTextChange} 
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2 text-xs text-[#1C1A17] font-semibold focus:outline-none focus:border-[#5D5FEF] focus:bg-white transition-all" 
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] uppercase tracking-wider text-zinc-400 font-extrabold block mb-1.5">Contact Phone</label>
                  <input 
                    type="text" 
                    name="phone" 
                    value={config.phone} 
                    onChange={handleTextChange} 
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2 text-xs text-[#1C1A17] font-semibold focus:outline-none focus:border-[#5D5FEF] focus:bg-white transition-all" 
                  />
                </div>
                <div>
                  <label className="text-[9px] uppercase tracking-wider text-zinc-400 font-extrabold block mb-1.5">UPI Pay ID (For QR)</label>
                  <input 
                    type="text" 
                    name="upiId" 
                    value={config.upiId} 
                    onChange={handleTextChange} 
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2 text-xs text-[#1C1A17] font-semibold focus:outline-none focus:border-[#5D5FEF] focus:bg-white transition-all" 
                  />
                </div>
              </div>
              <div>
                <label className="text-[9px] uppercase tracking-wider text-zinc-400 font-extrabold block mb-1.5">Return / Store Policy Guidelines</label>
                <textarea 
                  name="returnPolicy" 
                  value={config.returnPolicy} 
                  onChange={handleTextChange} 
                  rows={2} 
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2 text-xs text-[#1C1A17] font-semibold focus:outline-none focus:border-[#5D5FEF] focus:bg-white transition-all" 
                />
              </div>
              <div>
                <label className="text-[9px] uppercase tracking-wider text-zinc-400 font-extrabold block mb-1.5">Footer Message</label>
                <textarea 
                  name="footerText" 
                  value={config.footerText} 
                  onChange={handleTextChange} 
                  rows={2} 
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2 text-xs text-[#1C1A17] font-semibold focus:outline-none focus:border-[#5D5FEF] focus:bg-white transition-all" 
                />
              </div>

              {/* Toggles */}
              <div className="pt-4 border-t border-zinc-100 grid grid-cols-2 gap-3 text-xs">
                {[
                  { label: 'Show Brand Logo Monogram', key: 'showLogo' },
                  { label: 'Show Store Address', key: 'showAddress' },
                  { label: 'Show GSTIN Registry', key: 'showGSTIN' },
                  { label: 'Show Phone Contact', key: 'showPhone' },
                  { label: 'Show Payment QR Code', key: 'showQR' },
                  { label: 'Show Return Policy Text', key: 'showReturnPolicy' }
                ].map(item => (
                  <label key={item.key} className="flex items-center space-x-2 text-zinc-500 hover:text-black cursor-pointer select-none font-bold">
                    <input
                      type="checkbox"
                      checked={!!config[item.key as keyof ReceiptConfig]}
                      onChange={() => handleToggle(item.key as keyof ReceiptConfig)}
                      className="rounded border-zinc-300 accent-[#5D5FEF]"
                    />
                    <span>{item.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: Arrange Layout Blocks */}
          {activeTab === 'layout' && (
            <div className="space-y-3">
              <p className="text-[9px] text-zinc-400 uppercase tracking-widest font-black mb-4">
                Click Arrow Controls to Reorder Printable Receipt Nodes
              </p>
              {config.blocks.map((block, idx) => (
                <div key={block.id} className="flex items-center justify-between p-4 rounded-2xl bg-zinc-50 border border-zinc-200 shadow-sm">
                  <div className="flex items-center space-x-3">
                    <span className="text-zinc-400 font-mono font-bold text-[10px] w-6">0{idx + 1}</span>
                    <span className="text-xs font-extrabold text-[#1C1A17] uppercase tracking-wider">{block.name}</span>
                  </div>
                  <div className="flex space-x-1">
                    <button
                      type="button"
                      onClick={() => moveBlock(idx, 'up')}
                      disabled={idx === 0}
                      className="p-1.5 hover:bg-zinc-200 rounded-xl text-zinc-400 hover:text-black disabled:opacity-20 cursor-pointer"
                    >
                      <ArrowUp size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveBlock(idx, 'down')}
                      disabled={idx === config.blocks.length - 1}
                      className="p-1.5 hover:bg-zinc-200 rounded-xl text-zinc-400 hover:text-black disabled:opacity-20 cursor-pointer"
                    >
                      <ArrowDown size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Preview panel */}
      <div className="rounded-[2rem] bg-zinc-100/60 border border-zinc-200 p-6 flex flex-col items-center justify-center min-h-[480px]">
        <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-black mb-4 flex items-center gap-1.5">
          <Eye size={12} className="text-[#5D5FEF]" /> Live POS Receipt Preview (80mm Mode)
        </p>

        {/* Mock thermal roll container */}
        <div className="w-72 bg-white text-black p-5 rounded-2xl shadow-xl font-mono text-[10px] leading-relaxed border border-zinc-200 relative overflow-hidden">
          {/* Jagged / tear element at bottom of receipt */}
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-zinc-200 to-zinc-300 pointer-events-none" style={{ clipPath: 'polygon(0% 0%, 5% 100%, 10% 0%, 15% 100%, 20% 0%, 25% 100%, 30% 0%, 35% 100%, 40% 0%, 45% 100%, 50% 0%, 55% 100%, 60% 0%, 65% 100%, 70% 0%, 75% 100%, 80% 0%, 85% 100%, 90% 0%, 95% 100%, 100% 0%)' }} />

          <div className="space-y-3 select-text pb-4">
            {config.blocks.map(block => {
              if (block.id === 'logo-header' && config.showLogo) {
                return (
                  <div key={block.id} className="text-center font-bold border-b border-dashed border-zinc-300 pb-2">
                    <div className="w-8 h-8 rounded border border-black flex items-center justify-center font-extrabold text-xs mx-auto mb-1.5">A</div>
                    <span className="text-[11px] font-black uppercase tracking-wider">{config.storeName}</span>
                  </div>
                );
              }
              if (block.id === 'store-details') {
                return (
                  <div key={block.id} className="text-center text-[9px] leading-tight space-y-0.5 pb-2 border-b border-dashed border-zinc-300 text-zinc-500">
                    {config.showAddress && <div>{config.address}</div>}
                    {config.showPhone && <div>Tel: {config.phone}</div>}
                    {config.showGSTIN && <div className="font-bold text-black">GSTIN: {config.gstin}</div>}
                  </div>
                );
              }
              if (block.id === 'bill-meta') {
                return (
                  <div key={block.id} className="space-y-0.5 border-b border-dashed border-zinc-300 pb-2 text-zinc-500">
                    <div className="flex justify-between">
                      <span>Invoice: <strong className="text-black">ATL-2026-00125</strong></span>
                    </div>
                    <div className="flex justify-between">
                      <span>Date: 27/05/2026</span>
                      <span>Cashier: Admin</span>
                    </div>
                  </div>
                );
              }
              if (block.id === 'items-grid') {
                return (
                  <div key={block.id} className="border-b border-dashed border-zinc-300 pb-2">
                    <div className="flex justify-between font-bold border-b border-zinc-200 pb-1 mb-1 text-[9px]">
                      <span className="w-1/2">Item</span>
                      <span className="w-1/4 text-center">Qty</span>
                      <span className="w-1/4 text-right">Amt</span>
                    </div>
                    <div className="space-y-1 text-[9px]">
                      <div className="flex justify-between">
                        <span className="w-1/2 truncate font-bold text-zinc-700">Luxury Bedsheet KNG</span>
                        <span className="w-1/4 text-center">1</span>
                        <span className="w-1/4 text-right font-bold">1499.00</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="w-1/2 truncate font-bold text-zinc-700">Curtain Blue Silk</span>
                        <span className="w-1/4 text-center">2</span>
                        <span className="w-1/4 text-right font-bold">1998.00</span>
                      </div>
                    </div>
                  </div>
                );
              }
              if (block.id === 'payment-summary') {
                return (
                  <div key={block.id} className="space-y-0.5 border-b border-dashed border-zinc-300 pb-2 text-right text-zinc-500">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span className="font-bold text-black">Rs. 3,497.00</span>
                    </div>
                    <div className="flex justify-between">
                      <span>GST (18%):</span>
                      <span className="font-bold text-black">Rs. 629.46</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Discount:</span>
                      <span className="font-bold text-black">-Rs. 100.00</span>
                    </div>
                    <div className="flex justify-between font-black text-[11px] pt-1.5 border-t border-zinc-200 text-black">
                      <span>Total:</span>
                      <span className="text-[#5D5FEF]">Rs. 4,026.46</span>
                    </div>
                  </div>
                );
              }
              if (block.id === 'upi-qr' && config.showQR) {
                return (
                  <div key={block.id} className="flex flex-col items-center py-2 border-b border-dashed border-zinc-300">
                    <div className="w-20 h-20 bg-zinc-50 border border-zinc-200 flex items-center justify-center text-[7px] text-zinc-400 font-bold p-1 rounded-lg">
                      [ UPI PAYMENT QR ]
                    </div>
                    <span className="text-[8px] text-zinc-400 mt-1.5 uppercase tracking-wider font-bold">Scan to Pay: {config.upiId}</span>
                  </div>
                );
              }
              if (block.id === 'footer-policy') {
                return (
                  <div key={block.id} className="text-center space-y-2 text-[9px] pt-1.5 text-zinc-500">
                    {config.showReturnPolicy && (
                      <div className="border border-dashed border-zinc-300 p-2 rounded-xl text-[8px] leading-snug">
                        {config.returnPolicy}
                      </div>
                    )}
                    <div className="whitespace-pre-line font-black text-black">
                      {config.footerText}
                    </div>
                  </div>
                );
              }
              return null;
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
