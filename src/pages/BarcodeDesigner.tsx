import React, { useState, useEffect } from 'react';
import { listenProducts, addLabelLog, listenLabelLogs, deriveBarcodeId } from '../firebase/db';
import { useAuth } from '../context/AuthContext';
import { PrintPortal } from '../components/PrintPortal';
import { Code128Barcode } from '../components/Code128Barcode';
import {
  Search, Printer, FileText, Check, Sparkles, History, Trash2, Sliders, Cpu, Zap, RotateCcw, Settings
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getSavedCalibration, saveCalibration } from '../utils/calibration';
import type { LabelCalibration } from '../utils/calibration';
import { CalibrationWizard } from '../components/CalibrationWizard';

interface LabelPreset {
  id: string;
  name: string;
  widthMm: number;
  heightMm: number;
  columns: number;
  gapX: number;
  gapY: number;
}

const LABEL_PRESETS: LabelPreset[] = [
  { id: '25x15', name: '25mm × 15mm (Micro - 1 Col)', widthMm: 25, heightMm: 15, columns: 1, gapX: 0, gapY: 2 },
  { id: '38x25', name: '38mm × 25mm (Clothing - 2 Col)', widthMm: 38, heightMm: 25, columns: 2, gapX: 2, gapY: 2 },
  { id: '50x25', name: '50mm × 25mm (Details - 2 Col)', widthMm: 50, heightMm: 25, columns: 2, gapX: 2, gapY: 2 },
  { id: '60x40', name: '60mm × 40mm (Large - 1 Col)', widthMm: 60, heightMm: 40, columns: 1, gapX: 0, gapY: 2 },
];

interface QueueItem {
  id: string;
  product: any;
  customPrice: number;
  template: 't1' | 't2' | 't3' | 't4' | 't5';
  preset: LabelPreset;
  qty: number;
  showQR: boolean;
}

export const BarcodeDesigner: React.FC = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState<any[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [labelLogs, setLabelLogs] = useState<any[]>([]);

  // Queue & Batch Print State
  const [printQueue, setPrintQueue] = useState<QueueItem[]>([]);

  // Dynamic Label Calibration & Wizard States
  const [calibration, setCalibration] = useState<LabelCalibration>(getSavedCalibration());

  // Customisations
  const [searchQuery, setSearchQuery] = useState('');
  const [labelTemplate, setLabelTemplate] = useState<'t1' | 't2' | 't3' | 't4' | 't5'>('t1');
  const [labelPreset, setLabelPreset] = useState<string>(() => {
    const saved = getSavedCalibration();
    const matched = LABEL_PRESETS.find(
      p => p.widthMm === saved.labelWidth &&
           p.heightMm === saved.labelHeight &&
           p.columns === saved.columns
    );
    return matched ? matched.id : 'custom';
  });
  const [printQty, setPrintQty] = useState<number>(1);
  const [customPrice, setCustomPrice] = useState<string>('');
  const [showQR] = useState<boolean>(false);
  const [targetPrinter, setTargetPrinter] = useState<'tvs' | 'zebra' | 'tsc'>('tsc');

  // Dynamic Label Calibration & Wizard States
  const [isWizardOpen, setIsWizardOpen] = useState<boolean>(false);
  const [isPrintingTestPattern, setIsPrintingTestPattern] = useState<boolean>(false);

  // Alert Banner
  const [alertMessage, setAlertMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    const unsubProducts = listenProducts((data) => {
      setProducts(data);
      if (data.length > 0 && !selectedProduct) {
        setSelectedProduct(data[0]); // Select first item by default
      }
    });

    const unsubLogs = listenLabelLogs((data) => {
      setLabelLogs(data);
    });

    return () => {
      unsubProducts();
      unsubLogs();
    };
  }, []);

  useEffect(() => {
    if (selectedProduct) {
      setCustomPrice(selectedProduct.sellingPrice.toString());
    }
  }, [selectedProduct]);

  useEffect(() => {
    if (labelPreset === 'custom' || labelPreset === '') return;
    const matched = LABEL_PRESETS.find(p => p.id === labelPreset);
    if (matched) {
      setCalibration(prev => {
        const next = {
          ...prev,
          labelWidth: matched.widthMm,
          labelHeight: matched.heightMm,
          columns: matched.columns,
          gapX: matched.gapX,
          gapY: matched.gapY,
          sheetWidth: prev.layoutMode === 'roll'
            ? (matched.widthMm * matched.columns + matched.gapX * (matched.columns - 1) + prev.marginLeft * 2)
            : prev.sheetWidth,
          sheetHeight: prev.layoutMode === 'roll'
            ? (matched.heightMm + prev.marginTop * 2)
            : prev.sheetHeight
        };
        saveCalibration(next);
        return next;
      });
    }
  }, [labelPreset]);

  // Global keydown capture listener for hardware scanner in Barcode Designer
  useEffect(() => {
    let buffer = '';
    let lastKeyTime = Date.now();

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key.length > 1 && e.key !== 'Enter') return;

      const currentTime = Date.now();
      const timeDiff = currentTime - lastKeyTime;

      if (timeDiff > 150) {
        buffer = '';
      }

      lastKeyTime = currentTime;

      if (e.key === 'Enter') {
        if (buffer.length > 2) {
          const scannedVal = buffer.trim().toLowerCase();
          const matched = products.find(p => 
            (p.barcode && p.barcode.toString().toLowerCase() === scannedVal) ||
            (p.sku && p.sku.toLowerCase() === scannedVal)
          );
          if (matched) {
            setSelectedProduct(matched);
            setSearchQuery('');
            triggerAlert('success', `Scanned and selected: ${matched.brand} ${matched.name}`);
            e.preventDefault();
            e.stopPropagation();
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
  }, [products]);

  const triggerAlert = (type: 'success' | 'error', text: string) => {
    setAlertMessage({ type, text });
    setTimeout(() => setAlertMessage(null), 3000);
  };

  const handleAddToQueue = () => {
    if (!selectedProduct) return;

    const activePreset = LABEL_PRESETS.find(p => p.id === labelPreset) || LABEL_PRESETS[1];

    const newItem: QueueItem = {
      id: 'q-' + Date.now() + Math.random().toString(36).substr(2, 4),
      product: selectedProduct,
      customPrice: Number(customPrice) || selectedProduct.sellingPrice,
      template: labelTemplate,
      preset: activePreset,
      qty: printQty,
      showQR: showQR
    };

    setPrintQueue(prev => [...prev, newItem]);
    triggerAlert('success', `Queued ${printQty} label(s) for ${selectedProduct.brand} ${selectedProduct.name}`);
  };

  const handleRemoveFromQueue = (id: string) => {
    setPrintQueue(prev => prev.filter(item => item.id !== id));
  };

  const filteredProducts = products.filter(p => {
    return (
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const activePreset = LABEL_PRESETS.find(p => p.id === labelPreset) || LABEL_PRESETS[1];

  const handlePrint = async () => {
    if (printQueue.length === 0 && !selectedProduct) {
      triggerAlert('error', 'Select a product or queue labels before printing.');
      return;
    }

    try {
      if (printQueue.length === 0 && selectedProduct) {
        await addLabelLog({
          productId: selectedProduct.id,
          productName: `${selectedProduct.brand} ${selectedProduct.name}`,
          sku: selectedProduct.sku,
          price: Number(customPrice) || selectedProduct.sellingPrice,
          template: labelTemplate,
          presetName: activePreset.name,
          qty: printQty
        }, user);

        triggerAlert('success', 'Logged label print. Spooling printer spool dialog...');
      } else {
        for (const item of printQueue) {
          await addLabelLog({
            productId: item.product.id,
            productName: `${item.product.brand} ${item.product.name}`,
            sku: item.product.sku,
            price: item.customPrice,
            template: item.template,
            presetName: item.preset.name,
            qty: item.qty
          }, user);
        }
        triggerAlert('success', `Logged ${printQueue.length} batch label(s). Spooling printer...`);
      }

      setTimeout(() => {
        window.print();
      }, 500);

    } catch (err: any) {
      console.error("Failed to execute label logs database write:", err);
      triggerAlert('error', 'Database log write failed.');
    }
  };

  const handlePrintTestPattern = () => {
    setIsPrintingTestPattern(true);
    triggerAlert('success', 'Spooling calibration test pattern to printer...');
    setTimeout(() => {
      window.print();
      setIsPrintingTestPattern(false);
    }, 500);
  };

  const handleReprintLog = (log: any) => {
    const matchedPreset = LABEL_PRESETS.find(p => p.name === log.presetName) || LABEL_PRESETS[1];
    const originalProd = products.find(p => p.id === log.productId) || {
      id: log.productId,
      brand: log.productName.split(' ')[0] || 'Brand',
      name: log.productName.split(' ').slice(1).join(' ') || 'Product',
      sku: log.sku,
      sellingPrice: log.price
    };

    const newItem: QueueItem = {
      id: 'q-' + Date.now(),
      product: originalProd,
      customPrice: log.price,
      template: log.template,
      preset: matchedPreset,
      qty: log.qty,
      showQR: false
    };

    setPrintQueue(prev => [...prev, newItem]);
    triggerAlert('success', `Re-queued ${log.qty} label(s) from history: ${log.productName}`);
  };

  const flatStickerList: any[] = [];
  if (isPrintingTestPattern) {
    const totalSlots = calibration.columns * (calibration.layoutMode === 'roll' ? 2 : calibration.rowsPerSheet);
    for (let i = 0; i < totalSlots; i++) {
      flatStickerList.push({
        isTest: true,
        index: i + 1
      });
    }
  } else if (printQueue.length > 0) {
    printQueue.forEach(item => {
      for (let i = 0; i < item.qty; i++) {
        flatStickerList.push({
          product: item.product,
          customPrice: item.customPrice,
          template: item.template,
          preset: item.preset,
          showQR: item.showQR
        });
      }
    });
  } else if (selectedProduct) {
    const activePreset = LABEL_PRESETS.find(p => p.id === labelPreset) || LABEL_PRESETS[1];
    for (let i = 0; i < printQty; i++) {
      flatStickerList.push({
        product: selectedProduct,
        customPrice: Number(customPrice) || selectedProduct.sellingPrice,
        template: labelTemplate,
        preset: activePreset,
        showQR: showQR
      });
    }
  }

  // Chunk flatStickerList into printPages based on calibration grid layout
  const stickersPerPage = calibration.columns * calibration.rowsPerSheet;
  const printPages: any[][] = [];
  for (let i = 0; i < flatStickerList.length; i += stickersPerPage) {
    const chunk = flatStickerList.slice(i, i + stickersPerPage);
    // Pad the last page to keep column structure in CSS grid
    while (chunk.length < stickersPerPage) {
      chunk.push(null); // represent blank space
    }
    printPages.push(chunk);
  }

  return (
    <div className="space-y-6 select-none z-10 relative text-[#1C1A17] font-sans pb-12">

      <style>{`
        @media print {
          /* ── PAGE = ROW OR SHEET ────────────────────────────────────── */
          @page {
            size: ${calibration.sheetWidth}mm ${calibration.sheetHeight}mm;
            margin: 0mm !important;
          }

          /* Hide everything on screen except the print portal */
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
          #barcode-label-print-sheet {
            display: block !important;
            width: ${calibration.sheetWidth}mm !important;
            height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }

          /* ── EACH PAGE = GRID ROW OR SHEET ───────────────────────── */
          .barcode-print-page {
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

          /* Each label item */
          .barcode-print-item {
            width: ${calibration.labelWidth}mm !important;
            height: ${calibration.labelHeight}mm !important;
            box-sizing: border-box !important;
            padding: 1mm 1.5mm 0.5mm 1.5mm !important;
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

          /* ── SVG BARCODE ─────────────────────────────────────────── */
          .barcode-print-item svg {
            display: block !important;
            width: 100% !important;
            height: auto !important;
            max-width: 100% !important;
            min-height: 10mm !important;
            overflow: visible !important;
            background: white !important;
            /* crispEdges = sharp bar edges, no anti-aliasing blur */
            shape-rendering: crispEdges !important;
            /* Force black bars to print, never grey out */
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }

          /* Force ALL elements to print exact colors */
          .barcode-print-item * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
        }
      `}</style>

      {/* Modern Redesigned Header Controls */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-[2rem] border border-zinc-200/80 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center space-x-2 bg-[#5D5FEF]/10 border border-[#5D5FEF]/20 px-3 py-0.5 rounded-full w-max text-[#5D5FEF]">
            <Sparkles size={11} className="animate-pulse" />
            <span className="text-[9px] uppercase font-black tracking-widest font-mono font-sans">Label printing suite</span>
          </div>
          <h1 className="text-xl md:text-2xl font-black text-black tracking-wide uppercase font-sans mt-0.5">
            Apparel Barcode Generator
          </h1>
        </div>

        <div className="flex space-x-2">
          {printQueue.length > 0 && (
            <button
              onClick={() => {
                setPrintQueue([]);
                triggerAlert('success', 'Print queue cleared.');
              }}
              className="px-4 py-2.5 bg-white border border-red-200 hover:bg-red-50 hover:text-red-600 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-sm text-red-500"
            >
              <Trash2 size={14} /> Clear Queue ({printQueue.reduce((a, c) => a + c.qty, 0)})
            </button>
          )}

          <button
            onClick={handlePrint}
            disabled={!selectedProduct && printQueue.length === 0}
            className="px-5 py-2.5 bg-[#5D5FEF] text-white rounded-xl text-xs font-extrabold hover:bg-[#4c4ddc] transition-all flex items-center gap-1.5 shadow-md cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed"
          >
            <Printer size={14} /> {printQueue.length > 0 ? `Print Batch Queue (${printQueue.reduce((a, c) => a + c.qty, 0)})` : 'Spool Print Labels'}
          </button>
        </div>
      </div>

      {/* Alert Banner */}
      {alertMessage && (
        <div className={`p-4 rounded-xl border text-xs flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-200 relative z-20 ${alertMessage.type === 'success'
          ? 'bg-green-50 border-green-200 text-green-700 font-bold'
          : 'bg-red-50 border-red-200 text-red-700 font-bold'
          }`}>
          <span>{alertMessage.type === 'success' ? '✨' : '⚠️'}</span>
          <span>{alertMessage.text}</span>
        </div>
      )}

      {/* Split Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left column: Specifications & Queue logs */}
        <div className="lg:col-span-2 space-y-6">

          {/* Select Product Input */}
          <div className="rounded-[2rem] bg-white border border-zinc-200/80 p-6 space-y-4 shadow-sm relative z-20">
            <h3 className="text-xs font-black text-[#1C1A17] uppercase tracking-wider flex items-center gap-1.5">
              <Cpu size={14} className="text-[#5D5FEF]" /> Select product for labelling
            </h3>

            <div className="relative">
              <Search size={14} className="absolute left-3.5 top-3.5 text-zinc-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Lookup SKU, clothing brand, or model..."
                className="w-full bg-[#F4F5FC]/50 border border-zinc-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-[#1C1A17] focus:outline-none focus:border-[#5D5FEF] focus:bg-white placeholder-zinc-400 transition-all font-medium"
              />
            </div>

            {/* Results selector overlay */}
            {searchQuery && (
              <div className="absolute left-6 right-6 mt-1 max-h-48 overflow-y-auto bg-white border border-zinc-200 rounded-xl shadow-2xl z-30 divide-y divide-zinc-100">
                {filteredProducts.length > 0 ? (
                  filteredProducts.map(p => (
                    <button
                      key={p.id}
                      onClick={() => {
                        setSelectedProduct(p);
                        setSearchQuery('');
                      }}
                      className="w-full flex justify-between items-center p-3.5 text-left hover:bg-zinc-50 text-xs transition-colors cursor-pointer"
                    >
                      <div>
                        <span className="font-extrabold text-black block">{p.brand} {p.name}</span>
                        <span className="text-[9px] text-zinc-400 uppercase font-mono font-bold">SKU: {p.sku} | Price: Rs. {p.sellingPrice}</span>
                      </div>
                      {selectedProduct?.id === p.id && <Check size={14} className="text-[#5D5FEF]" />}
                    </button>
                  ))
                ) : (
                  <div className="p-3 text-center text-zinc-400 text-xs">No matching products</div>
                )}
              </div>
            )}

            {/* Selected product status bar */}
            {selectedProduct && (
              <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200/60 flex justify-between items-center text-xs">
                <div>
                  <span className="text-[9px] text-zinc-400 uppercase tracking-wider block font-bold mb-0.5">Active selection</span>
                  <p className="text-[#1C1A17] font-extrabold">{selectedProduct.brand} {selectedProduct.name}</p>
                  <span className="text-[9px] font-mono text-zinc-500 uppercase mt-0.5 block">SKU: {selectedProduct.sku}</span>
                </div>
                <div className="text-right">
                  <span className="text-[#5D5FEF] font-black font-mono text-sm block">Rs. {selectedProduct.sellingPrice}</span>
                  <span className="text-[9px] text-zinc-400 font-bold">Stock Qty: {selectedProduct.stockQuantity}</span>
                </div>
              </div>
            )}
          </div>

          {/* Configuration Parameters Panel */}
          <div className="rounded-[2.5rem] bg-white border border-zinc-200/80 p-6 grid grid-cols-1 md:grid-cols-2 gap-6 shadow-sm">

            {/* Left specifications column */}
            <div className="space-y-4">
              <h3 className="text-xs font-black text-[#1C1A17] uppercase tracking-wider flex items-center gap-1.5">
                <Sliders size={13} className="text-[#5D5FEF]" /> Template Specs
              </h3>

              {/* Template selection cards */}
              <div>
                <label className="text-[9px] uppercase tracking-wider text-zinc-500 font-black block mb-2">Apparel Label Design Layout</label>
                <div className="space-y-2">
                  {[
                    { id: 't1', title: 'Sale Price Focused', desc: 'Product Name, Size & Sale Price, large barcode. Optimized for scan speed.', tag: 'Sale' },
                    { id: 't2', title: 'Discount Focused', desc: 'Product Name, Size, Sale Price with Discount % display, large barcode.', tag: 'Discount' },
                    { id: 't3', title: 'MRP Comparison', desc: 'Product Name, Size, Sale Price with crossed-out MRP, large barcode.', tag: 'MRP' },
                    { id: 't4', title: 'Minimal Retail', desc: 'Clean Product Name, Size & Color details, large Sale Price, barcode.', tag: 'Minimal' },
                    { id: 't5', title: 'Standard Clean', desc: 'Standard clean apparel tag style with Size, Price, and large barcode.', tag: 'Clean' }
                  ].map(tmpl => (
                    <button
                      key={tmpl.id}
                      onClick={() => setLabelTemplate(tmpl.id as any)}
                      className={`w-full text-left p-3.5 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col justify-between ${labelTemplate === tmpl.id
                        ? 'bg-[#5D5FEF] text-white border-transparent shadow-sm scale-[1.01]'
                        : 'bg-zinc-50 border-zinc-200 text-zinc-600 hover:border-zinc-300 hover:bg-zinc-100/30'
                        }`}
                    >
                      <div className="flex justify-between items-center w-full mb-1">
                        <span className="text-[10px] font-black uppercase tracking-wider">{tmpl.title}</span>
                        <span className={`text-[8px] px-2 py-0.5 rounded-full font-black uppercase ${labelTemplate === tmpl.id ? 'bg-white text-[#5D5FEF]' : 'bg-zinc-200 text-zinc-500'}`}>
                          {tmpl.tag}
                        </span>
                      </div>
                      <span className={`text-[9.5px] ${labelTemplate === tmpl.id ? 'text-white/80' : 'text-zinc-400'} font-bold leading-normal`}>
                        {tmpl.desc}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* roll sizes */}
              <div>
                <label className="text-[9px] uppercase tracking-wider text-zinc-500 font-black block mb-1.5">Label Roll Size</label>
                <select
                  value={labelPreset}
                  onChange={(e) => setLabelPreset(e.target.value)}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2.5 text-xs text-[#1C1A17] focus:outline-none focus:border-[#5D5FEF] focus:bg-white cursor-pointer font-bold"
                >
                  {LABEL_PRESETS.map(preset => (
                    <option key={preset.id} value={preset.id}>{preset.name}</option>
                  ))}
                  {labelPreset === 'custom' && (
                    <option value="custom">Custom Alignment ({calibration.labelWidth}x{calibration.labelHeight}mm)</option>
                  )}
                </select>
              </div>
            </div>

            {/* Right printing column parameters */}
            <div className="space-y-4">
              <h3 className="text-xs font-black text-[#1C1A17] uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles size={13} className="text-[#5D5FEF]" /> Print Parameters
              </h3>

              {/* Qty field */}
              <div>
                <label className="text-[9px] uppercase tracking-wider text-zinc-500 font-black block mb-1">Print Batch Quantity</label>
                <input
                  type="number"
                  value={printQty || ''}
                  onChange={(e) => setPrintQty(Math.max(1, Number(e.target.value)))}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2 text-xs text-[#1C1A17] focus:outline-none focus:border-[#5D5FEF] focus:bg-white font-black font-mono"
                  min="1"
                />
              </div>

              {/* Price field */}
              <div>
                <label className="text-[9px] uppercase tracking-wider text-zinc-500 font-black block mb-1">Custom Price (Rs.) (Tag Override)</label>
                <input
                  type="text"
                  value={customPrice}
                  onChange={(e) => setCustomPrice(e.target.value)}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2 text-xs text-[#5D5FEF] focus:outline-none focus:border-[#5D5FEF] focus:bg-white font-black font-mono"
                />
              </div>

              {/* Target Printer & Calibration Wizard Button */}
              <div className="space-y-3 pt-2">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[9px] uppercase tracking-wider text-zinc-500 font-black block mb-1">Target Printer</label>
                    <select
                      value={targetPrinter}
                      onChange={(e) => setTargetPrinter(e.target.value as any)}
                      className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-1.5 text-xs text-[#1C1A17] focus:outline-none focus:border-[#5D5FEF] focus:bg-white cursor-pointer font-bold"
                    >
                      <option value="tvs">TVS LP-Series</option>
                      <option value="zebra">Zebra ZD-Series</option>
                      <option value="tsc">TSC TE-Series</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[9px] uppercase tracking-wider text-zinc-500 font-black block mb-1">Label Mode</label>
                    <div className="text-[10px] text-zinc-600 bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-1.5 font-bold leading-tight flex flex-col justify-center h-[30px] uppercase">
                      {calibration.layoutMode} Mode
                    </div>
                  </div>
                </div>

                <div className="p-3.5 bg-zinc-50 border border-zinc-200/60 rounded-2xl space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="font-extrabold text-black">Active Grid Calibration</span>
                    <button
                      onClick={() => setIsWizardOpen(true)}
                      className="px-2.5 py-1 bg-white hover:bg-zinc-100 text-[#5D5FEF] rounded-lg border border-zinc-200 transition-all font-black uppercase text-[8px] flex items-center gap-1 shadow-sm"
                    >
                      <Settings size={9} /> Open Wizard
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[9.5px] text-zinc-500 font-bold font-mono">
                    <div>Label: {calibration.labelWidth}x{calibration.labelHeight}mm</div>
                    <div>Columns: {calibration.columns}</div>
                    <div>Horiz Shift: {calibration.horizontalOffset}mm</div>
                    <div>Vert Shift: {calibration.verticalOffset}mm</div>
                  </div>
                </div>

                <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl space-y-1.5 text-xs text-amber-800">
                  <span className="font-black uppercase text-[9px] tracking-wider block text-amber-900">⚠️ Required Print Dialog Settings</span>
                  <ul className="list-disc pl-4 space-y-0.5 text-[10.5px] font-medium">
                    <li>Scale: <strong className="font-bold">100%</strong> (Actual size)</li>
                    <li>Margins: <strong className="font-bold">None</strong></li>
                    <li>Paper Size: <strong className="font-bold">{calibration.sheetWidth}mm × {calibration.sheetHeight}mm</strong></li>
                    <li>Background Graphics: <strong className="font-bold">ON</strong></li>
                  </ul>
                </div>
              </div>

              {/* Add to Queue Button */}
              <button
                onClick={handleAddToQueue}
                disabled={!selectedProduct}
                className="w-full mt-2 py-3 bg-[#5D5FEF] hover:bg-[#4c4ddc] text-white font-extrabold rounded-2xl text-xs uppercase tracking-widest transition-all duration-200 shadow-md flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <Zap size={12} /> Add To Print Queue
              </button>
            </div>

          </div>

          {/* Batch Print Queue Ledger */}
          <div className="rounded-[2.5rem] bg-white border border-zinc-200/80 p-6 space-y-4 shadow-sm">
            <div className="flex justify-between items-center pb-2 border-b border-zinc-100">
              <div>
                <span className="text-[9px] uppercase tracking-widest text-[#5D5FEF] font-black">Queue Ledger</span>
                <h3 className="text-sm font-black text-black uppercase tracking-wider mt-0.5">Batch Print Queue</h3>
              </div>
              <span className="text-[10px] bg-[#5D5FEF]/10 text-[#5D5FEF] border border-[#5D5FEF]/20 px-3 py-1 rounded-full font-black font-mono">
                {printQueue.reduce((a, c) => a + c.qty, 0)} Items
              </span>
            </div>

            <div className="max-h-60 overflow-y-auto divide-y divide-zinc-100 pr-2 scrollbar-thin">
              <AnimatePresence initial={false}>
                {printQueue.length > 0 ? (
                  printQueue.map((item, idx) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ duration: 0.2 }}
                      className="flex justify-between items-center py-4 first:pt-2 last:pb-2"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-black text-zinc-400 font-mono">#{idx + 1}</span>
                          <span className="text-black text-xs font-extrabold">{item.product.brand} {item.product.name}</span>
                        </div>
                        <div className="flex items-center gap-2 text-[9px] text-zinc-400 font-bold">
                          <span className="uppercase font-mono bg-zinc-50 border border-zinc-200/60 px-1.5 py-0.5 rounded text-zinc-500">SKU: {item.product.sku}</span>
                          <span>•</span>
                          <span>Roll size: {item.preset.widthMm}x{item.preset.heightMm}mm</span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <span className="text-xs font-black text-[#5D5FEF] font-mono block">Rs. {item.customPrice}</span>
                          <span className="text-[9px] text-zinc-400 block font-mono">Qty: {item.qty} pcs</span>
                        </div>
                        <button
                          onClick={() => handleRemoveFromQueue(item.id)}
                          className="p-1.5 text-zinc-400 hover:text-red-500 cursor-pointer"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="py-12 text-center text-zinc-400 text-xs font-black uppercase tracking-wider font-mono">
                    Print queue is currently empty.
                  </div>
                )}
              </AnimatePresence>
            </div>
          </div>

        </div>

        {/* Right column: Sticker roll preview and history logs */}
        <div className="space-y-6">

          {/* Sticker Preview visual output */}
          <div className="rounded-[2.5rem] bg-white border border-zinc-200/80 p-6 shadow-sm flex flex-col items-center">
            <h3 className="text-xs font-black text-black uppercase tracking-wider mb-4 flex items-center gap-1.5">
              <FileText size={13} className="text-[#5D5FEF]" /> Sticker Preview ({calibration.labelWidth}x{calibration.labelHeight}mm)
            </h3>

            {selectedProduct ? (
              <div className="w-full flex flex-col items-center py-6 bg-zinc-100/60 border border-zinc-200 rounded-3xl relative overflow-hidden">
                {/* Simulated printer head slot */}
                <div className="w-60 h-3 bg-zinc-800 rounded-t-lg shadow-inner border-b border-zinc-900 relative">
                  <div className="absolute inset-x-4 top-0.5 h-0.5 bg-red-500/30 animate-pulse" />
                </div>
                
                {/* Thermal sticker sheet frame */}
                <div
                  className="bg-white text-black flex flex-col justify-between items-center text-center relative transition-all duration-300 shadow-xl border border-zinc-300 mt-0.5 rounded-b-md"
                  style={{
                    width: `${calibration.labelWidth * 6}px`,
                    height: `${calibration.labelHeight * 6}px`,
                    padding: `${1.2 * 6}px ${1.5 * 6}px`,
                    boxSizing: 'border-box',
                    backgroundImage: 'radial-gradient(circle, #fafafa 12%, transparent 13%)',
                    backgroundSize: '10px 10px',
                    boxShadow: '0 20px 40px rgba(0,0,0,0.06), 0 2px 4px rgba(0,0,0,0.04)',
                    fontFamily: 'system-ui, -apple-system, sans-serif'
                  }}
                >
                  <div className="absolute left-1 top-1/2 -translate-y-1/2 w-1 h-3 rounded-full bg-zinc-200 border-r border-zinc-300" />
                  <div className="absolute right-1 top-1/2 -translate-y-1/2 w-1 h-3 rounded-full bg-zinc-200 border-l border-zinc-300" />
                  <div className="absolute top-0 inset-x-0 h-0 border-t border-dashed border-zinc-300" />

                  {(() => {
                    const mrp = Number(selectedProduct.mrp || selectedProduct.sellingPrice || 0);
                    const sale = Number(customPrice || selectedProduct.sellingPrice || 0);
                    const discount = mrp > sale ? Math.round(((mrp - sale) / mrp) * 100) : 0;
                    
                    const H = calibration.labelHeight;
                    const W = calibration.labelWidth;
                    
                    const fontProduct = `${H * 0.11 * 6}px`;
                    const fontDetails = `${H * 0.08 * 6}px`;
                    const fontSale = `${H * 0.14 * 6}px`;
                    const previewBarcodeH = `${Math.round(H * 0.46 * 6)}px`;
                    const val = selectedProduct.barcodeId || deriveBarcodeId(selectedProduct.sku || selectedProduct.id);

                    return (
                      <>
                        {/* Template 1: Sale Price Focused */}
                        {labelTemplate === 't1' && (
                          <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'center', boxSizing: 'border-box', padding: '0.8mm 1mm' }}>
                            <div style={{ fontSize: fontProduct, fontWeight: 'bold', textTransform: 'uppercase', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%', lineHeight: '1.2', textAlign: 'center' }}>
                              {selectedProduct.brand} {selectedProduct.name.replace(/ - .*/, '')}
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', fontSize: fontDetails, fontWeight: '700', textTransform: 'uppercase', lineHeight: '1.2', width: '100%', whiteSpace: 'nowrap' }}>
                              <span>SIZE {selectedProduct.size || '32'}  •  <strong style={{ fontSize: fontSale, fontWeight: '900', color: 'black' }}>₹{sale}</strong></span>
                            </div>
                            <div style={{ width: '95%', height: previewBarcodeH, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                              <Code128Barcode value={val} width="auto" height={previewBarcodeH} />
                            </div>
                          </div>
                        )}

                        {/* Template 2: Discount Focused */}
                        {labelTemplate === 't2' && (
                          <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'center', boxSizing: 'border-box', padding: '0.8mm 1mm' }}>
                            <div style={{ fontSize: fontProduct, fontWeight: 'bold', textTransform: 'uppercase', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%', lineHeight: '1.2', textAlign: 'center' }}>
                              {selectedProduct.brand} {selectedProduct.name.replace(/ - .*/, '')}
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', fontSize: fontDetails, fontWeight: '700', textTransform: 'uppercase', lineHeight: '1.2', width: '100%', whiteSpace: 'nowrap' }}>
                              <span>SZ {selectedProduct.size || '32'}  •  <strong style={{ fontSize: fontSale, fontWeight: '900', color: 'black' }}>₹{sale}</strong> {discount > 0 && <span style={{ fontSize: `${H * 0.08 * 6}px`, color: '#b91c1c', fontWeight: '900', marginLeft: '2px' }}>({discount}% OFF)</span>}</span>
                            </div>
                            <div style={{ width: '95%', height: previewBarcodeH, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                              <Code128Barcode value={val} width="auto" height={previewBarcodeH} />
                            </div>
                          </div>
                        )}

                        {/* Template 3: MRP Comparison */}
                        {labelTemplate === 't3' && (
                          <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'center', boxSizing: 'border-box', padding: '0.8mm 1mm' }}>
                            <div style={{ fontSize: fontProduct, fontWeight: 'bold', textTransform: 'uppercase', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%', lineHeight: '1.2', textAlign: 'center' }}>
                              {selectedProduct.brand} {selectedProduct.name.replace(/ - .*/, '')}
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', fontSize: fontDetails, fontWeight: '700', textTransform: 'uppercase', lineHeight: '1.2', width: '100%', whiteSpace: 'nowrap' }}>
                              <span>SIZE {selectedProduct.size || '32'}  •  <strong style={{ fontSize: fontSale, fontWeight: '900', color: 'black' }}>₹{sale}</strong> {mrp > sale && <span style={{ fontSize: `${H * 0.075 * 6}px`, color: '#666', textDecoration: 'line-through', fontWeight: 'normal', marginLeft: '2px' }}>₹{mrp}</span>}</span>
                            </div>
                            <div style={{ width: '95%', height: previewBarcodeH, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                              <Code128Barcode value={val} width="auto" height={previewBarcodeH} />
                            </div>
                          </div>
                        )}

                        {/* Template 4: Minimal Retail */}
                        {labelTemplate === 't4' && (
                          <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'center', boxSizing: 'border-box', padding: '0.8mm 1mm' }}>
                            <div style={{ fontSize: fontProduct, fontWeight: '800', textTransform: 'uppercase', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%', lineHeight: '1.2', textAlign: 'center' }}>
                              {selectedProduct.brand} {selectedProduct.name.replace(/ - .*/, '')}
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', fontSize: fontDetails, fontWeight: '700', textTransform: 'uppercase', lineHeight: '1.2', width: '100%', whiteSpace: 'nowrap' }}>
                              <span>SIZE {selectedProduct.size || '32'}  •  <strong style={{ fontSize: fontSale, fontWeight: '900', color: 'black' }}>₹{sale}</strong></span>
                            </div>
                            <div style={{ width: '95%', height: previewBarcodeH, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                              <Code128Barcode value={val} width="auto" height={previewBarcodeH} />
                            </div>
                          </div>
                        )}

                        {/* Template 5: Standard Clean */}
                        {labelTemplate === 't5' && (
                          <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'center', boxSizing: 'border-box', padding: '0.8mm 1mm' }}>
                            <div style={{ fontSize: fontProduct, fontWeight: 'bold', textTransform: 'uppercase', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%', lineHeight: '1.2', textAlign: 'center' }}>
                              {selectedProduct.brand} {selectedProduct.name.replace(/ - .*/, '')}
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', fontSize: fontDetails, fontWeight: '700', textTransform: 'uppercase', lineHeight: '1.2', width: '100%', whiteSpace: 'nowrap' }}>
                              <span>SIZE {selectedProduct.size || '32'}  •  <strong style={{ fontSize: fontSale, fontWeight: '900', color: 'black' }}>₹{sale}</strong></span>
                            </div>
                            <div style={{ width: '95%', height: previewBarcodeH, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                              <Code128Barcode value={val} width="auto" height={previewBarcodeH} />
                            </div>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>
            ) : (
              <div className="text-zinc-400 text-xs py-12 font-bold uppercase tracking-wider font-mono">Select product to preview</div>
            )}
          </div>

          {/* Historical Logs List */}
          <div className="rounded-[2.5rem] bg-white border border-zinc-200/80 p-6 shadow-sm flex flex-col justify-between max-h-[340px]">
            <div>
              <h2 className="text-xs font-black text-black uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <History size={14} className="text-[#5D5FEF]" /> Label Print History
              </h2>

              <div className="space-y-2 overflow-y-auto max-h-[220px] pr-2 scrollbar-thin">
                {labelLogs.length > 0 ? (
                  labelLogs.map((log) => (
                    <div
                      key={log.id}
                      className="p-3.5 rounded-2xl bg-zinc-50 hover:bg-zinc-100/50 border border-zinc-200 transition-all text-xs flex flex-col justify-between"
                    >
                      <div className="flex justify-between items-start">
                        <div className="max-w-[140px]">
                          <span className="font-extrabold text-black block truncate">{log.productName}</span>
                          <span className="text-[9px] text-zinc-400 font-mono font-bold block mt-0.5">SKU: {log.sku} | Qty: {log.qty} pcs</span>
                        </div>
                        <span className="text-[10px] text-[#5D5FEF] font-black font-mono">Rs. {log.price}</span>
                      </div>
                      <div className="text-[8.5px] text-zinc-400 mt-2.5 flex justify-between font-bold uppercase tracking-wider items-center pt-2.5 border-t border-zinc-200">
                        <span>{new Date(log.createdAt).toLocaleDateString()}</span>
                        <button
                          onClick={() => handleReprintLog(log)}
                          className="px-2.5 py-1.5 bg-white hover:bg-zinc-50 text-[#5D5FEF] hover:text-[#4c4ddc] rounded-xl border border-zinc-200 transition-all cursor-pointer flex items-center gap-1 font-black uppercase text-[8px] shadow-sm"
                        >
                          <RotateCcw size={8} /> Re-Queue
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-zinc-400 text-xs py-12 text-center font-mono uppercase tracking-wider font-bold">
                    No label prints tracked.
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Printable Sheet hidden from view */}
      <PrintPortal>
        <div id="barcode-label-print-sheet" className="hidden">
          {printPages.map((page, pageIdx) => {
            return (
              <div 
                key={pageIdx} 
                className="barcode-print-page"
              >
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


                  const mrp = Number(item.product.mrp || item.customPrice || 0);
                  const sale = Number(item.customPrice || item.product.sellingPrice || 0);
                  const discount = mrp > sale ? Math.round(((mrp - sale) / mrp) * 100) : 0;

                  // Calibration test pattern override
                  if (item.isTest) {
                    return (
                      <div
                        key={itemIdx}
                        className="barcode-print-item"
                        style={{
                          width: `${W}mm`,
                          height: `${H}mm`,
                          border: '0.2mm solid #ff0000',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'center',
                          alignItems: 'center',
                          boxSizing: 'border-box',
                          position: 'relative'
                        }}
                      >
                        <div style={{ position: 'absolute', left: 0, right: 0, top: '50%', borderTop: '0.1mm dashed #ff0000' }} />
                        <div style={{ position: 'absolute', top: 0, bottom: 0, left: '50%', borderLeft: '0.1mm dashed #ff0000' }} />
                        <span style={{ fontSize: '3mm', fontWeight: 'bold', color: '#ff0000', zIndex: 10 }}>TEST {item.index}</span>
                        <span style={{ fontSize: '2mm', color: '#ff0000', zIndex: 10 }}>{W}x{H}mm</span>
                      </div>
                    );
                  }

                  return (
                    <div 
                      key={itemIdx} 
                      className="barcode-print-item"
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
                      {item.template === 't1' && (() => {
                        const barcodeH = `${Math.max(H * 0.55, 13)}mm`;
                        const val = item.product.barcodeId || deriveBarcodeId(item.product.sku || item.product.id);
                        return (
                          <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'center', boxSizing: 'border-box', padding: '0.8mm 1mm 0.3mm 1mm', lineHeight: '1.1' }}>
                            <p style={{ fontSize: '8.5pt', fontWeight: '900', textTransform: 'uppercase', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%', textAlign: 'center' }}>
                              {item.product.brand} {item.product.name.replace(/ - .*/, '')}
                            </p>
                            <p style={{ fontSize: '10pt', fontWeight: '800', margin: 0, color: 'black', width: '100%', textAlign: 'center' }}>
                              SIZE {item.product.size || '-'}  ₹{sale}
                            </p>
                            <div style={{ width: '100%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Code128Barcode value={val} width="auto" height={barcodeH} />
                            </div>
                          </div>
                        );
                      })()}

                      {item.template === 't2' && (() => {
                        const barcodeH = `${Math.max(H * 0.55, 13)}mm`;
                        const val = item.product.barcodeId || deriveBarcodeId(item.product.sku || item.product.id);
                        return (
                          <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'center', boxSizing: 'border-box', padding: '0.8mm 1mm 0.3mm 1mm', lineHeight: '1.1' }}>
                            <p style={{ fontSize: '8.5pt', fontWeight: '900', textTransform: 'uppercase', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%', textAlign: 'center' }}>
                              {item.product.brand} {item.product.name.replace(/ - .*/, '')}
                            </p>
                            <p style={{ fontSize: '10pt', fontWeight: '800', margin: 0, color: 'black', width: '100%', textAlign: 'center' }}>
                              SIZE {item.product.size || '-'}  ₹{sale}{discount > 0 ? ` (${discount}% OFF)` : ''}
                            </p>
                            <div style={{ width: '100%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Code128Barcode value={val} width="auto" height={barcodeH} />
                            </div>
                          </div>
                        );
                      })()}

                      {item.template === 't3' && (() => {
                        const barcodeH = `${Math.max(H * 0.55, 13)}mm`;
                        const val = item.product.barcodeId || deriveBarcodeId(item.product.sku || item.product.id);
                        return (
                          <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'center', boxSizing: 'border-box', padding: '0.8mm 1mm 0.3mm 1mm', lineHeight: '1.1' }}>
                            <p style={{ fontSize: '8.5pt', fontWeight: '900', textTransform: 'uppercase', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%', textAlign: 'center' }}>
                              {item.product.brand} {item.product.name.replace(/ - .*/, '')}
                            </p>
                            <p style={{ fontSize: '10pt', fontWeight: '800', margin: 0, color: 'black', width: '100%', textAlign: 'center' }}>
                              SIZE {item.product.size || '-'}  ₹{sale}{mrp > sale ? ` (MRP ₹${mrp})` : ''}
                            </p>
                            <div style={{ width: '100%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Code128Barcode value={val} width="auto" height={barcodeH} />
                            </div>
                          </div>
                        );
                      })()}

                      {item.template === 't4' && (() => {
                        const barcodeH = `${Math.max(H * 0.55, 13)}mm`;
                        const val = item.product.barcodeId || deriveBarcodeId(item.product.sku || item.product.id);
                        return (
                          <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'center', boxSizing: 'border-box', padding: '0.8mm 1mm 0.3mm 1mm', lineHeight: '1.1' }}>
                            <p style={{ fontSize: '8.5pt', fontWeight: '900', textTransform: 'uppercase', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%', textAlign: 'center' }}>
                              {item.product.brand} {item.product.name.replace(/ - .*/, '')}
                            </p>
                            <p style={{ fontSize: '10pt', fontWeight: '800', margin: 0, color: 'black', width: '100%', textAlign: 'center' }}>
                              SIZE {item.product.size || '-'}  ₹{sale}
                            </p>
                            <div style={{ width: '100%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Code128Barcode value={val} width="auto" height={barcodeH} />
                            </div>
                          </div>
                        );
                      })()}

                      {item.template === 't5' && (() => {
                        const barcodeH = `${Math.max(H * 0.55, 13)}mm`;
                        const val = item.product.barcodeId || deriveBarcodeId(item.product.sku || item.product.id);
                        return (
                          <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'center', boxSizing: 'border-box', padding: '0.8mm 1mm 0.3mm 1mm', lineHeight: '1.1' }}>
                            <p style={{ fontSize: '8.5pt', fontWeight: '900', textTransform: 'uppercase', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%', textAlign: 'center' }}>
                              {item.product.brand} {item.product.name.replace(/ - .*/, '')}
                            </p>
                            <p style={{ fontSize: '10pt', fontWeight: '800', margin: 0, color: 'black', width: '100%', textAlign: 'center' }}>
                              SIZE {item.product.size || '-'}  ₹{sale}
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

      {/* Dynamic Calibration Wizard Modal */}
      {isWizardOpen && (
        <CalibrationWizard
          calibration={calibration}
          onSave={(updated) => {
            setCalibration(updated);
            saveCalibration(updated);
            const matched = LABEL_PRESETS.find(
              p => p.widthMm === updated.labelWidth &&
                   p.heightMm === updated.labelHeight &&
                   p.columns === updated.columns
            );
            setLabelPreset(matched ? matched.id : 'custom');
            setIsWizardOpen(false);
            triggerAlert('success', 'Calibration saved and applied successfully.');
          }}
          onPrintTest={handlePrintTestPattern}
          onClose={() => setIsWizardOpen(false)}
        />
      )}

    </div>
  );
};
export default BarcodeDesigner;
