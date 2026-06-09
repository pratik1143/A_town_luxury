import { type BillData } from '../components/ThermalReceipt';
import { type ReceiptConfig } from '../components/ReceiptTemplateDesigner';

// Helper to pad columns for layout alignment
const padColumns = (leftText: string, rightText: string, totalWidth: number): string => {
  const leftLen = leftText.length;
  const rightLen = rightText.length;
  const spacesNeeded = totalWidth - leftLen - rightLen;
  if (spacesNeeded <= 0) {
    // Truncate left text to make it fit
    const allowedLeftLen = totalWidth - rightLen - 1;
    return leftText.slice(0, allowedLeftLen) + ' ' + rightText;
  }
  return leftText + ' '.repeat(spacesNeeded) + rightText;
};

export const connectUSBPrinter = async (): Promise<any> => {
  // Request user connection to standard Printer class (0x07)
  const device = await (navigator as any).usb.requestDevice({
    filters: [{ classCode: 0x07 }]
  });
  return device;
};

export const printUSBReceipt = async (
  device: any,
  bill: BillData,
  paperWidth: '58mm' | '80mm',
  config: ReceiptConfig
): Promise<void> => {
  const is58mm = paperWidth === '58mm';
  const width = is58mm ? 32 : 48; // Column character widths

  // ESC/POS Commands
  const ESC = '\x1b';
  const GS = '\x1d';
  
  const INIT = ESC + '@';                     // Initialize printer
  const ALIGN_LEFT = ESC + 'a\x00';            // Left alignment
  const ALIGN_CENTER = ESC + 'a\x01';          // Center alignment
  const ALIGN_RIGHT = ESC + 'a\x02';           // Right alignment
  const BOLD_ON = ESC + 'E\x01';               // Bold text ON
  const BOLD_OFF = ESC + 'E\x00';              // Bold text OFF
  const CHAR_NORMAL = GS + '!\x00';            // Normal text size
  const CHAR_DOUBLE = GS + '!\x11';            // Double width & height
  const CUT_PAPER = GS + 'V\x41\x00';           // Feed paper & full cut
  
  const SEPARATOR = '-'.repeat(width) + '\n';

  let commands = '';
  
  // Start formatting commands
  commands += INIT;
  
  // 1. BRAND HEADER LOGO & NAME
  if (config.showLogo) {
    commands += ALIGN_CENTER + BOLD_ON + CHAR_DOUBLE + '\n  A  \n' + CHAR_NORMAL;
    commands += BOLD_ON + config.storeName.toUpperCase() + '\n' + BOLD_OFF;
  } else {
    commands += ALIGN_CENTER + BOLD_ON + CHAR_DOUBLE + config.storeName.toUpperCase() + '\n' + CHAR_NORMAL + BOLD_OFF;
  }

  // 2. STORE ADDRESS & TEL
  commands += ALIGN_CENTER;
  if (config.showAddress) commands += config.address + '\n';
  if (config.showPhone) commands += 'Tel: ' + config.phone + '\n';
  
  commands += SEPARATOR;

  // 3. INVOICE METADATA
  commands += ALIGN_LEFT;
  commands += 'Bill No: ' + bill.id + '\n';
  commands += 'Date   : ' + bill.date + '\n';
  commands += 'Cashier: ' + bill.cashierName + '\n';
  
  commands += SEPARATOR;

  // 4. ITEMS GRID HEADER & ITEMS
  commands += ALIGN_LEFT + BOLD_ON;
  if (is58mm) {
    commands += 'Item            Qty      Price\n';
  } else {
    commands += 'Item Description          Qty       Price       Total\n';
  }
  commands += BOLD_OFF;
  commands += SEPARATOR;

  // Print items list
  bill.items.forEach((item) => {
    const qtyStr = item.quantity.toString();
    const priceStr = item.price.toFixed(0);
    
    if (is58mm) {
      // 32 columns format
      const leftPart = item.name.slice(0, 15);
      const rightPart = `${qtyStr} x Rs.${priceStr}`;
      commands += padColumns(leftPart, rightPart, 32) + '\n';
    } else {
      // 48 columns format
      const totalStr = (item.quantity * item.price).toFixed(2);
      const namePart = item.name.slice(0, 22);
      const columnsLayout = padColumns(namePart, `${qtyStr}  Rs.${priceStr}  Rs.${totalStr}`, 48);
      commands += columnsLayout + '\n';
    }
  });

  commands += SEPARATOR;

  // 5. SUBTOTALS, TAXES, PAY SUMMARY
  commands += ALIGN_RIGHT;
  commands += padColumns('Subtotal:', `Rs. ${bill.subtotal.toFixed(2)}`, width) + '\n';
  if (bill.discount > 0) {
    commands += padColumns('Discount Code:', `-Rs. ${bill.discount.toFixed(2)}`, width) + '\n';
  }
  
  commands += BOLD_ON;
  commands += padColumns('Grand Total:', `Rs. ${bill.total.toFixed(2)}`, width) + '\n';
  commands += BOLD_OFF;
  commands += padColumns('Payment Method:', bill.paymentMode.toUpperCase(), width) + '\n';

  commands += SEPARATOR;

  // 6. POLICY & FOOTER
  commands += ALIGN_CENTER + BOLD_ON;
  commands += config.footerText.toUpperCase() + '\n';
  commands += BOLD_OFF;
  
  if (config.showReturnPolicy) {
    commands += '\n' + ALIGN_LEFT;
    commands += config.returnPolicy + '\n';
  }
  
  commands += ALIGN_CENTER + '\nPowered by A Town Luxury ERP\n\n\n\n\n';
  commands += CUT_PAPER;

  // Convert print characters to Uint8Array
  const encoder = new TextEncoder();
  const data = encoder.encode(commands);

  // USB Device spool sequence
  if (!device.opened) {
    await device.open();
  }
  
  await device.selectConfiguration(1);
  
  // Claim the printer interface (typically 0 or 1)
  const usbInterface = device.configuration?.interfaces.find((i: any) => 
    i.alternate.interfaceClass === 0x07 // Printer class
  ) || device.configuration?.interfaces[0];

  if (!usbInterface) {
    throw new Error('No printer interface detected on this USB hardware.');
  }

  const interfaceNumber = usbInterface.interfaceNumber;
  
  try {
    await device.claimInterface(interfaceNumber);
  } catch (claimErr) {
    console.warn('Interface already claimed or failed claiming. Proceeding...', claimErr);
  }

  // Find the Bulk OUT endpoint
  const endpointOut = usbInterface.alternate.endpoints.find(
    (e: any) => e.direction === 'out' && e.type === 'bulk'
  );

  if (!endpointOut) {
    throw new Error('Could not find bulk OUT write endpoint on this printer.');
  }

  // Transfer binary instructions spooler
  await device.transferOut(endpointOut.endpointNumber, data);
};
