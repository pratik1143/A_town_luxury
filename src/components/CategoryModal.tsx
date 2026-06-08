import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface Category {
  id: string;
  name: string;
  description?: string;
}

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  category?: Category | null;
  onSubmit: (name: string, description: string) => Promise<void>;
}

export const CategoryModal: React.FC<CategoryModalProps> = ({
  isOpen,
  onClose,
  category,
  onSubmit,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (category) {
      setName(category.name);
      setDescription(category.description || '');
    } else {
      setName('');
      setDescription('');
    }
    setError('');
  }, [category, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Category name is required');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(name, description);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Category update failed.');
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
          <h2 className="text-sm font-extrabold text-[#111111] uppercase tracking-wider">
            {category ? 'Edit Category' : 'Create Category'}
          </h2>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-zinc-100 rounded-lg text-zinc-400 hover:text-black transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-xs rounded-xl font-semibold">
              {error}
            </div>
          )}

          <div>
            <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold block mb-1">
              Category Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError('');
              }}
              placeholder="e.g. Fine Leather Goods"
              className="w-full bg-[#F8F9FA] border border-zinc-200 rounded-xl px-4 py-2.5 text-xs text-[#111111] focus:outline-none focus:border-luxury-gold/50 focus:bg-white"
            />
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold block mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide a detailed description of the category..."
              rows={3}
              className="w-full bg-[#F8F9FA] border border-zinc-200 rounded-xl px-4 py-2.5 text-xs text-[#111111] focus:outline-none focus:border-luxury-gold/50 focus:bg-white resize-none"
            />
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
              {isSubmitting ? 'Saving...' : category ? 'Save Changes' : 'Create Category'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
