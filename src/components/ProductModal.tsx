import React, { useState, useEffect } from 'react';
import { 
  X, ArrowRight, ArrowLeft, Check, Sparkles, 
  Upload, FileSpreadsheet, Layers, Sliders, 
  AlertCircle, Printer, CheckCircle2, ShieldCheck 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Code128Barcode } from './Code128Barcode';
import { PrintPortal } from './PrintPortal';
import { getSavedCalibration, saveCalibration, getPresetCalibration } from '../utils/calibration';
import type { LabelCalibration } from '../utils/calibration';
import { deriveBarcodeId } from '../firebase/db';

interface Category {
  id: string;
  name: string;
}

interface Product {
  id: string;
  name: string;
  sku: string;
  brand: string;
  categoryId: string;
  subCategory?: string;
  gender?: string;
  size?: string;
  color?: string;
  mrp: number;
  sellingPrice: number;
  stockQuantity: number;
  description?: string;
  imageUrl?: string;
  warehouse?: string;
  rackNumber?: string;
  storeLocation?: string;
  lowStockThreshold?: number;
  createdAt?: string;
}

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  product?: Product | null;
  categories: Category[];
  onSubmit: (data: any) => Promise<void>;
}

// Fixed Fashion retail hierarchy
const FASHION_HIERARCHY: { [key: string]: string[] } = {
  "Men's Wear": ["Shirts", "Half Shirts", "T-Shirts", "Polo T-Shirts", "Jeans", "Trousers", "Cargo Pants", "Shorts", "Jackets", "Hoodies"],
  "Women's Wear": ["Tops", "Jeans", "Dresses", "Kurtis", "Leggings"],
  "Kids Wear": ["Boys", "Girls"],
  "Footwear": ["Casual Shoes", "Sports Shoes", "Branded Shoes", "Formal Shoes", "Sneakers", "Sandals"],
  "Accessories": ["Belts", "Caps", "Wallets", "Sunglasses", "Watches"]
};

// SKU Mapping codes
const SUB_CATEGORY_CODES: { [key: string]: string } = {
  "Shirts": "SHT", "Half Shirts": "HSH", "T-Shirts": "TSH", "Polo T-Shirts": "PTS", 
  "Jeans": "JNS", "Trousers": "TRS", "Cargo Pants": "CRG", "Shorts": "SRT", 
  "Jackets": "JKT", "Hoodies": "HUD", "Tops": "TOP", "Dresses": "DRS", 
  "Kurtis": "KRT", "Leggings": "LGG", "Boys": "BYS", "Girls": "GRL",
  "Casual Shoes": "CSS", "Sports Shoes": "SPS", "Branded Shoes": "BRS", 
  "Formal Shoes": "FMS", "Sneakers": "SNK", "Sandals": "SDL",
  "Belts": "BLT", "Caps": "CAP", "Wallets": "WLT", "Sunglasses": "SGS", "Watches": "WTC"
};

const COLOR_CODES: { [key: string]: string } = {
  "BLACK": "BLK", "BLUE": "BLU", "WHITE": "WHT", "GREY": "GRY", "NAVY": "NVY", "BROWN": "BRN"
};

const PRESET_SIZES_CLOTHING = ["XS", "S", "M", "L", "XL", "XXL"];
const PRESET_SIZES_FOOTWEAR = ["6", "7", "8", "9", "10", "11"];
const PRESET_COLORS = ["Black", "Blue", "White", "Grey", "Navy", "Brown"];

const INITIAL_FORM = {
  name: '',
  brand: '',
  categoryName: "Men's Wear", // Display label matching database seeding
  subCategory: 'Shirts',
  gender: 'Men',
  description: '',
  imageUrl: '',
  mrp: '',
  discountPercent: '',
  sellingPrice: '',
  stockQuantity: '10',
  lowStockThreshold: '5',
  warehouse: 'Main Store',
  rackNumber: '',
  storeLocation: ''
};

const getDefaultImageUrl = (category: string, subCategory: string): string => {
  const sub = (subCategory || '').toLowerCase();
  const cat = (category || '').toLowerCase();

  if (sub.includes('shirt')) {
    return '/polo_tshirt.png';
  }
  if (sub.includes('jean') || sub.includes('denim')) {
    return '/jeans.png';
  }
  if (sub.includes('trouser') || sub.includes('pant') || sub.includes('cargo') || sub.includes('short')) {
    return '/jeans.png';
  }
  if (sub.includes('jacket') || sub.includes('hoodie')) {
    return '/polo_tshirt.png';
  }
  if (sub.includes('cap') || sub.includes('hat')) {
    return '/polo_cap.png';
  }
  if (sub.includes('watch')) {
    return '/watch.png';
  }
  if (sub.includes('belt') || sub.includes('wallet')) {
    return '/wallet.png';
  }
  if (sub.includes('sunglasses') || sub.includes('glass')) {
    return '/luxury_placeholder.png';
  }
  if (cat.includes('footwear') || sub.includes('shoe') || sub.includes('sneaker') || sub.includes('sandal')) {
    return '/shoes.png';
  }
  if (cat.includes('women') || sub.includes('top') || sub.includes('dress') || sub.includes('kurti')) {
    return '/womens_dress.png';
  }
  return '/luxury_placeholder.png';
};

export const ProductModal: React.FC<ProductModalProps> = ({
  isOpen,
  onClose,
  product,
  categories,
  onSubmit,
}) => {
  const [activeTab, setActiveTab] = useState<'single' | 'bulk'>('single');
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Variant selections
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [customSize, setCustomSize] = useState('');
  const [customColor, setCustomColor] = useState('');
  const [generatedVariants, setGeneratedVariants] = useState<any[]>([]);

  // CSV Import states
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [parsedCsvProducts, setParsedCsvProducts] = useState<any[]>([]);
  const [csvError, setCsvError] = useState('');

  // Live labels preview states
  const [labelTemplate, setLabelTemplate] = useState<'t1' | 't2' | 't3' | 't4' | 't5'>('t1');
  const [labelPreset, setLabelPreset] = useState<'25x15' | '38x25' | '50x25' | 'custom'>(() => {
    const saved = getSavedCalibration();
    const matched = saved.labelWidth === 25 && saved.labelHeight === 15 && saved.columns === 1
      ? '25x15'
      : saved.labelWidth === 38 && saved.labelHeight === 25 && saved.columns === 2
      ? '38x25'
      : saved.labelWidth === 50 && saved.labelHeight === 25 && saved.columns === 2
      ? '50x25'
      : 'custom';
    return matched;
  });
  const [calibration, setCalibration] = useState<LabelCalibration>(getSavedCalibration());
  const [printQtys, setPrintQtys] = useState<{ [sku: string]: number }>({});
  const [isPrinting, setIsPrinting] = useState(false);

  // Auto-calculate selling price or discount percent
  const handlePriceSync = (field: 'mrp' | 'discount' | 'selling', val: string) => {
    const mrpNum = field === 'mrp' ? Number(val) : Number(formData.mrp);
    const discNum = field === 'discount' ? Number(val) : Number(formData.discountPercent);
    const sellNum = field === 'selling' ? Number(val) : Number(formData.sellingPrice);

    if (field === 'mrp') {
      if (discNum > 0) {
        const finalSell = mrpNum - (mrpNum * (discNum / 100));
        setFormData(prev => ({ 
          ...prev, 
          mrp: val, 
          sellingPrice: Math.round(finalSell).toString() 
        }));
      } else if (sellNum > 0) {
        const discPercent = ((mrpNum - sellNum) / mrpNum) * 100;
        setFormData(prev => ({ 
          ...prev, 
          mrp: val, 
          discountPercent: Math.max(0, Math.round(discPercent)).toString() 
        }));
      } else {
        setFormData(prev => ({ ...prev, mrp: val }));
      }
    } else if (field === 'discount') {
      if (mrpNum > 0) {
        const finalSell = mrpNum - (mrpNum * (Number(val) / 100));
        setFormData(prev => ({ 
          ...prev, 
          discountPercent: val, 
          sellingPrice: Math.round(finalSell).toString() 
        }));
      } else {
        setFormData(prev => ({ ...prev, discountPercent: val }));
      }
    } else if (field === 'selling') {
      if (mrpNum > 0) {
        const discPercent = ((mrpNum - sellNum) / mrpNum) * 100;
        setFormData(prev => ({ 
          ...prev, 
          sellingPrice: val, 
          discountPercent: Math.max(0, Math.round(discPercent)).toString() 
        }));
      } else {
        setFormData(prev => ({ ...prev, sellingPrice: val }));
      }
    }
  };

  // Synchronise edit product data
  useEffect(() => {
    if (product) {
      // Find category name
      const catObj = categories.find(c => c.id === product.categoryId);
      const catName = catObj ? catObj.name : "Men's Wear";

      const discountPercent = product.mrp > product.sellingPrice 
        ? Math.round(((product.mrp - product.sellingPrice) / product.mrp) * 100) 
        : 0;

      setFormData({
        name: product.name,
        brand: product.brand,
        categoryName: catName,
        subCategory: product.subCategory || 'Shirts',
        gender: product.gender || 'Men',
        description: product.description || '',
        imageUrl: product.imageUrl || '',
        mrp: product.mrp.toString(),
        discountPercent: discountPercent.toString(),
        sellingPrice: product.sellingPrice.toString(),
        stockQuantity: product.stockQuantity.toString(),
        lowStockThreshold: (product.lowStockThreshold || 5).toString(),
        warehouse: product.warehouse || 'Main Store',
        rackNumber: product.rackNumber || '',
        storeLocation: product.storeLocation || ''
      });
      setStep(1);
    } else {
      setFormData(INITIAL_FORM);
      setSelectedSizes([]);
      setSelectedColors([]);
      setGeneratedVariants([]);
      setPrintQtys({});
      setCsvFile(null);
      setParsedCsvProducts([]);
      setCsvError('');
      setStep(1);
    }
    setErrors({});
  }, [product, isOpen, categories]);

  // Handle category change -> reset subcategory to first child
  const handleCategoryChange = (catName: string) => {
    const subs = FASHION_HIERARCHY[catName] || [];
    setFormData(prev => ({
      ...prev,
      categoryName: catName,
      subCategory: subs[0] || ''
    }));
  };

  // Dynamic combinations generator
  useEffect(() => {
    const brandCode = 'ATL';
    const subCode = SUB_CATEGORY_CODES[formData.subCategory] || 'GEN';
    
    // Default to a list with an empty string if empty
    const sizesToUse = selectedSizes.length > 0 ? selectedSizes : [""];
    const colorsToUse = selectedColors.length > 0 ? selectedColors : [""];
    
    const newVariants = sizesToUse.flatMap(sz => {
      return colorsToUse.map(col => {
        const colCode = col ? (COLOR_CODES[col.toUpperCase()] || col.slice(0, 3).toUpperCase()) : 'GEN';
        const szClean = sz ? sz.replace(/[^a-zA-Z0-9]/g, '').toUpperCase() : 'ALL';
        const seq = Math.floor(Math.random() * 900 + 100);
        const computedSku = `${brandCode}-${subCode}-${colCode}-${szClean}-${seq}`;
        
        const barcodeId = String(Math.floor(100000 + Math.random() * 900000));
        return {
          sku: computedSku,
          barcode: computedSku,
          barcodeId,
          size: sz,
          color: col,
          stockQuantity: Number(formData.stockQuantity) || 10,
          mrp: Number(formData.mrp) || 0,
          sellingPrice: Number(formData.sellingPrice) || 0
        };
      });
    });
    setGeneratedVariants(newVariants);
    
    // Default print quantities
    const initialQtys: { [sku: string]: number } = {};
    newVariants.forEach(v => {
      initialQtys[v.sku] = 1;
    });
    setPrintQtys(initialQtys);
  }, [selectedSizes, selectedColors, formData.subCategory, formData.mrp, formData.sellingPrice, formData.stockQuantity]);

  // Bulk Apply pricing/stock updates to variants list
  const applyBulkToVariants = () => {
    setGeneratedVariants(prev => prev.map(v => ({
      ...v,
      stockQuantity: Number(formData.stockQuantity) || 0,
      mrp: Number(formData.mrp) || 0,
      sellingPrice: Number(formData.sellingPrice) || 0
    })));
  };

  const handleVariantChange = (sku: string, field: string, val: string) => {
    setGeneratedVariants(prev => prev.map(v => {
      if (v.sku === sku) {
        return { ...v, [field]: Number(val) || 0 };
      }
      return v;
    }));
  };

  const handleAddCustomSize = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const clean = customSize.trim().toUpperCase();
      if (clean && !selectedSizes.includes(clean)) {
        setSelectedSizes(prev => [...prev, clean]);
      }
      setCustomSize('');
    }
  };

  const handleAddCustomColor = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const clean = customColor.trim();
      if (clean && !selectedColors.includes(clean)) {
        setSelectedColors(prev => [...prev, clean]);
      }
      setCustomColor('');
    }
  };

  // CSV Drag/Drop Parser
  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFile(file);
    setCsvError('');

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      if (!text) return;

      try {
        const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
        if (lines.length <= 1) {
          setCsvError('CSV file has no data rows.');
          return;
        }

        const rawHeaders = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
        const productsList: any[] = [];

        // Dynamic categories in DB
        const catMap = new Map<string, string>();
        categories.forEach(c => {
          catMap.set(c.name.toLowerCase(), c.id);
        });

        // Helper to match headers case insensitively
        const getColIdx = (names: string[]) => {
          return rawHeaders.findIndex(h => names.some(n => h.toLowerCase() === n.toLowerCase()));
        };

        const brandIdx = getColIdx(['brand']);
        const nameIdx = getColIdx(['product', 'product name', 'name']);
        const subCatIdx = getColIdx(['category', 'subcategory', 'sub category']);
        const sizeIdx = getColIdx(['size']);
        const colorIdx = getColIdx(['color']);
        const mrpIdx = getColIdx(['mrp', 'retail price']);
        const discountIdx = getColIdx(['discount', 'discount %', 'off']);
        const stockIdx = getColIdx(['stock', 'quantity', 'qty', 'stockquantity']);

        if (brandIdx === -1 || nameIdx === -1 || subCatIdx === -1 || sizeIdx === -1 || colorIdx === -1 || mrpIdx === -1) {
          setCsvError('Missing required CSV column headers (Brand, Product Name, Category, Size, Color, MRP).');
          return;
        }

        for (let i = 1; i < lines.length; i++) {
          const row = [];
          let insideQuote = false;
          let entry = '';
          const line = lines[i];
          for (let charIdx = 0; charIdx < line.length; charIdx++) {
            const char = line[charIdx];
            if (char === '"' || char === "'") {
              insideQuote = !insideQuote;
            } else if (char === ',' && !insideQuote) {
              row.push(entry.trim().replace(/^["']|["']$/g, ''));
              entry = '';
            } else {
              entry += char;
            }
          }
          row.push(entry.trim().replace(/^["']|["']$/g, ''));

          if (row.length >= rawHeaders.length) {
            const brand = row[brandIdx];
            const name = row[nameIdx];
            const subCatRaw = row[subCatIdx];
            const size = row[sizeIdx];
            const color = row[colorIdx];
            const mrp = Number(row[mrpIdx]) || 0;
            const discount = discountIdx !== -1 ? (Number(row[discountIdx]) || 0) : 0;
            const stock = stockIdx !== -1 ? (Number(row[stockIdx]) || 0) : 10;

            const sellingPrice = Math.round(mrp - (mrp * (discount / 100)));

            // Infer main category ID
            const subCatClean = Object.keys(SUB_CATEGORY_CODES).find(k => k.toLowerCase() === subCatRaw.toLowerCase()) || "Jeans";
            let matchedCatId = 'cat-mens-wear';
            
            // Find which main category contains this subcategory
            for (const [parentCat, childrenSubs] of Object.entries(FASHION_HIERARCHY)) {
              if (childrenSubs.includes(subCatClean)) {
                const dbCat = categories.find(c => c.name.toLowerCase() === parentCat.toLowerCase());
                if (dbCat) matchedCatId = dbCat.id;
                break;
              }
            }

            const subCode = SUB_CATEGORY_CODES[subCatClean] || 'GEN';
            const colCode = COLOR_CODES[color.toUpperCase()] || color.slice(0, 3).toUpperCase();
            const seq = Math.floor(Math.random() * 900 + 100);
            const sku = `ATL-${subCode}-${colCode}-${size.toUpperCase()}-${seq}`;

            const barcodeId = String(Math.floor(100000 + Math.random() * 900000));
            productsList.push({
              name,
              brand,
              categoryId: matchedCatId,
              subCategory: subCatClean,
              gender: matchedCatCleanForGender(subCatClean),
              size: size.toUpperCase(),
              color,
              mrp,
              sellingPrice,
              stockQuantity: stock,
              sku,
              barcode: sku,
              barcodeId,
              warehouse: 'Main Store',
              lowStockThreshold: 5,
              description: `${brand} ${name} Clothing Variant`
            });
          }
        }

        setParsedCsvProducts(productsList);

        // Populate print quantities
        const initialQtys: { [sku: string]: number } = {};
        productsList.forEach(v => {
          initialQtys[v.sku] = 1;
        });
        setPrintQtys(initialQtys);

      } catch (err: any) {
        setCsvError('Failed parsing CSV data. Please check layout.');
      }
    };
    reader.readAsText(file);
  };

  const matchedCatCleanForGender = (sub: string) => {
    // Basic gender heuristics
    for (const [parent, children] of Object.entries(FASHION_HIERARCHY)) {
      if (children.includes(sub)) {
        if (parent.includes("Men's")) return "Men";
        if (parent.includes("Women's")) return "Women";
        if (parent.includes("Kids")) return "Kids";
      }
    }
    return "Unisex";
  };

  const validateStep = (currentStep: number) => {
    const newErrors: { [key: string]: string } = {};

    if (currentStep === 1) {
      if (!formData.name.trim()) newErrors.name = 'Product name is required';
      if (!formData.brand.trim()) newErrors.brand = 'Brand is required';
      if (!formData.subCategory) newErrors.subCategory = 'Subcategory is required';
    }

    if (currentStep === 2) {
      // Allow empty size and color defaults to single base product
    }

    if (currentStep === 3) {
      if (!formData.mrp.trim() || isNaN(Number(formData.mrp)) || Number(formData.mrp) <= 0) {
        newErrors.mrp = 'MRP must be a positive number';
      }
      if (!formData.sellingPrice.trim() || isNaN(Number(formData.sellingPrice)) || Number(formData.sellingPrice) <= 0) {
        newErrors.sellingPrice = 'Selling price must be a positive number';
      } else if (Number(formData.sellingPrice) > Number(formData.mrp)) {
        newErrors.sellingPrice = 'Selling price cannot exceed MRP';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(step)) {
      if (step === 2) {
        // Bulk apply initial pricing setup to variants
        applyBulkToVariants();
      }
      setStep(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    setStep(prev => prev - 1);
  };

  // Submit Logic
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (product) {
      // Direct Single Product Edit Mode
      if (!formData.name.trim() || !formData.brand.trim() || !formData.mrp || !formData.sellingPrice) {
        setErrors({ form: 'Required fields missing' });
        return;
      }
      setIsSubmitting(true);
      try {
        const catObj = categories.find(c => c.name === formData.categoryName);
        await onSubmit({
          name: formData.name,
          brand: formData.brand,
          categoryId: catObj ? catObj.id : categories[0].id,
          subCategory: formData.subCategory,
          gender: formData.gender,
          mrp: Number(formData.mrp),
          sellingPrice: Number(formData.sellingPrice),
          stockQuantity: Number(formData.stockQuantity),
          lowStockThreshold: Number(formData.lowStockThreshold) || 5,
          warehouse: formData.warehouse,
          rackNumber: formData.rackNumber,
          storeLocation: formData.storeLocation,
          description: formData.description,
          imageUrl: formData.imageUrl || getDefaultImageUrl(formData.categoryName, formData.subCategory)
        });
        onClose();
      } catch (err: any) {
        setErrors({ api: err.message || 'Update error' });
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    // Wizard Creation Mode
    if (activeTab === 'single') {
      if (!validateStep(3)) return;
      setIsSubmitting(true);
      try {
        const catObj = categories.find(c => c.name === formData.categoryName);
        const catId = catObj ? catObj.id : categories[0].id;

        // Construct array of all variant items
        const intakeList = generatedVariants.map(v => {
          const variantSuffix = [v.size, v.color].filter(Boolean).join('/');
          const fullName = variantSuffix ? `${formData.name} - ${variantSuffix}` : formData.name;
          return {
            name: fullName,
            brand: formData.brand,
            categoryId: catId,
            subCategory: formData.subCategory,
            gender: formData.gender,
            size: v.size || 'One Size',
            color: v.color || 'Standard',
            mrp: Number(v.mrp),
            sellingPrice: Number(v.sellingPrice),
            stockQuantity: Number(v.stockQuantity),
            sku: v.sku,
            barcode: v.sku,
            warehouse: formData.warehouse,
            rackNumber: formData.rackNumber,
            storeLocation: formData.storeLocation,
            lowStockThreshold: Number(formData.lowStockThreshold) || 5,
            description: formData.description || `${formData.brand} ${formData.name} Variant`,
            imageUrl: formData.imageUrl || getDefaultImageUrl(formData.categoryName, formData.subCategory)
          };
        });

        await onSubmit(intakeList);
        onClose();
      } catch (err: any) {
        setErrors({ api: err.message || 'Batch intake failed' });
      } finally {
        setIsSubmitting(false);
      }
    } else {
      // Bulk CSV Intake Mode
      if (parsedCsvProducts.length === 0) return;
      setIsSubmitting(true);
      try {
        await onSubmit(parsedCsvProducts);
        onClose();
      } catch (err: any) {
        setErrors({ api: err.message || 'CSV intake failed' });
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  // Label printing routine
  const triggerLabelPrint = () => {
    setIsPrinting(true);
    setTimeout(() => {
      window.print();
      setIsPrinting(false);
    }, 500);
  };

  // Sticker arrays calculation for sheet printing
  const printStickers: any[] = [];
  const activeProductsSource = activeTab === 'single' ? generatedVariants : parsedCsvProducts;

  activeProductsSource.forEach(v => {
    const qty = printQtys[v.sku] || 0;
    for (let i = 0; i < qty; i++) {
      printStickers.push({
        ...v,
        brand: v.brand || formData.brand,
        name: v.name || formData.name
      });
    }
  });

  // Load saved calibration settings (using state)

  // Chunk flat stickers list into pages based on dynamic grid calibration
  const stickersPerPage = calibration.columns * calibration.rowsPerSheet;
  const printPages: any[][] = [];
  for (let i = 0; i < printStickers.length; i += stickersPerPage) {
    const chunk = printStickers.slice(i, i + stickersPerPage);
    // Pad the last page to keep column structure in CSS grid
    while (chunk.length < stickersPerPage) {
      chunk.push(null); // represent blank space
    }
    printPages.push(chunk);
  }

  const subCategoriesList = FASHION_HIERARCHY[formData.categoryName] || [];

  const previewProd = activeProductsSource[0] || {
    brand: formData.brand || "Brand",
    name: formData.name || "Product Name",
    size: selectedSizes[0] || "32",
    color: selectedColors[0] || "Blue",
    mrp: Number(formData.mrp) || 4999,
    sellingPrice: Number(formData.sellingPrice) || 2499,
    sku: "ATL-JNS-BLU-32-001"
  };



  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Blur Overlay */}
      <div className="fixed inset-0 bg-[#111111]/30 backdrop-blur-md" onClick={onClose} />

      {/* Modal Glass Box */}
      <div className="relative w-full max-w-4xl bg-white/95 border border-zinc-200/80 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh] z-10 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-8 py-5 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/50 sticky top-0 z-20">
          <div>
            <span className="text-[9px] uppercase tracking-widest text-[#c9a227] font-extrabold flex items-center gap-1">
              <Sparkles size={10} className="text-[#c9a227]" /> Fashion Retail Catalog Suite
            </span>
            <h2 className="text-lg font-black text-black mt-0.5 tracking-wide uppercase">
              {product ? `Edit Product Ledger SKU` : 'Clothing Stock Intake Wizard'}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 bg-white hover:bg-zinc-100 rounded-full border border-zinc-200/60 text-zinc-400 hover:text-black transition-all cursor-pointer">
            <X size={16} />
          </button>
        </div>

        {/* Tab Selection (Hide when editing) */}
        {!product && (
          <div className="flex border-b border-zinc-100 bg-white">
            <button
              onClick={() => { setActiveTab('single'); setStep(1); }}
              className={`flex-1 py-3 text-xs font-black uppercase tracking-wider transition-all border-b-2 flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === 'single' 
                  ? 'border-[#c9a227] text-black bg-[#c9a227]/5' 
                  : 'border-transparent text-zinc-400 hover:text-zinc-700'
              }`}
            >
              <Layers size={13} /> Single Product Intake
            </button>
            <button
              onClick={() => { setActiveTab('bulk'); }}
              className={`flex-1 py-3 text-xs font-black uppercase tracking-wider transition-all border-b-2 flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === 'bulk' 
                  ? 'border-[#c9a227] text-black bg-[#c9a227]/5' 
                  : 'border-transparent text-zinc-400 hover:text-zinc-700'
              }`}
            >
              <FileSpreadsheet size={13} /> Bulk Excel/CSV Import
            </button>
          </div>
        )}

        {/* Form Body Scroll area */}
        <div className="flex-1 overflow-y-auto p-8 space-y-6">
          {errors.api && (
            <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-xs rounded-2xl flex items-center gap-2 font-bold shadow-sm">
              <AlertCircle size={14} />
              <span>{errors.api}</span>
            </div>
          )}

          {/* EDIT SINGLE PRODUCT MODE */}
          {product ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column: Specs */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="text-[9px] uppercase tracking-wider text-zinc-500 font-black block mb-1">Product Title *</label>
                    <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2.5 text-xs font-medium text-black focus:outline-none focus:border-[#c9a227]" />
                  </div>
                  <div>
                    <label className="text-[9px] uppercase tracking-wider text-zinc-500 font-black block mb-1">Brand *</label>
                    <input type="text" value={formData.brand} onChange={e => setFormData({...formData, brand: e.target.value})} className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2.5 text-xs font-medium text-black focus:outline-none" />
                  </div>
                  <div>
                    <label className="text-[9px] uppercase tracking-wider text-zinc-500 font-black block mb-1">Gender *</label>
                    <select value={formData.gender} onChange={e => setFormData({...formData, gender: e.target.value})} className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs font-medium cursor-pointer">
                      <option value="Men">Men</option>
                      <option value="Women">Women</option>
                      <option value="Kids">Kids</option>
                      <option value="Unisex">Unisex</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[9px] uppercase tracking-wider text-zinc-500 font-black block mb-1">Main Category *</label>
                    <select value={formData.categoryName} onChange={e => handleCategoryChange(e.target.value)} className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs font-medium cursor-pointer">
                      {Object.keys(FASHION_HIERARCHY).map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[9px] uppercase tracking-wider text-zinc-500 font-black block mb-1">Subcategory *</label>
                    <select value={formData.subCategory} onChange={e => setFormData({...formData, subCategory: e.target.value})} className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs font-medium cursor-pointer">
                      {subCategoriesList.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[9px] uppercase tracking-wider text-zinc-500 font-black block mb-1">Product Description</label>
                  <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} rows={3} className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2.5 text-xs text-black focus:outline-none resize-none" />
                </div>
              </div>

              {/* Right Column: Pricing & Logistics */}
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-[9px] uppercase tracking-wider text-zinc-500 font-black block mb-1">MRP (₹) *</label>
                    <input type="text" value={formData.mrp} onChange={e => handlePriceSync('mrp', e.target.value)} className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2.5 text-xs font-mono font-black" />
                  </div>
                  <div>
                    <label className="text-[9px] uppercase tracking-wider text-zinc-500 font-black block mb-1">Disc. %</label>
                    <input type="text" value={formData.discountPercent} onChange={e => handlePriceSync('discount', e.target.value)} className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2.5 text-xs font-mono font-black" />
                  </div>
                  <div>
                    <label className="text-[9px] uppercase tracking-wider text-zinc-500 font-black block mb-1">Sale Price (₹) *</label>
                    <input type="text" value={formData.sellingPrice} onChange={e => handlePriceSync('selling', e.target.value)} className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2.5 text-xs font-mono font-black text-[#c9a227]" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[9px] uppercase tracking-wider text-zinc-500 font-black block mb-1">Current Stock *</label>
                    <input type="number" value={formData.stockQuantity} onChange={e => setFormData({...formData, stockQuantity: e.target.value})} className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2.5 text-xs font-mono font-bold" />
                  </div>
                  <div>
                    <label className="text-[9px] uppercase tracking-wider text-zinc-500 font-black block mb-1">Low stock threshold</label>
                    <input type="number" value={formData.lowStockThreshold} onChange={e => setFormData({...formData, lowStockThreshold: e.target.value})} className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2.5 text-xs font-mono font-bold" />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-3">
                    <label className="text-[9px] uppercase tracking-wider text-zinc-500 font-black block mb-1">Store Location & Logistics</label>
                  </div>
                  <div>
                    <input type="text" placeholder="Warehouse Name" value={formData.warehouse} onChange={e => setFormData({...formData, warehouse: e.target.value})} className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs font-medium" />
                  </div>
                  <div>
                    <input type="text" placeholder="Rack Number" value={formData.rackNumber} onChange={e => setFormData({...formData, rackNumber: e.target.value})} className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs font-medium" />
                  </div>
                  <div>
                    <input type="text" placeholder="Shelf Location" value={formData.storeLocation} onChange={e => setFormData({...formData, storeLocation: e.target.value})} className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs font-medium" />
                  </div>
                </div>

                <div>
                  <label className="text-[9px] uppercase tracking-wider text-zinc-500 font-black block mb-1">Image URL</label>
                  <input type="text" value={formData.imageUrl} onChange={e => setFormData({...formData, imageUrl: e.target.value})} className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2.5 text-xs font-medium" />
                </div>
              </div>
            </div>
          ) : activeTab === 'single' ? (
            /* WIZARD MODE: SINGLE INTAKE */
            <>
              {/* Step Progress Indicator */}
              <div className="flex justify-between items-center bg-zinc-50 border border-zinc-100 rounded-2xl p-4 mb-4">
                {[
                  { s: 1, name: "Details" },
                  { s: 2, name: "Variants" },
                  { s: 3, name: "Commercials" },
                  { s: 4, name: "Labels & Preview" }
                ].map((item) => (
                  <div key={item.s} className="flex items-center space-x-2">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black font-mono transition-all border ${
                      step === item.s 
                        ? 'bg-[#c9a227] text-white border-transparent shadow-gold-glow' 
                        : step > item.s 
                        ? 'bg-emerald-500 text-white border-transparent' 
                        : 'bg-white border-zinc-200 text-zinc-400'
                    }`}>
                      {step > item.s ? "✓" : item.s}
                    </span>
                    <span className={`text-[10px] font-black uppercase tracking-wider ${step === item.s ? 'text-black' : 'text-zinc-400'}`}>{item.name}</span>
                    {item.s < 4 && <span className="text-zinc-300 text-xs">➔</span>}
                  </div>
                ))}
              </div>

              <AnimatePresence mode="wait">
                {/* STEP 1: BASIC DETAILS */}
                {step === 1 && (
                  <motion.div
                    key="step-1"
                    initial={{ opacity: 0, x: 15 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -15 }}
                    className="grid grid-cols-1 md:grid-cols-2 gap-6"
                  >
                    <div className="space-y-4">
                      <div>
                        <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-black block mb-1">Product Title *</label>
                        <input
                          type="text"
                          value={formData.name}
                          onChange={e => setFormData({...formData, name: e.target.value})}
                          placeholder="e.g. Slim Fit Denim Jeans"
                          className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-xs font-semibold text-black focus:outline-none focus:border-[#c9a227] focus:bg-white transition-all shadow-sm"
                        />
                        {errors.name && <span className="text-[9px] font-bold text-red-500 block mt-1">{errors.name}</span>}
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-black block mb-1">Brand *</label>
                          <input
                            type="text"
                            value={formData.brand}
                            onChange={e => setFormData({...formData, brand: e.target.value})}
                            placeholder="e.g. Levi's"
                            className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-xs font-semibold text-black focus:outline-none focus:border-[#c9a227] focus:bg-white transition-all shadow-sm"
                          />
                          {errors.brand && <span className="text-[9px] font-bold text-red-500 block mt-1">{errors.brand}</span>}
                        </div>
                        <div>
                          <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-black block mb-1">Gender *</label>
                          <select
                            value={formData.gender}
                            onChange={e => setFormData({...formData, gender: e.target.value})}
                            className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-3 text-xs font-semibold text-black cursor-pointer shadow-sm"
                          >
                            <option value="Men">Men's Wear</option>
                            <option value="Women">Women's Wear</option>
                            <option value="Kids">Kids Wear</option>
                            <option value="Unisex">Unisex</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-black block mb-1">Category Collection *</label>
                          <select
                            value={formData.categoryName}
                            onChange={e => handleCategoryChange(e.target.value)}
                            className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-3 text-xs font-semibold text-black cursor-pointer shadow-sm"
                          >
                            {Object.keys(FASHION_HIERARCHY).map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-black block mb-1">Sub Category *</label>
                          <select
                            value={formData.subCategory}
                            onChange={e => setFormData({...formData, subCategory: e.target.value})}
                            className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-3 text-xs font-semibold text-black cursor-pointer shadow-sm"
                          >
                            {subCategoriesList.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                          {errors.subCategory && <span className="text-[9px] font-bold text-red-500 block mt-1">{errors.subCategory}</span>}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-black block mb-1">Product Description</label>
                        <textarea
                          value={formData.description}
                          onChange={e => setFormData({...formData, description: e.target.value})}
                          placeholder="Premium quality denim with vintage washing..."
                          rows={4}
                          className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-xs text-black focus:outline-none focus:border-[#c9a227] focus:bg-white transition-all resize-none shadow-sm"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-black block mb-1">Image URL</label>
                        <input
                          type="text"
                          value={formData.imageUrl}
                          onChange={e => setFormData({...formData, imageUrl: e.target.value})}
                          placeholder="https://example.com/image.jpg"
                          className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-xs text-black focus:outline-none focus:border-[#c9a227] focus:bg-white transition-all shadow-sm"
                        />
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* STEP 2: VARIANTS combinator */}
                {step === 2 && (
                  <motion.div
                    key="step-2"
                    initial={{ opacity: 0, x: 15 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -15 }}
                    className="space-y-6"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      
                      {/* Left: inputs */}
                      <div className="space-y-4 bg-zinc-50 border border-zinc-200/60 p-5 rounded-2xl">
                        <h4 className="text-xs font-black uppercase text-black tracking-wider flex items-center gap-1.5 pb-2 border-b border-zinc-200/80">
                          <Sliders size={13} className="text-[#c9a227]" /> Select Apparel Attribute Presets
                        </h4>

                        {/* Size preset chips */}
                        <div>
                          <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-black block mb-2">Select Sizes *</label>
                          <div className="flex flex-wrap gap-2 mb-2">
                            {(formData.categoryName === 'Footwear' ? PRESET_SIZES_FOOTWEAR : PRESET_SIZES_CLOTHING).map(sz => {
                              const selected = selectedSizes.includes(sz);
                              return (
                                <button
                                  type="button"
                                  key={sz}
                                  onClick={() => setSelectedSizes(prev => selected ? prev.filter(x => x !== sz) : [...prev, sz])}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold border transition-all cursor-pointer ${
                                    selected 
                                      ? 'bg-black text-[#c9a227] border-transparent shadow-sm' 
                                      : 'bg-white border-zinc-200 text-zinc-500 hover:border-zinc-300'
                                  }`}
                                >
                                  {sz}
                                </button>
                              );
                            })}
                          </div>
                          
                          {/* Custom size input */}
                          <div className="relative">
                            <input
                              type="text"
                              placeholder="Type custom size and press enter..."
                              value={customSize}
                              onChange={e => setCustomSize(e.target.value)}
                              onKeyDown={handleAddCustomSize}
                              className="w-full bg-white border border-zinc-200 rounded-xl px-4 py-2 text-xs font-semibold text-black focus:outline-none"
                            />
                          </div>
                        </div>

                        {/* Color preset chips */}
                        <div>
                          <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-black block mb-2">Select Colors *</label>
                          <div className="flex flex-wrap gap-2 mb-2">
                            {PRESET_COLORS.map(col => {
                              const selected = selectedColors.includes(col);
                              return (
                                <button
                                  type="button"
                                  key={col}
                                  onClick={() => setSelectedColors(prev => selected ? prev.filter(x => x !== col) : [...prev, col])}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                                    selected 
                                      ? 'bg-black text-white border-transparent shadow-sm' 
                                      : 'bg-white border-zinc-200 text-zinc-500 hover:border-zinc-300'
                                  }`}
                                >
                                  {col}
                                </button>
                              );
                            })}
                          </div>
                          
                          {/* Custom color input */}
                          <div className="relative">
                            <input
                              type="text"
                              placeholder="Type custom color and press enter..."
                              value={customColor}
                              onChange={e => setCustomColor(e.target.value)}
                              onKeyDown={handleAddCustomColor}
                              className="w-full bg-white border border-zinc-200 rounded-xl px-4 py-2 text-xs font-semibold text-black focus:outline-none"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Right: auto combinations list preview */}
                      <div className="space-y-3 bg-white border border-zinc-200 p-5 rounded-2xl">
                        <div className="flex justify-between items-center pb-2 border-b border-zinc-100">
                          <h4 className="text-xs font-black uppercase text-black tracking-wider flex items-center gap-1.5">
                            <Layers size={13} className="text-[#c9a227]" /> Combinations Preview
                          </h4>
                          <span className="text-[9px] bg-[#c9a227]/15 text-[#c9a227] px-2.5 py-0.5 rounded-full font-black font-mono">
                            {generatedVariants.length} SKU(s)
                          </span>
                        </div>

                        <div className="max-h-60 overflow-y-auto divide-y divide-zinc-100 pr-1 scrollbar-thin">
                          {generatedVariants.map((item) => (
                            <div key={item.sku} className="flex justify-between items-center py-2.5 first:pt-0 last:pb-0 text-xs">
                              <div>
                                <span className="font-extrabold text-black block">
                                  {item.size || item.color ? `${item.color || 'No Color'} — ${item.size || 'No Size'}` : 'Base Product (No Variants)'}
                                </span>
                                <span className="text-[9px] font-mono text-zinc-400 font-bold uppercase">{item.sku}</span>
                              </div>
                              <span className="text-[10px] bg-zinc-50 border border-zinc-200 text-zinc-500 font-mono px-2 py-0.5 rounded">
                                Ready
                              </span>
                            </div>
                          ))}
                          {generatedVariants.length === 0 && (
                            <div className="py-12 text-center text-zinc-400 font-bold uppercase tracking-wider text-[10px]">
                              Select sizes and colors on the left to generate combinations.
                            </div>
                          )}
                        </div>
                        {errors.variants && <span className="text-[9px] font-bold text-red-500 block">{errors.variants}</span>}
                      </div>

                    </div>
                  </motion.div>
                )}

                {/* STEP 3: COMMERCIALS & SMART DISCOUNT */}
                {step === 3 && (
                  <motion.div
                    key="step-3"
                    initial={{ opacity: 0, x: 15 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -15 }}
                    className="space-y-6"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      
                      {/* Pricing Form inputs */}
                      <div className="space-y-4 bg-zinc-50 border border-zinc-200/60 p-5 rounded-2xl flex flex-col justify-between">
                        <div>
                          <h4 className="text-xs font-black uppercase text-black tracking-wider flex items-center gap-1.5 pb-2 border-b border-zinc-200/80 mb-4">
                            <Sliders size={13} className="text-[#c9a227]" /> Smart Pricing Engine
                          </h4>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-black block mb-1">MRP (₹) *</label>
                              <input
                                type="text"
                                value={formData.mrp}
                                onChange={e => handlePriceSync('mrp', e.target.value)}
                                placeholder="5000"
                                className="w-full bg-white border border-zinc-200 rounded-xl px-4 py-3 text-xs font-mono font-black text-black"
                              />
                              {errors.mrp && <span className="text-[9px] font-bold text-red-500 block mt-1">{errors.mrp}</span>}
                            </div>

                            <div>
                              <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-black block mb-1">Discount %</label>
                              <input
                                type="text"
                                value={formData.discountPercent}
                                onChange={e => handlePriceSync('discount', e.target.value)}
                                placeholder="50"
                                className="w-full bg-white border border-zinc-200 rounded-xl px-4 py-3 text-xs font-mono font-black text-[#c9a227]"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4 mt-4">
                            <div>
                              <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-black block mb-1">Selling Price (₹) *</label>
                              <input
                                type="text"
                                value={formData.sellingPrice}
                                onChange={e => handlePriceSync('selling', e.target.value)}
                                placeholder="2500"
                                className="w-full bg-white border border-zinc-200 rounded-xl px-4 py-3 text-xs font-mono font-black text-black"
                              />
                              {errors.sellingPrice && <span className="text-[9px] font-bold text-red-500 block mt-1">{errors.sellingPrice}</span>}
                            </div>

                            <div className="flex items-end pb-1.5">
                              <button
                                type="button"
                                onClick={applyBulkToVariants}
                                className="w-full py-2.5 bg-black text-white hover:bg-zinc-800 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-sm cursor-pointer"
                              >
                                Sync to Variants
                              </button>
                            </div>
                          </div>
                        </div>

                        <div className="p-3 bg-white/70 border border-zinc-100 rounded-xl text-zinc-500 text-[9.5px] leading-relaxed mt-4">
                          💡 You can configure custom overrides for specific size or color combinations in the list on the right.
                        </div>
                      </div>

                      {/* Luxury pricing card & Variant overrides */}
                      <div className="space-y-4">
                        
                        {/* Luxury Retail Pricing Card */}
                        <div className="bg-[#111111] text-white p-6 rounded-3xl border border-zinc-800 shadow-xl relative overflow-hidden flex flex-col justify-between h-44">
                          <span className="absolute top-0 right-0 w-32 h-32 bg-[#c9a227]/10 rounded-full blur-2xl pointer-events-none" />
                          <span className="text-[9px] uppercase tracking-widest text-zinc-500 block font-bold">Apparel Retail Price Card</span>
                          
                          <div className="flex justify-between items-end border-b border-zinc-800/80 pb-3">
                            <div className="space-y-0.5">
                              <span className="text-[9px] uppercase tracking-wider text-zinc-400 block font-bold">MRP List Price</span>
                              <span className="text-zinc-500 line-through font-mono font-black text-base">₹{Number(formData.mrp || 0).toLocaleString()}</span>
                            </div>
                            <span className="text-[10px] bg-[#c9a227] text-black px-2.5 py-1 rounded-full font-black tracking-wider uppercase">
                              {Number(formData.discountPercent || 0)}% OFF
                            </span>
                          </div>

                          <div className="flex justify-between items-center pt-2">
                            <div className="space-y-0.5">
                              <span className="text-[9px] uppercase tracking-wider text-zinc-400 block font-bold">SALE PRICE NOW</span>
                              <span className="text-xl font-mono font-black text-[#c9a227]">₹{Number(formData.sellingPrice || 0).toLocaleString()}</span>
                            </div>
                            <div className="text-right">
                              <span className="text-[8px] text-zinc-500 block font-bold uppercase">Customer Savings</span>
                              <span className="text-xs text-emerald-400 font-bold font-mono">You Save ₹{Math.max(0, Number(formData.mrp || 0) - Number(formData.sellingPrice || 0)).toLocaleString()}</span>
                            </div>
                          </div>
                        </div>

                        {/* Variants matrix overrides */}
                        <div className="bg-white border border-zinc-200 p-5 rounded-2xl">
                          <span className="text-[10px] text-zinc-400 font-black uppercase tracking-wider block mb-2.5">Configure Custom Variant Pricing</span>
                          <div className="max-h-36 overflow-y-auto divide-y divide-zinc-100 pr-1 scrollbar-thin">
                            {generatedVariants.map(v => (
                              <div key={v.sku} className="grid grid-cols-4 gap-2 py-2 items-center text-xs">
                                <span className="font-extrabold text-black col-span-1 truncate">{v.color} - {v.size}</span>
                                <div>
                                  <input 
                                    type="number" 
                                    placeholder="MRP" 
                                    value={v.mrp || ''} 
                                    onChange={e => handleVariantChange(v.sku, 'mrp', e.target.value)} 
                                    className="w-full bg-zinc-50 border border-zinc-200 rounded-lg p-1 text-[10.5px] font-mono font-bold text-center" 
                                  />
                                </div>
                                <div>
                                  <input 
                                    type="number" 
                                    placeholder="Sale" 
                                    value={v.sellingPrice || ''} 
                                    onChange={e => handleVariantChange(v.sku, 'sellingPrice', e.target.value)} 
                                    className="w-full bg-zinc-50 border border-zinc-200 rounded-lg p-1 text-[10.5px] font-mono font-bold text-center text-[#c9a227]" 
                                  />
                                </div>
                                <div>
                                  <input 
                                    type="number" 
                                    placeholder="Stock" 
                                    value={v.stockQuantity} 
                                    onChange={e => handleVariantChange(v.sku, 'stockQuantity', e.target.value)} 
                                    className="w-full bg-zinc-50 border border-zinc-200 rounded-lg p-1 text-[10.5px] font-mono font-bold text-center" 
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                      </div>

                    </div>
                  </motion.div>
                )}

                {/* STEP 4: LABELS & INVENTORY */}
                {step === 4 && (
                  <motion.div
                    key="step-4"
                    initial={{ opacity: 0, x: 15 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -15 }}
                    className="grid grid-cols-1 md:grid-cols-2 gap-8"
                  >
                    {/* Left: configuration */}
                    <div className="space-y-4">
                      <h4 className="text-xs font-black uppercase text-black tracking-wider flex items-center gap-1.5 pb-2 border-b border-zinc-100">
                        <Sliders size={13} className="text-[#c9a227]" /> Label Calibration
                      </h4>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-black block mb-1">Select Label Template</label>
                          <select
                            value={labelTemplate}
                            onChange={e => setLabelTemplate(e.target.value as any)}
                            className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs font-semibold cursor-pointer"
                          >
                            <option value="t1">Template 1 (Sale Price Focused)</option>
                            <option value="t2">Template 2 (Discount Focused)</option>
                            <option value="t3">Template 3 (Premium Brand Focused)</option>
                            <option value="t4">Template 4 (Minimal Retail)</option>
                            <option value="t5">Template 5 (Fashion Store Style)</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-black block mb-1">Select Roll Size</label>
                          <select
                            value={labelPreset}
                            onChange={e => {
                              const newPreset = e.target.value as any;
                              if (newPreset === 'custom') return;
                              setLabelPreset(newPreset);
                              const nextCal = getPresetCalibration(newPreset);
                              saveCalibration(nextCal);
                              setCalibration(nextCal);
                            }}
                            className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs font-semibold cursor-pointer"
                          >
                            <option value="25x15">25x15 mm (Micro)</option>
                            <option value="38x25">38x25 mm (Standard)</option>
                            <option value="50x25">50x25 mm (Details)</option>
                            {labelPreset === 'custom' && (
                              <option value="custom">Custom Alignment</option>
                            )}
                          </select>
                        </div>
                      </div>

                      {/* Stock location controls */}
                      <div className="p-4 bg-zinc-50 border border-zinc-200/60 rounded-2xl space-y-3">
                        <span className="text-[9px] uppercase tracking-widest text-zinc-400 font-bold block">Logistics & Location Settings</span>
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="text-[8px] uppercase font-bold text-zinc-400 block mb-0.5">Warehouse</label>
                            <input type="text" value={formData.warehouse} onChange={e => setFormData({...formData, warehouse: e.target.value})} className="w-full bg-white border border-zinc-200 rounded-lg px-2.5 py-1.5 text-xs text-black" />
                          </div>
                          <div>
                            <label className="text-[8px] uppercase font-bold text-zinc-400 block mb-0.5">Rack Number</label>
                            <input type="text" placeholder="e.g. R-12" value={formData.rackNumber} onChange={e => setFormData({...formData, rackNumber: e.target.value})} className="w-full bg-white border border-zinc-200 rounded-lg px-2.5 py-1.5 text-xs text-black" />
                          </div>
                          <div>
                            <label className="text-[8px] uppercase font-bold text-zinc-400 block mb-0.5">Store Location</label>
                            <input type="text" placeholder="e.g. Shelf A1" value={formData.storeLocation} onChange={e => setFormData({...formData, storeLocation: e.target.value})} className="w-full bg-white border border-zinc-200 rounded-lg px-2.5 py-1.5 text-xs text-black" />
                          </div>
                        </div>
                      </div>

                      {/* Variants Printing quantities */}
                      <div className="bg-white border border-zinc-200 p-4 rounded-2xl">
                        <span className="text-[10px] text-zinc-400 font-black uppercase tracking-wider block mb-2.5">Configure Print Quantities</span>
                        <div className="max-h-36 overflow-y-auto divide-y divide-zinc-100 pr-1 scrollbar-thin">
                          {generatedVariants.map(v => (
                            <div key={v.sku} className="flex justify-between items-center py-2 text-xs">
                              <div>
                                <span className="font-extrabold text-black block">{v.color} - {v.size}</span>
                                <span className="text-[8.5px] font-mono text-zinc-400">{v.sku}</span>
                              </div>
                              <div className="flex items-center space-x-1.5">
                                <label className="text-[9.5px] text-zinc-400">Qty:</label>
                                <input
                                  type="number"
                                  min="0"
                                  value={printQtys[v.sku] ?? 1}
                                  onChange={e => setPrintQtys({ ...printQtys, [v.sku]: Math.max(0, Number(e.target.value) || 0) })}
                                  className="w-12 bg-zinc-50 border border-zinc-200 rounded-lg p-1 font-mono font-bold text-center"
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Right: sticker preview & print trigger */}
                    <div className="flex flex-col items-center justify-between bg-zinc-50/50 border border-zinc-200/80 p-6 rounded-3xl h-[400px]">
                      <span className="text-[10px] text-black font-black uppercase tracking-widest block mb-2">Live TSC Apparel Label Preview</span>
                      
                      {/* simulated barcode label */}
                      {(() => {
                        const activePreset = {
                          '25x15': { widthMm: 25, heightMm: 15 },
                          '38x25': { widthMm: 38, heightMm: 25 },
                          '50x25': { widthMm: 50, heightMm: 25 }
                        }[labelPreset] || { widthMm: 38, heightMm: 25 };
                        const mrp = Number(previewProd.mrp || previewProd.sellingPrice || 0);
                        const sale = Number(previewProd.sellingPrice || 0);
                        const discount = mrp > sale ? Math.round(((mrp - sale) / mrp) * 100) : 0;
                        
                        const H = activePreset.heightMm;
                        const W = activePreset.widthMm;
                        const previewBarcodeH = `${Math.round(H * 0.46 * 6)}px`;
                        const val = previewProd.barcodeId || deriveBarcodeId(previewProd.sku || previewProd.id || '');

                        return (
                          <div
                            className="bg-white text-black flex flex-col justify-between items-center text-center relative shadow-lg border border-zinc-300 rounded-md transition-all duration-300"
                            style={{
                              width: `${W * 6}px`,
                              height: `${H * 6}px`,
                              padding: `1mm`,
                              boxSizing: 'border-box',
                              fontFamily: 'system-ui, -apple-system, sans-serif'
                            }}
                          >
                            {/* Template 1: Sale Price Focused */}
                            {labelTemplate === 't1' && (
                              <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'center', boxSizing: 'border-box', padding: '0.8mm 1mm' }}>
                                <div style={{ fontSize: '11pt', fontWeight: 'bold', textTransform: 'uppercase', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%', lineHeight: '1.2' }}>
                                  {formData.brand || 'ATL'} {formData.name || 'APPAREL'}
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', fontSize: '8.5pt', fontWeight: '700', textTransform: 'uppercase', lineHeight: '1.2', width: '100%', whiteSpace: 'nowrap' }}>
                                  <span>SIZE {previewProd.size || '32'}  •  <strong style={{ fontSize: '12pt', fontWeight: '900', color: 'black' }}>₹{sale}</strong></span>
                                </div>
                                <div style={{ width: '95%', height: previewBarcodeH, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                                  <Code128Barcode value={val} width="auto" height={previewBarcodeH} />
                                </div>
                              </div>
                            )}

                            {/* Template 2: Discount Focused */}
                            {labelTemplate === 't2' && (
                              <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'center', boxSizing: 'border-box', padding: '0.8mm 1mm' }}>
                                <div style={{ fontSize: '11pt', fontWeight: 'bold', textTransform: 'uppercase', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%', lineHeight: '1.2' }}>
                                  {formData.brand || 'ATL'} {formData.name || 'APPAREL'}
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', fontSize: '8.5pt', fontWeight: '700', textTransform: 'uppercase', lineHeight: '1.2', width: '100%', whiteSpace: 'nowrap' }}>
                                  <span>SZ {previewProd.size || '32'}  •  <strong style={{ fontSize: '12pt', fontWeight: '900', color: 'black' }}>₹{sale}</strong> {discount > 0 && <span style={{ fontSize: '8pt', color: '#b91c1c', fontWeight: '900', marginLeft: '2px' }}>({discount}% OFF)</span>}</span>
                                </div>
                                <div style={{ width: '95%', height: previewBarcodeH, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                                  <Code128Barcode value={val} width="auto" height={previewBarcodeH} />
                                </div>
                              </div>
                            )}

                            {/* Template 3: MRP Comparison */}
                            {labelTemplate === 't3' && (
                              <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'center', boxSizing: 'border-box', padding: '0.8mm 1mm' }}>
                                <div style={{ fontSize: '11pt', fontWeight: 'bold', textTransform: 'uppercase', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%', lineHeight: '1.2' }}>
                                  {formData.brand || 'ATL'} {formData.name || 'APPAREL'}
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', fontSize: '8.5pt', fontWeight: '700', textTransform: 'uppercase', lineHeight: '1.2', width: '100%', whiteSpace: 'nowrap' }}>
                                  <span>SIZE {previewProd.size || '32'}  •  <strong style={{ fontSize: '12pt', fontWeight: '900', color: 'black' }}>₹{sale}</strong> {mrp > sale && <span style={{ fontSize: '8pt', color: '#666', textDecoration: 'line-through', fontWeight: 'normal', marginLeft: '2px' }}>₹{mrp}</span>}</span>
                                </div>
                                <div style={{ width: '95%', height: previewBarcodeH, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                                  <Code128Barcode value={val} width="auto" height={previewBarcodeH} />
                                </div>
                              </div>
                            )}

                            {/* Template 4: Minimal Retail */}
                            {labelTemplate === 't4' && (
                              <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'center', boxSizing: 'border-box', padding: '0.8mm 1mm' }}>
                                <div style={{ fontSize: '11pt', fontWeight: '800', textTransform: 'uppercase', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%', lineHeight: '1.2' }}>
                                  {formData.brand || 'ATL'} {formData.name || 'APPAREL'}
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', fontSize: '8.5pt', fontWeight: '700', textTransform: 'uppercase', lineHeight: '1.2', width: '100%', whiteSpace: 'nowrap' }}>
                                  <span>SIZE {previewProd.size || '32'}  •  <strong style={{ fontSize: '12pt', fontWeight: '900', color: 'black' }}>₹{sale}</strong></span>
                                </div>
                                <div style={{ width: '95%', height: previewBarcodeH, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                                  <Code128Barcode value={val} width="auto" height={previewBarcodeH} />
                                </div>
                              </div>
                            )}

                            {/* Template 5: Standard Clean */}
                            {labelTemplate === 't5' && (
                              <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'center', boxSizing: 'border-box', padding: '0.8mm 1mm' }}>
                                <div style={{ fontSize: '11pt', fontWeight: 'bold', textTransform: 'uppercase', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%', lineHeight: '1.2' }}>
                                  {formData.brand || 'ATL'} {formData.name || 'APPAREL'}
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', fontSize: '8.5pt', fontWeight: '700', textTransform: 'uppercase', lineHeight: '1.2', width: '100%', whiteSpace: 'nowrap' }}>
                                  <span>SIZE {previewProd.size || '32'}  •  <strong style={{ fontSize: '12pt', fontWeight: '900', color: 'black' }}>₹{sale}</strong></span>
                                </div>
                                <div style={{ width: '95%', height: previewBarcodeH, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                                  <Code128Barcode value={val} width="auto" height={previewBarcodeH} />
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      <div className="w-full mt-4 p-3 bg-amber-50 border border-amber-200 rounded-2xl text-left space-y-1 text-xs text-amber-800">
                        <span className="font-black uppercase text-[8.5px] tracking-wider block text-amber-900">⚠️ Required Print Settings</span>
                        <ul className="list-disc pl-4 space-y-0.5 text-[10px] font-medium">
                          <li>Scale: <strong className="font-bold">100% (Actual size)</strong></li>
                          <li>Margins: <strong className="font-bold">None</strong></li>
                          <li>Paper Size: <strong className="font-bold">{calibration.sheetWidth}mm × {calibration.sheetHeight}mm</strong></li>
                          <li>Background Graphics: <strong className="font-bold">ON</strong></li>
                        </ul>
                      </div>

                      <button
                        type="button"
                        onClick={triggerLabelPrint}
                        disabled={printStickers.length === 0}
                        className="w-full mt-4 py-3 bg-[#111111] hover:bg-zinc-800 text-white font-extrabold rounded-2xl text-xs uppercase tracking-widest transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-35"
                      >
                        <Printer size={13} className="text-[#c9a227]" /> Print Spool Label Tags ({printStickers.length})
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          ) : (
            /* BULK EXCEL/CSV IMPORT TAB MODULE */
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-200">
              
              {/* Drag/Drop Box */}
              <div className="border-2 border-dashed border-zinc-200 hover:border-[#c9a227]/50 transition-all rounded-3xl bg-zinc-50/50 p-8 text-center space-y-4 relative">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleCSVUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                
                <div className="w-12 h-12 bg-white border border-zinc-100 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
                  <Upload size={18} className="text-[#c9a227]" />
                </div>
                
                <div className="space-y-1 max-w-md mx-auto">
                  <p className="text-xs font-black uppercase tracking-wider text-black">Drag and drop your spreadsheet file here</p>
                  <p className="text-[10px] text-zinc-400 leading-normal">
                    Supports <strong>.csv</strong> files exported from Excel. Requires headers: 
                    <br />
                    <code className="bg-zinc-100 px-1 py-0.5 rounded text-zinc-600 font-mono text-[9px]">Brand, Product Name, Category, Size, Color, MRP, Discount, Stock</code>
                  </p>
                </div>

                {csvFile && (
                  <div className="inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full text-[10px] text-emerald-600 font-bold">
                    <CheckCircle2 size={12} /> Loaded: {csvFile.name}
                  </div>
                )}
              </div>

              {csvError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-xs rounded-xl flex items-center gap-1.5 font-bold">
                  <span>⚠️</span> {csvError}
                </div>
              )}

              {/* Data Table Review grid */}
              {parsedCsvProducts.length > 0 && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center pb-2 border-b border-zinc-100">
                    <div>
                      <span className="text-[9px] uppercase tracking-widest text-[#c9a227] font-black">Excel Sheet Ledger</span>
                      <h3 className="text-xs font-black uppercase text-black tracking-wider mt-0.5">Parsed Products List</h3>
                    </div>
                    <div className="flex gap-2">
                      <select
                        value={labelTemplate}
                        onChange={e => setLabelTemplate(e.target.value as any)}
                        className="bg-white border border-zinc-200 rounded-lg px-2 py-1 text-[10px] font-bold cursor-pointer"
                      >
                        <option value="t1">Sale Price Focused</option>
                        <option value="t2">Discount Focused</option>
                        <option value="t3">Premium Brand Focused</option>
                        <option value="t4">Minimal Retail</option>
                        <option value="t5">Fashion Store Style</option>
                      </select>
                      <button
                        type="button"
                        onClick={triggerLabelPrint}
                        className="bg-black text-[#c9a227] hover:bg-zinc-800 text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-lg flex items-center gap-1 transition-all cursor-pointer shadow-sm"
                      >
                        <Printer size={11} /> Print Labels ({printStickers.length})
                      </button>
                    </div>
                  </div>

                  <div className="border border-zinc-200/80 rounded-2xl overflow-hidden bg-white max-h-60 overflow-y-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-zinc-50 text-zinc-500 font-black uppercase text-[8.5px] border-b border-zinc-200">
                          <th className="p-3">Brand</th>
                          <th className="p-3">Product Name</th>
                          <th className="p-3">Category (Sub)</th>
                          <th className="p-3">Size/Color</th>
                          <th className="p-3 text-right">MRP (₹)</th>
                          <th className="p-3 text-right">Sale (₹)</th>
                          <th className="p-3 text-center">Stock</th>
                          <th className="p-3">Generated SKU</th>
                        </tr>
                      </thead>
                      <tbody>
                        {parsedCsvProducts.map((p, idx) => (
                          <tr key={idx} className="border-b border-zinc-100 hover:bg-zinc-50/50 text-[10.5px]">
                            <td className="p-3 font-extrabold text-black">{p.brand}</td>
                            <td className="p-3 text-zinc-600 truncate max-w-[120px]">{p.name}</td>
                            <td className="p-3 text-zinc-500 font-bold uppercase">{p.subCategory}</td>
                            <td className="p-3 font-mono font-extrabold">{p.size} / {p.color}</td>
                            <td className="p-3 text-right font-mono text-zinc-400">₹{p.mrp}</td>
                            <td className="p-3 text-right font-mono font-bold text-black">₹{p.sellingPrice}</td>
                            <td className="p-3 text-center font-mono font-bold text-zinc-600">{p.stockQuantity}</td>
                            <td className="p-3 font-mono font-bold text-[#c9a227]">{p.sku}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="px-8 py-5 border-t border-zinc-100 flex justify-between items-center bg-zinc-50/50 sticky bottom-0 z-20">
          {product ? (
            /* Single edit mode footer */
            <div className="flex justify-end gap-3 w-full">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 bg-white border border-zinc-200 hover:bg-zinc-50 rounded-xl text-xs font-bold text-zinc-600 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="px-5 py-2.5 bg-[#111111] text-[#c9a227] hover:bg-zinc-900 rounded-xl text-xs font-black uppercase tracking-widest transition-all cursor-pointer flex items-center gap-1.5 shadow-premium"
              >
                {isSubmitting ? 'Saving...' : 'Update SKU Details'} <ShieldCheck size={13} />
              </button>
            </div>
          ) : activeTab === 'single' ? (
            /* Wizard footer */
            <>
              <div>
                {step > 1 && (
                  <button
                    type="button"
                    onClick={handlePrev}
                    className="px-4 py-2.5 bg-white border border-zinc-200 hover:bg-zinc-50 rounded-xl text-xs font-bold text-zinc-600 transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <ArrowLeft size={13} /> Back
                  </button>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 bg-white border border-zinc-200 hover:bg-zinc-50 rounded-xl text-xs font-bold text-zinc-600 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                {step < 4 ? (
                  <button
                    type="button"
                    onClick={handleNext}
                    className="px-4 py-2.5 bg-black text-[#c9a227] rounded-xl text-xs font-bold hover:bg-zinc-800 transition-all flex items-center gap-1 cursor-pointer shadow-premium"
                  >
                    Continue <ArrowRight size={13} />
                  </button>
                ) : (
                  <button
                    type="submit"
                    onClick={handleSubmit}
                    disabled={isSubmitting || generatedVariants.length === 0}
                    className="px-5 py-2.5 bg-black text-[#c9a227] rounded-xl text-xs font-black uppercase tracking-widest hover:bg-zinc-800 transition-all flex items-center gap-1.5 cursor-pointer shadow-premium disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? 'Intaking...' : 'Confirm Intake'} <Check size={13} />
                  </button>
                )}
              </div>
            </>
          ) : (
            /* Bulk CSV footer */
            <div className="flex justify-end gap-3 w-full">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 bg-white border border-zinc-200 hover:bg-zinc-50 rounded-xl text-xs font-bold text-zinc-600 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                onClick={handleSubmit}
                disabled={isSubmitting || parsedCsvProducts.length === 0}
                className="px-6 py-2.5 bg-black text-[#c9a227] rounded-xl text-xs font-black uppercase tracking-widest hover:bg-zinc-800 transition-all flex items-center gap-1.5 cursor-pointer shadow-premium disabled:opacity-30 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Intaking Catalog...' : `Confirm Bulk Intake (${parsedCsvProducts.length} Items)`} <Check size={13} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Hidden print portal structure for TSC layout */}
      <PrintPortal>
        <div id="modal-label-print-sheet" className="hidden">
          {isPrinting && (
            <style>{`
              @media print {
                @page {
                  size: ${calibration.sheetWidth}mm ${calibration.sheetHeight}mm;
                  margin: 0;
                }
                html, body {
                  width: ${calibration.sheetWidth}mm !important;
                  height: auto !important;
                  margin: 0 !important;
                  padding: 0 !important;
                  background: white !important;
                  overflow: visible !important;
                }
                body > #root {
                  display: none !important;
                }
                body > #print-root {
                  display: block !important;
                  position: static !important;
                  width: ${calibration.sheetWidth}mm !important;
                  height: auto !important;
                  margin: 0 !important;
                  padding: 0 !important;
                  background: white !important;
                  overflow: visible !important;
                }
                #modal-label-print-sheet {
                  display: block !important;
                  width: ${calibration.sheetWidth}mm !important;
                  height: auto !important;
                  margin: 0 !important;
                  padding: 0 !important;
                  background: white !important;
                }
                .modal-print-page {
                  width: ${calibration.sheetWidth}mm !important;
                  height: ${calibration.sheetHeight}mm !important;
                  page-break-after: always !important;
                  page-break-inside: avoid !important;
                  display: grid !important;
                  grid-template-columns: repeat(${calibration.columns}, ${calibration.labelWidth}mm) !important;
                  grid-template-rows: repeat(${calibration.rowsPerSheet}, ${calibration.labelHeight}mm) !important;
                  column-gap: ${calibration.gapX}mm !important;
                  row-gap: ${calibration.gapY}mm !important;
                  padding-top: ${calibration.marginTop}mm !important;
                  padding-left: ${calibration.marginLeft}mm !important;
                  box-sizing: border-box !important;
                  position: relative !important;
                  left: ${calibration.horizontalOffset}mm !important;
                  top: ${calibration.verticalOffset}mm !important;
                  overflow: hidden !important;
                  background: white !important;
                  margin: 0 !important;
                }
                .modal-print-item {
                  width: ${calibration.labelWidth}mm !important;
                  height: ${calibration.labelHeight}mm !important;
                  box-sizing: border-box !important;
                  padding: 1.2mm 1.5mm !important;
                  display: flex !important;
                  flex-direction: column !important;
                  justify-content: space-between !important;
                  align-items: center !important;
                  text-align: center !important;
                  background: white !important;
                  color: black !important;
                  font-family: system-ui, -apple-system, sans-serif !important;
                  border: none !important;
                  margin: 0 !important;
                  overflow: hidden !important;
                }
              }
            `}</style>
          )}

          {printPages.map((page, pageIdx) => {
            return (
              <div key={pageIdx} className="modal-print-page">
                {page.map((item, itemIdx) => {
                  if (item === null) {
                    return (
                      <div 
                        key={itemIdx} 
                        style={{
                          width: `${calibration.labelWidth}mm`,
                          height: `${calibration.labelHeight}mm`,
                          background: 'transparent',
                          border: 'none',
                          boxSizing: 'border-box'
                        }} 
                      />
                    );
                  }

                  const H = calibration.labelHeight;
                  const W = calibration.labelWidth;
                  
                  const mrp = Number(item.mrp || item.sellingPrice || 0);
                  const sale = Number(item.sellingPrice || 0);
                  const discount = mrp > sale ? Math.round(((mrp - sale) / mrp) * 100) : 0;

                  return (
                    <div 
                      key={itemIdx} 
                      className="modal-print-item"
                      style={{
                        width: `${W}mm`,
                        height: `${H}mm`,
                        boxSizing: 'border-box',
                        padding: '1mm',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        background: 'white',
                        color: 'black',
                        overflow: 'hidden'
                      }}
                    >
                      {labelTemplate === 't1' && (() => {
                        const barcodeH = `${Math.max(H * 0.55, 13)}mm`;
                        const val = item.barcodeId || deriveBarcodeId(item.sku || item.id || '');
                        return (
                          <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'center', boxSizing: 'border-box', padding: '0.8mm 1mm 0.3mm 1mm', lineHeight: '1.1' }}>
                            <p style={{ fontSize: '8.5pt', fontWeight: '900', textTransform: 'uppercase', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%', textAlign: 'center' }}>
                              {item.brand} {item.name.replace(/ - .*/, '')}
                            </p>
                            <p style={{ fontSize: '10pt', fontWeight: '800', margin: 0, color: 'black', width: '100%', textAlign: 'center' }}>
                              SIZE {item.size || '-'}  ₹{sale}
                            </p>
                            <div style={{ width: '100%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Code128Barcode value={val} width="auto" height={barcodeH} />
                            </div>
                          </div>
                        );
                      })()}

                      {labelTemplate === 't2' && (() => {
                        const barcodeH = `${Math.max(H * 0.55, 13)}mm`;
                        const val = item.barcodeId || deriveBarcodeId(item.sku || item.id || '');
                        return (
                          <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'center', boxSizing: 'border-box', padding: '0.8mm 1mm 0.3mm 1mm', lineHeight: '1.1' }}>
                            <p style={{ fontSize: '8.5pt', fontWeight: '900', textTransform: 'uppercase', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%', textAlign: 'center' }}>
                              {item.brand} {item.name.replace(/ - .*/, '')}
                            </p>
                            <p style={{ fontSize: '10pt', fontWeight: '800', margin: 0, color: 'black', width: '100%', textAlign: 'center' }}>
                              SIZE {item.size || '-'}  ₹{sale}{discount > 0 ? ` (${discount}% OFF)` : ''}
                            </p>
                            <div style={{ width: '100%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Code128Barcode value={val} width="auto" height={barcodeH} />
                            </div>
                          </div>
                        );
                      })()}

                      {labelTemplate === 't3' && (() => {
                        const barcodeH = `${Math.max(H * 0.55, 13)}mm`;
                        const val = item.barcodeId || deriveBarcodeId(item.sku || item.id || '');
                        return (
                          <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'center', boxSizing: 'border-box', padding: '0.8mm 1mm 0.3mm 1mm', lineHeight: '1.1' }}>
                            <p style={{ fontSize: '8.5pt', fontWeight: '900', textTransform: 'uppercase', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%', textAlign: 'center' }}>
                              {item.brand} {item.name.replace(/ - .*/, '')}
                            </p>
                            <p style={{ fontSize: '10pt', fontWeight: '800', margin: 0, color: 'black', width: '100%', textAlign: 'center' }}>
                              SIZE {item.size || '-'}  ₹{sale}{mrp > sale ? ` (MRP ₹${mrp})` : ''}
                            </p>
                            <div style={{ width: '100%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Code128Barcode value={val} width="auto" height={barcodeH} />
                            </div>
                          </div>
                        );
                      })()}

                      {labelTemplate === 't4' && (() => {
                        const barcodeH = `${Math.max(H * 0.55, 13)}mm`;
                        const val = item.barcodeId || deriveBarcodeId(item.sku || item.id || '');
                        return (
                          <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'center', boxSizing: 'border-box', padding: '0.8mm 1mm 0.3mm 1mm', lineHeight: '1.1' }}>
                            <p style={{ fontSize: '8.5pt', fontWeight: '900', textTransform: 'uppercase', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%', textAlign: 'center' }}>
                              {item.brand} {item.name.replace(/ - .*/, '')}
                            </p>
                            <p style={{ fontSize: '10pt', fontWeight: '800', margin: 0, color: 'black', width: '100%', textAlign: 'center' }}>
                              SIZE {item.size || '-'}  ₹{sale}
                            </p>
                            <div style={{ width: '100%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Code128Barcode value={val} width="auto" height={barcodeH} />
                            </div>
                          </div>
                        );
                      })()}

                      {labelTemplate === 't5' && (() => {
                        const barcodeH = `${Math.max(H * 0.55, 13)}mm`;
                        const val = item.barcodeId || deriveBarcodeId(item.sku || item.id || '');
                        return (
                          <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'center', boxSizing: 'border-box', padding: '0.8mm 1mm 0.3mm 1mm', lineHeight: '1.1' }}>
                            <p style={{ fontSize: '8.5pt', fontWeight: '900', textTransform: 'uppercase', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%', textAlign: 'center' }}>
                              {item.brand} {item.name.replace(/ - .*/, '')}
                            </p>
                            <p style={{ fontSize: '10pt', fontWeight: '800', margin: 0, color: 'black', width: '100%', textAlign: 'center' }}>
                              SIZE {item.size || '-'}  ₹{sale}
                            </p>
                            <div style={{ width: '100%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Code128Barcode value={val} width="auto" height={barcodeH} />
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </PrintPortal>

    </div>
  );
};
