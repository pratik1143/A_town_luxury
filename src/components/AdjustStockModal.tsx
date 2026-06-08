import React, { useState, useEffect } from 'react';
import { X, Plus, Minus } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  sku: string;
  brand: string;
  stockQuantity: number;
}

interface AdjustStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  onSubmit: (productId: string, changeQty: number, reason: string) => Promise<void>;
}

export const AdjustStockModal: React.FC<AdjustStockModalProps> = ({
  isOpen,
  onClose,
  product,
  onSubmit,
}) => {
  const [changeQty, setChangeQty] = useState<number>(0);
  const [reason, setReason] = useState('Stock audit intake');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setChangeQty(0);
    setReason('Stock audit intake');
    setError('');
  }, [product, isOpen]);

  if (!isOpen || !product) return null;

  const currentStock = product.stockQuantity || 0;
  const newStock = currentStock + changeQty;

  const handleAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (changeQty === 0) {
      setError('Adjustment amount cannot be zero');
      return;
    }
    if (newStock < 0) {
      setError('Adjusted stock level cannot be negative');
      return;
    }
    if (!reason.trim()) {
      setError('Reason is required');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(product.id, changeQty, reason);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Stock adjustment failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Blur Overlay */}
      <div 
        className="fixed inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-md bg-white border border-zinc-100 rounded-2xl overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/50">
          <div>
            <span className="text-[9px] uppercase tracking-widest text-luxury-gold font-bold">
              Inventory Ledger
            </span>
            <h2 className="text-lg font-bold text-[#111111] mt-1">
              Adjust Stock Level
            </h2>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-zinc-100 rounded-lg text-zinc-400 hover:text-black transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleAdjust} className="p-6 space-y-5 text-left">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-xs rounded-xl font-semibold">
              {error}
            </div>
          )}

          {/* Product context box */}
          <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-100 text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-zinc-500">Brand / Name:</span>
              <span className="text-[#111111] font-bold">{product.brand} {product.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">SKU:</span>
              <span className="text-[#111111] font-mono uppercase">{product.sku}</span>
            </div>
            <div className="flex justify-between pt-1.5 border-t border-zinc-200 mt-1.5">
              <span className="text-zinc-500">Current Stock:</span>
              <span className="text-luxury-gold font-bold">{currentStock} units</span>
            </div>
          </div>

          {/* Incrementor Controls */}
          <div>
            <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold block mb-2 text-center">
              Adjustment Count
            </label>
            <div className="flex items-center justify-center space-x-4">
              <button
                type="button"
                onClick={() => setChangeQty(prev => prev - 1)}
                className="w-10 h-10 rounded-xl bg-white hover:bg-zinc-50 flex items-center justify-center border border-zinc-200 text-zinc-600 hover:text-black transition-colors cursor-pointer"
              >
                <Minus size={16} />
              </button>
              <div className="w-20 text-center">
                <span className={`text-2xl font-mono font-extrabold ${
                  changeQty > 0 ? 'text-green-600' : changeQty < 0 ? 'text-red-600' : 'text-black'
                }`}>
                  {changeQty > 0 ? `+${changeQty}` : changeQty}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setChangeQty(prev => prev + 1)}
                className="w-10 h-10 rounded-xl bg-white hover:bg-zinc-50 flex items-center justify-center border border-zinc-200 text-zinc-600 hover:text-black transition-colors cursor-pointer"
              >
                <Plus size={16} />
              </button>
            </div>
            {/* Quick selectors */}
            <div className="flex justify-center space-x-2 mt-3">
              {[-10, -5, -1, 1, 5, 10].map(val => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setChangeQty(val)}
                  className="px-2.5 py-1 text-[10px] font-mono font-semibold rounded bg-white border border-zinc-200 text-zinc-500 hover:text-black hover:bg-zinc-50 transition-all cursor-pointer"
                >
                  {val > 0 ? `+${val}` : val}
                </button>
              ))}
            </div>
          </div>

          {/* New Stock Preview */}
          <div className="flex justify-between items-center py-2 px-4 rounded-xl bg-luxury-gold/5 border border-luxury-gold/15 text-xs">
            <span className="text-zinc-600">Projected Final Stock:</span>
            <span className="text-black font-extrabold font-mono text-sm">
              {newStock} units
            </span>
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold block mb-1">
              Ledger Reason *
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full bg-white border border-zinc-200 rounded-xl px-4 py-2.5 text-xs text-[#111111] focus:outline-none focus:border-luxury-gold/50 cursor-pointer"
            >
              <option value="Stock audit intake">Stock audit intake</option>
              <option value="Purchase invoice replenishment">Purchase invoice replenishment (Stock In)</option>
              <option value="Manual sales adjustment">Manual sales adjustment (Stock Out)</option>
              <option value="Damaged item discard">Damaged item discard (Damage Stock)</option>
              <option value="Customer purchase return">Customer purchase return (Return)</option>
              <option value="Promotional showcase stock">Promotional showcase stock</option>
            </select>
          </div>

          {/* Footer controls */}
          <div className="flex justify-end gap-3 pt-4 border-t border-zinc-100 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-white border border-zinc-200 hover:bg-zinc-50 rounded-xl text-xs font-bold text-zinc-600 hover:text-black transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-[#111111] hover:bg-zinc-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-premium"
            >
              {isSubmitting ? 'Posting...' : 'Post Adjustment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
