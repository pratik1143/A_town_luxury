import React, { useRef, useState } from 'react';
import { Edit, Trash, Sliders, AlertTriangle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface Product {
  id: string;
  name: string;
  sku: string;
  brand: string;
  categoryId: string;
  size?: string;
  color?: string;
  mrp: number;
  sellingPrice: number;
  stockQuantity: number;
  description?: string;
  imageUrl?: string;
  createdAt: string;
}

interface ProductCard3DProps {
  product: Product;
  categoryName?: string;
  onEdit: (product: Product) => void;
  onDelete: (id: string) => void;
  onAdjustStock: (product: Product) => void;
}

export const ProductCard3D: React.FC<ProductCard3DProps> = ({
  product,
  categoryName,
  onEdit,
  onDelete,
  onAdjustStock,
}) => {
  const { user } = useAuth();
  const isCashier = user?.role === 'cashier';
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);
  const [sheenPosition, setSheenPosition] = useState({ x: 50, y: 50 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = cardRef.current;
    if (!card) return;

    const { left, top, width, height } = card.getBoundingClientRect();
    
    // Relative mouse position from card center
    const x = e.clientX - (left + width / 2);
    const y = e.clientY - (top + height / 2);

    // Limit rotation tilt to maximum 12 degrees
    const maxTilt = 12;
    const rY = (x / (width / 2)) * maxTilt;
    const rX = -(y / (height / 2)) * maxTilt;

    setRotateX(rX);
    setRotateY(rY);

    // Calculate sheen position percentage
    const sheenX = ((e.clientX - left) / width) * 100;
    const sheenY = ((e.clientY - top) / height) * 100;
    setSheenPosition({ x: sheenX, y: sheenY });
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setRotateX(0);
    setRotateY(0);
  };

  const isLowStock = product.stockQuantity < 5;

  return (
    <div
      className="w-full relative select-none"
      style={{ perspective: 1000 }}
    >
      <div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="w-full rounded-2xl bg-white relative overflow-hidden transition-all duration-300 ease-out border border-zinc-200/60 shadow-premium"
        style={{
          transform: `rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(${isHovered ? 1.02 : 1})`,
          transformStyle: 'preserve-3d',
        }}
      >
        {/* Golden Gloss Sheen Overlay */}
        <div
          className="absolute inset-0 pointer-events-none z-10 transition-opacity duration-300"
          style={{
            opacity: isHovered ? 0.65 : 0,
            background: `radial-gradient(circle at ${sheenPosition.x}% ${sheenPosition.y}%, rgba(201, 162, 39, 0.05) 0%, rgba(255, 255, 255, 0) 60%)`,
          }}
        />

        {/* Top Hover Controls Overlay */}
        {!isCashier && (
          <div className="absolute top-4 right-4 z-20 flex space-x-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAdjustStock(product);
              }}
              className="p-2 bg-white/90 hover:bg-luxury-gold hover:text-black rounded-lg border border-zinc-200 hover:border-transparent text-zinc-600 transition-all duration-200 cursor-pointer shadow-sm"
              title="Adjust Stock"
            >
              <Sliders size={13} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit(product);
              }}
              className="p-2 bg-white/90 hover:bg-[#111111] hover:text-white rounded-lg border border-zinc-200 hover:border-transparent text-zinc-600 transition-all duration-200 cursor-pointer shadow-sm"
              title="Edit Details"
            >
              <Edit size={13} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (confirm(`Are you sure you want to delete ${product.name}?`)) {
                  onDelete(product.id);
                }
              }}
              className="p-2 bg-white/90 hover:bg-red-500 hover:text-white rounded-lg border border-zinc-200 hover:border-transparent text-zinc-600 transition-all duration-200 cursor-pointer shadow-sm"
              title="Delete Product"
            >
              <Trash size={13} />
            </button>
          </div>
        )}

        {/* Image Container */}
        <div className="w-full h-48 bg-zinc-50 relative overflow-hidden flex items-center justify-center border-b border-zinc-100">
          {product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt={product.name}
              className="w-full h-full object-cover transition-transform duration-700 ease-out"
              style={{
                transform: isHovered ? 'scale(1.1) translateZ(20px)' : 'scale(1) translateZ(0)',
              }}
            />
          ) : (
            <div className="flex flex-col items-center justify-center space-y-2 text-zinc-400">
              <span className="text-[10px] tracking-widest uppercase font-bold">No Image Available</span>
            </div>
          )}
          
          {/* Low Stock Indicator Tag */}
          {isLowStock && (
            <div className="absolute bottom-3 left-3 bg-red-50 text-red-500 border border-red-200 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase flex items-center gap-1 z-10 shadow-sm">
              <AlertTriangle size={10} /> Low Stock
            </div>
          )}

          {/* Regular Stock Indicator Tag */}
          {!isLowStock && (
            <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-md text-zinc-600 border border-zinc-200 px-2.5 py-1 rounded-full text-[10px] font-semibold tracking-wider uppercase z-10 shadow-sm">
              {product.stockQuantity} in stock
            </div>
          )}

          {/* Brand Overlay */}
          <div className="absolute bottom-3 right-3 bg-[#111111] text-white px-2.5 py-1 rounded-full text-[10px] font-extrabold tracking-widest uppercase z-10 shadow-sm">
            {product.brand}
          </div>
        </div>

        {/* Info Area */}
        <div className="p-5 flex flex-col space-y-3" style={{ transform: 'translateZ(30px)' }}>
          <div>
            <span className="text-[9px] uppercase tracking-[0.2em] text-luxury-gold block font-bold mb-0.5">
              {categoryName || 'Uncategorized'}
            </span>
            <h3 className="text-[#111111] font-bold text-base truncate pr-16" title={product.name}>
              {product.name}
            </h3>
            <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block mt-0.5">
              SKU: {product.sku}
            </span>
          </div>

          <p className="text-zinc-500 text-xs line-clamp-2 min-h-8">
            {product.description || 'No description provided.'}
          </p>

          {/* Specs & Pricing */}
          <div className="pt-3 border-t border-zinc-100 flex items-center justify-between">
            <div className="flex gap-2 text-[10px] text-zinc-500 font-medium">
              {product.size && (
                <span className="px-2 py-0.5 rounded bg-zinc-100 border border-zinc-200/50 uppercase">
                  {product.size}
                </span>
              )}
              {product.color && (
                <span className="px-2 py-0.5 rounded bg-zinc-100 border border-zinc-200/50 uppercase">
                  {product.color}
                </span>
              )}
            </div>
            
            <div className="text-right">
              {product.mrp > product.sellingPrice && (
                <span className="text-[10px] text-zinc-400 line-through mr-2 font-mono">
                  Rs. {product.mrp.toLocaleString()}
                </span>
              )}
              <span className="text-sm font-extrabold text-[#111111] font-mono">
                Rs. {product.sellingPrice.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
