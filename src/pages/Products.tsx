import React, { useEffect, useState } from 'react';
import { 
  listenProducts, 
  listenCategories, 
  addProduct, 
  updateProduct, 
  deleteProduct,
  adjustStock 
} from '../firebase/db';
import { ProductCard3D } from '../components/ProductCard3D';
import { ProductModal } from '../components/ProductModal';
import { AdjustStockModal } from '../components/AdjustStockModal';
import { useAuth } from '../context/AuthContext';
import { Search, Plus, Filter, ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const Products: React.FC = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  
  // Filtering & Sorting
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [sortBy, setSortBy] = useState('newest'); // newest, price-asc, price-desc, stock-low, stock-high

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // Modals state
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [selectedProductForEdit, setSelectedProductForEdit] = useState<any | null>(null);

  const [isAdjustStockOpen, setIsAdjustStockOpen] = useState(false);
  const [selectedProductForStock, setSelectedProductForStock] = useState<any | null>(null);

  useEffect(() => {
    const unsubProducts = listenProducts(setProducts);
    const unsubCategories = listenCategories(setCategories);

    return () => {
      unsubProducts();
      unsubCategories();
    };
  }, []);

  // Filter products
  const filteredProducts = products.filter(p => {
    const matchesSearch = 
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.brand.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase());
      
    const matchesCategory = selectedCategory ? p.categoryId === selectedCategory : true;
    
    return matchesSearch && matchesCategory;
  });

  // Sort products
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    if (sortBy === 'newest') {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
    if (sortBy === 'price-asc') {
      return a.sellingPrice - b.sellingPrice;
    }
    if (sortBy === 'price-desc') {
      return b.sellingPrice - a.sellingPrice;
    }
    if (sortBy === 'stock-low') {
      return a.stockQuantity - b.stockQuantity;
    }
    if (sortBy === 'stock-high') {
      return b.stockQuantity - a.stockQuantity;
    }
    return 0;
  });

  // Paginated products
  const totalPages = Math.ceil(sortedProducts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedProducts = sortedProducts.slice(startIndex, startIndex + itemsPerPage);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // CRUD actions
  const handleProductSubmit = async (data: any) => {
    if (Array.isArray(data)) {
      if (user) {
        for (const item of data) {
          await addProduct(item, { uid: user.uid, fullName: user.fullName });
        }
      }
    } else {
      if (selectedProductForEdit) {
        // Edit mode
        await updateProduct(selectedProductForEdit.id, data);
      } else {
        // Create mode
        if (user) {
          await addProduct(data, { uid: user.uid, fullName: user.fullName });
        }
      }
    }
  };

  const handleAdjustStockSubmit = async (productId: string, changeQty: number, reason: string) => {
    if (user) {
      await adjustStock(productId, changeQty, reason, { uid: user.uid, fullName: user.fullName });
    }
  };

  return (
    <div className="space-y-8 select-none z-10 relative text-[#111111]">
      
      {/* Header controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <span className="text-[9px] uppercase tracking-widest text-luxury-gold font-bold">
            Asset Inventory
          </span>
          <h1 className="text-2xl md:text-3xl font-extrabold text-black tracking-wide uppercase font-sans mt-0.5">
            Luxury Products Ledger
          </h1>
        </div>
        
        {user?.role !== 'cashier' && (
          <button
            onClick={() => {
              setSelectedProductForEdit(null);
              setIsProductModalOpen(true);
            }}
            className="self-start sm:self-center px-4 py-2.5 bg-[#111111] text-white rounded-xl text-xs font-bold hover:bg-zinc-800 transition-all flex items-center gap-1.5 shadow-premium cursor-pointer"
          >
            <Plus size={14} className="text-luxury-gold" /> Intake Product
          </button>
        )}
      </div>

      {/* Search Filter and Sorting toolbar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 rounded-2xl bg-white border border-zinc-100 shadow-premium">
        
        {/* Search */}
        <div className="relative">
          <Search size={14} className="absolute left-3 top-3.5 text-zinc-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search SKU, brand or title..."
            className="w-full bg-[#F8F9FA] border border-zinc-200/60 rounded-xl pl-9 pr-4 py-2.5 text-xs text-[#111111] focus:outline-none focus:border-luxury-gold/30 focus:bg-white placeholder-zinc-400 transition-all"
          />
        </div>

        {/* Category Filter */}
        <div className="relative">
          <Filter size={14} className="absolute left-3 top-3.5 text-zinc-400" />
          <select
            value={selectedCategory}
            onChange={(e) => {
              setSelectedCategory(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full bg-[#F8F9FA] border border-zinc-200/60 rounded-xl pl-9 pr-4 py-2.5 text-xs text-[#111111] focus:outline-none focus:border-luxury-gold/30 appearance-none cursor-pointer"
          >
            <option value="">All Collections</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* Sorting selection */}
        <div className="relative">
          <ArrowUpDown size={14} className="absolute left-3 top-3.5 text-zinc-400" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="w-full bg-[#F8F9FA] border border-zinc-200/60 rounded-xl pl-9 pr-4 py-2.5 text-xs text-[#111111] focus:outline-none focus:border-luxury-gold/30 appearance-none cursor-pointer"
          >
            <option value="newest">Sort: Newly Intaked</option>
            <option value="price-asc">Price: Low to High</option>
            <option value="price-desc">Price: High to Low</option>
            <option value="stock-low">Stock: Low to High</option>
            <option value="stock-high">Stock: High to Low</option>
          </select>
        </div>

        {/* Results indicator */}
        <div className="flex items-center justify-end px-2 text-[10px] text-zinc-400 font-bold uppercase tracking-wider">
          Listing {filteredProducts.length} models
        </div>
      </div>

      {/* Products Grid */}
      {paginatedProducts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence mode="popLayout">
            {paginatedProducts.map(product => {
              const cat = categories.find(c => c.id === product.categoryId);
              return (
                <motion.div
                  key={product.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.3 }}
                >
                  <ProductCard3D
                    product={product}
                    categoryName={cat?.name}
                    onEdit={(prod) => {
                      setSelectedProductForEdit(prod);
                      setIsProductModalOpen(true);
                    }}
                    onDelete={async (id) => {
                      await deleteProduct(id, user ? { uid: user.uid, fullName: user.fullName } : undefined);
                    }}
                    onAdjustStock={(prod) => {
                      setSelectedProductForStock(prod);
                      setIsAdjustStockOpen(true);
                    }}
                  />
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      ) : (
        <div className="rounded-2xl bg-white p-12 border border-zinc-100 text-center space-y-3 shadow-premium">
          <div className="w-12 h-12 bg-zinc-50 border border-zinc-100 rounded-full flex items-center justify-center text-zinc-400 mx-auto">
            🔍
          </div>
          <p className="text-xs text-zinc-500 font-semibold uppercase tracking-wider">No matching models found</p>
          <p className="text-[10px] text-zinc-400">Try modifying your filtering attributes or intake a new item.</p>
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center space-x-2 pt-6 border-t border-zinc-100">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="w-8 h-8 rounded-lg bg-white border border-zinc-200 flex items-center justify-center text-zinc-400 hover:text-black hover:bg-zinc-50 disabled:opacity-30 cursor-pointer"
          >
            <ChevronLeft size={16} />
          </button>
          
          {Array.from({ length: totalPages }, (_, idx) => idx + 1).map(page => (
            <button
              key={page}
              onClick={() => handlePageChange(page)}
              className={`w-8 h-8 rounded-lg text-xs font-mono font-bold transition-all border cursor-pointer ${
                currentPage === page 
                  ? 'bg-[#111111] text-white border-transparent shadow-premium' 
                  : 'bg-white border-zinc-200 text-zinc-500 hover:text-black hover:bg-zinc-50'
              }`}
            >
              {page}
            </button>
          ))}

          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="w-8 h-8 rounded-lg bg-white border border-zinc-200 flex items-center justify-center text-zinc-400 hover:text-black hover:bg-zinc-50 disabled:opacity-30 cursor-pointer"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* Modals Overlay */}
      <ProductModal
        isOpen={isProductModalOpen}
        onClose={() => {
          setIsProductModalOpen(false);
          setSelectedProductForEdit(null);
        }}
        product={selectedProductForEdit}
        categories={categories}
        onSubmit={handleProductSubmit}
      />

      <AdjustStockModal
        isOpen={isAdjustStockOpen}
        onClose={() => {
          setIsAdjustStockOpen(false);
          setSelectedProductForStock(null);
        }}
        product={selectedProductForStock}
        onSubmit={handleAdjustStockSubmit}
      />
    </div>
  );
};
