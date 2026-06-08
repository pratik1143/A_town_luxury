import React, { useEffect, useState } from 'react';
import { 
  listenCategories, 
  listenProducts, 
  addCategory, 
  updateCategory, 
  deleteCategory 
} from '../firebase/db';
import { CategoryModal } from '../components/CategoryModal';
import { useAuth } from '../context/AuthContext';
import { Plus, Edit, Trash, FolderOpen, AlertCircle } from 'lucide-react';

export const Categories: React.FC = () => {
  const { user } = useAuth();
  const isCashier = user?.role === 'cashier';
  const [categories, setCategories] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<any | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const unsubCategories = listenCategories(setCategories);
    const unsubProducts = listenProducts(setProducts);

    return () => {
      unsubCategories();
      unsubProducts();
    };
  }, []);

  const handleCategorySubmit = async (name: string, description: string) => {
    if (selectedCategory) {
      await updateCategory(selectedCategory.id, name, description);
    } else {
      await addCategory(name, description);
    }
  };

  // Get product count in category
  const getProductCount = (categoryId: string) => {
    return products.filter(p => p.categoryId === categoryId).length;
  };

  return (
    <div className="space-y-8 select-none z-10 relative text-[#111111]">
      
      {/* Header controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <span className="text-[9px] uppercase tracking-widest text-luxury-gold font-bold">
            Collections Catalog
          </span>
          <h1 className="text-2xl md:text-3xl font-extrabold text-black tracking-wide uppercase font-sans mt-0.5">
            Category Management
          </h1>
        </div>
        
        {!isCashier && (
          <button
            onClick={() => {
              setSelectedCategory(null);
              setIsModalOpen(true);
            }}
            className="self-start sm:self-center px-4 py-2.5 bg-[#111111] text-white rounded-xl text-xs font-bold hover:bg-zinc-800 transition-all flex items-center gap-1.5 shadow-premium cursor-pointer"
          >
            <Plus size={14} className="text-luxury-gold" /> Create Category
          </button>
        )}
      </div>

      {/* Warning/Info alert about deleting categories */}
      <div className="p-4 bg-white border border-zinc-100 rounded-2xl flex items-start gap-3 shadow-premium">
        <div className="p-2 bg-yellow-50 text-luxury-gold rounded-lg border border-yellow-100 flex-shrink-0">
          <AlertCircle size={14} />
        </div>
        <div className="text-xs space-y-1">
          <p className="text-black font-extrabold uppercase tracking-wider">System Rule: Cascade Safe</p>
          <p className="text-zinc-500 leading-normal font-medium">
            Deleting a category does not delete its corresponding products. Instead, the products are safely marked as "Uncategorized" in the inventory registry.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-xs rounded-xl flex items-center justify-between shadow-premium">
          <span>⚠️ {error}</span>
          <button onClick={() => setError('')} className="text-zinc-500 hover:text-black text-[10px] font-bold cursor-pointer">DISMISS</button>
        </div>
      )}

      {/* Category List Cards/Table */}
      {categories.length > 0 ? (
        <div className="rounded-2xl border border-zinc-100 bg-white overflow-hidden shadow-premium">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse premium-table">
              <thead>
                <tr>
                  <th>Collection Identifier</th>
                  <th>Category Name</th>
                  <th>Description</th>
                  <th>Product Count</th>
                  {!isCashier && <th className="text-right">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {categories.map((cat) => {
                  const prodCount = getProductCount(cat.id);
                  return (
                    <tr key={cat.id}>
                      <td className="font-mono text-zinc-500 text-xs">
                        {cat.id}
                      </td>
                      <td className="font-extrabold text-[#111111] tracking-wide">
                        {cat.name}
                      </td>
                      <td className="text-zinc-500 max-w-xs truncate">
                        {cat.description || 'No description added'}
                      </td>
                      <td>
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${
                          prodCount > 0 
                            ? 'bg-luxury-gold/10 text-luxury-gold border border-luxury-gold/20' 
                            : 'bg-zinc-100 text-zinc-500 border border-zinc-200'
                        }`}>
                          <FolderOpen size={10} /> {prodCount} {prodCount === 1 ? 'Model' : 'Models'}
                        </span>
                      </td>
                      {!isCashier && (
                        <td className="text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => {
                                setSelectedCategory(cat);
                                setIsModalOpen(true);
                              }}
                              className="p-2 bg-white hover:bg-zinc-50 rounded-lg text-zinc-600 hover:text-black transition-colors cursor-pointer border border-zinc-200 shadow-sm"
                              title="Edit Category"
                            >
                              <Edit size={12} />
                            </button>
                            <button
                              onClick={async () => {
                                if (confirm(`Are you sure you want to delete ${cat.name}? Products in this category will become Uncategorized.`)) {
                                  try {
                                    await deleteCategory(cat.id);
                                  } catch (err: any) {
                                    setError(err.message || 'Failed to delete category.');
                                  }
                                }
                              }}
                              className="p-2 bg-white hover:bg-red-50 rounded-lg text-zinc-600 hover:text-red-600 transition-colors cursor-pointer border border-zinc-200 shadow-sm"
                              title="Delete Category"
                            >
                              <Trash size={12} />
                            </button>
                          </div>
                        </td>
                      )}
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
            📁
          </div>
          <p className="text-xs text-zinc-500 font-semibold uppercase tracking-wider">No Categories active</p>
          <p className="text-[10px] text-zinc-400">Create collections to group luxury assets.</p>
        </div>
      )}

      {/* Category Modal Dialog */}
      <CategoryModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedCategory(null);
        }}
        category={selectedCategory}
        onSubmit={handleCategorySubmit}
      />
    </div>
  );
};
