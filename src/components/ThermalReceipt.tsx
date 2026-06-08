import React from 'react';
import { type ReceiptConfig } from './ReceiptTemplateDesigner';

export interface BillItem {
  name: string;
  sku: string;
  quantity: number;
  price: number;
}

export interface BillData {
  id: string;
  date: string;
  cashierName: string;
  items: BillItem[];
  subtotal: number;
  gst: number;
  discount: number;
  total: number;
  paymentMode: string;
  customerName?: string;
  customerPhone?: string;
  loyaltyPointsEarned?: number;
  walletDeducted?: number;
}

interface ThermalReceiptProps {
  bill: BillData | null;
  paperWidth: '58mm' | '80mm';
  config: ReceiptConfig;
}

export const ThermalReceipt: React.FC<ThermalReceiptProps> = ({
  bill,
  paperWidth,
  config
}) => {
  if (!bill) return null;

  const widthClass = paperWidth === '58mm' ? 'w-[58mm]' : 'w-[80mm]';
  const paddingClass = paperWidth === '58mm' ? 'p-1 text-[8px]' : 'p-4 text-[10px]';

  // Generate real UPI Pay link dynamically
  const upiPayLink = `upi://pay?pa=${config.upiId}&pn=A%20Town%20Luxury&am=${bill.total}&cu=INR`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(upiPayLink)}`;

  return (
    <div className="flex justify-center bg-zinc-50 py-4 select-text">
      {/* Printable Area Wrapper */}
      <div 
        id="thermal-receipt-print"
        className={`bg-white text-black font-mono leading-relaxed border border-zinc-200 shadow-2xl ${widthClass} ${paddingClass}`}
        style={{
          boxSizing: 'border-box'
        }}
      >
        <div className="space-y-4">
          {config.blocks.map((block) => {
            
            // 1. BRAND HEADER LOGO
            if (block.id === 'logo-header' && config.showLogo) {
              return (
                <div key={block.id} className="text-center font-bold pb-2 border-b border-dashed border-zinc-400">
                  {/* Monogram logo */}
                  <svg 
                    className="w-10 h-10 mx-auto mb-1.5 text-black" 
                    viewBox="0 0 100 100" 
                    fill="none" 
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <circle cx="50" cy="50" r="46" stroke="black" strokeWidth="3" fill="none" />
                    <circle cx="50" cy="20" r="4" fill="black" />
                    <path d="M48 24 C48 24 47 30 46 32 H54 C53 30 52 24 52 24 Z" fill="black" />
                    <path d="M42 32 L50 44 L47 32 Z" fill="black" />
                    <path d="M58 32 L50 44 L53 32 Z" fill="black" />
                    <path d="M48 44 L52 44 L53 50 L51 75 L49 75 L47 50 Z" fill="black" />
                    <path d="M22 55 C22 42 41 32 41 32 L47 64 L37 84 C31 80 22 70 22 55 Z" fill="black" />
                    <path d="M78 55 C78 42 59 32 59 32 L53 64 L63 84 C69 80 78 70 78 55 Z" fill="black" />
                    <rect x="62" y="55" width="8" height="3.5" transform="rotate(-15 62 55)" fill="white" />
                  </svg>
                  <h1 className={`${paperWidth === '58mm' ? 'text-xs' : 'text-sm'} uppercase tracking-widest font-extrabold`}>
                    {config.storeName}
                  </h1>
                </div>
              );
            }

            // 2. STORE ADDRESS & GSTIN
            if (block.id === 'store-details') {
              const isDetailsActive = config.showAddress || config.showPhone || config.showGSTIN;
              if (!isDetailsActive) return null;
              return (
                <div 
                  key={block.id} 
                  className={`text-center space-y-0.5 pb-2 border-b border-dashed border-zinc-400 leading-tight ${
                    paperWidth === '58mm' ? 'text-[7.5px]' : 'text-[9px]'
                  }`}
                >
                  {config.showAddress && <div>{config.address}</div>}
                  {config.showPhone && <div>Tel: {config.phone}</div>}
                  {config.showGSTIN && <div className="font-extrabold">GSTIN: {config.gstin}</div>}
                </div>
              );
            }

            // 3. INVOICE METADATA
            if (block.id === 'bill-meta') {
              return (
                <div 
                  key={block.id} 
                  className={`pb-2 border-b border-dashed border-zinc-400 space-y-0.5 ${
                    paperWidth === '58mm' ? 'text-[7.5px]' : 'text-[9px]'
                  }`}
                >
                  <div className="flex justify-between">
                    <span>Invoice: <strong className="uppercase">{bill.id}</strong></span>
                  </div>
                  <div className="flex justify-between">
                    <span>Date: {bill.date}</span>
                    <span>Cashier: {bill.cashierName}</span>
                  </div>
                  {(bill.customerName || bill.customerPhone) && (
                    <div className="pt-1.5 border-t border-dotted border-zinc-300 mt-1.5 space-y-0.5">
                      {bill.customerName && <div>Customer: <strong>{bill.customerName}</strong></div>}
                      {bill.customerPhone && <div>Phone: {bill.customerPhone}</div>}
                      {bill.loyaltyPointsEarned !== undefined && bill.loyaltyPointsEarned > 0 && (
                        <div className="text-green-700">★ Loyalty Points Earned: +{bill.loyaltyPointsEarned} pts</div>
                      )}
                    </div>
                  )}
                </div>
              );
            }

            // 4. BILLED PRODUCTS GRID
            if (block.id === 'items-grid') {
              return (
                <div key={block.id} className="pb-2 border-b border-dashed border-zinc-400">
                  <div className="flex justify-between font-extrabold border-b border-zinc-200 pb-1 mb-1.5">
                    <span className="w-1/2">Item Description</span>
                    <span className="w-1/4 text-center">Qty</span>
                    <span className="w-1/4 text-right">Amount</span>
                  </div>
                  <div className="space-y-1">
                    {bill.items.map((item, i) => (
                      <div key={i} className="flex justify-between items-start text-zinc-800 leading-tight">
                        <div className="w-1/2 overflow-hidden">
                          <div className="truncate font-bold">{item.name}</div>
                          <span className="text-[8px] font-mono text-zinc-500 block">{item.sku}</span>
                        </div>
                        <span className="w-1/4 text-center">{item.quantity}</span>
                        <span className="w-1/4 text-right">
                          {item.price.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            }

            // 5. SUBTOTALS & TAXES
            if (block.id === 'payment-summary') {
              return (
                <div 
                  key={block.id} 
                  className={`space-y-1 pb-2 border-b border-dashed border-zinc-400 text-right ${
                    paperWidth === '58mm' ? 'text-[7.5px]' : 'text-[9px]'
                  }`}
                >
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>Rs. {bill.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>GST (18% inclusive):</span>
                    <span>Rs. {bill.gst.toFixed(2)}</span>
                  </div>
                  {bill.discount > 0 && (
                    <div className="flex justify-between text-red-700">
                      <span>Discount Coupon:</span>
                      <span>-Rs. {bill.discount.toFixed(2)}</span>
                    </div>
                  )}
                  {bill.walletDeducted !== undefined && bill.walletDeducted > 0 && (
                    <div className="flex justify-between text-green-700">
                      <span>Wallet Paid:</span>
                      <span>-Rs. {bill.walletDeducted.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-extrabold text-[12px] pt-1.5 border-t border-zinc-200 text-black">
                    <span>Grand Total:</span>
                    <span>Rs. {bill.total.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-[8px] pt-0.5 font-bold text-zinc-600">
                    <span>Payment Method:</span>
                    <span className="uppercase">{bill.paymentMode}</span>
                  </div>
                </div>
              );
            }

            // 6. DYNAMIC UPI PAYMENT QR
            if (block.id === 'upi-qr' && config.showQR && bill.paymentMode.toLowerCase() === 'upi') {
              return (
                <div key={block.id} className="flex flex-col items-center py-2 border-b border-dashed border-zinc-400">
                  <div className="w-24 h-24 bg-white border border-zinc-300 p-1 flex items-center justify-center">
                    <img 
                      src={qrCodeUrl} 
                      alt="UPI Pay QR" 
                      className="w-full h-full"
                    />
                  </div>
                  <span className="text-[8px] text-zinc-500 mt-1 uppercase tracking-wider font-extrabold">
                    Scan to Pay: {config.upiId}
                  </span>
                </div>
              );
            }

            // 7. POLICY & FOOTER GREETINGS
            if (block.id === 'footer-policy') {
              return (
                <div key={block.id} className="text-center space-y-2.5 pt-1">
                  {config.showReturnPolicy && (
                    <div className="border border-dashed border-zinc-300 p-2 rounded text-[7.5px] leading-relaxed text-zinc-700">
                      {config.returnPolicy}
                    </div>
                  )}
                  <div className="whitespace-pre-line font-bold uppercase tracking-wider text-[8px]">
                    {config.footerText}
                  </div>
                  <div className="text-[7px] text-zinc-400 font-mono">
                    Powered by A Town Luxury POS
                  </div>
                </div>
              );
            }

            return null;
          })}
        </div>
      </div>
    </div>
  );
};
