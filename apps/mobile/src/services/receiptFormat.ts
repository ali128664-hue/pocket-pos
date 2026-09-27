export interface ReceiptItem {
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface ReceiptPayment {
  method: string;
  amount: number;
  reference?: string | null;
}

export interface ReceiptData {
  shopName: string;
  shopAddress?: string | null;
  shopPhone?: string | null;
  invoiceNumber: string;
  date: string | Date;
  customerName?: string | null;
  customerPhone?: string | null;
  items?: ReceiptItem[];
  subtotal: number;
  discount?: number;
  tax?: number;
  total: number;
  paidAmount: number;
  creditAmount?: number;
  customerBalance?: number;
  notes?: string | null;
}

/**
 * Formats a clean, human-readable plain text digital receipt
 * optimized for WhatsApp, SMS, and standard text sharing.
 */
export function generateReceiptText(data: ReceiptData): string {
  const lineDivider = '--------------------------------';
  const doubleDivider = '================================';

  const dateStr =
    data.date instanceof Date
      ? data.date.toLocaleString('en-PK', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : data.date;

  const lines: string[] = [];

  // Shop Header
  lines.push(`*${data.shopName.toUpperCase()}*`);
  if (data.shopAddress) lines.push(data.shopAddress);
  if (data.shopPhone) lines.push(`Tel: ${data.shopPhone}`);
  lines.push(doubleDivider);

  // Invoice & Date
  lines.push(`Invoice: ${data.invoiceNumber}`);
  lines.push(`Date: ${dateStr}`);

  // Customer Info
  if (data.customerName) {
    let custLine = `Customer: ${data.customerName}`;
    if (data.customerPhone) custLine += ` (${data.customerPhone})`;
    lines.push(custLine);
  }

  lines.push(lineDivider);

  // Line Items
  if (data.items && data.items.length > 0) {
    data.items.forEach((item) => {
      const itemHeader = `${item.name}`;
      const itemDetail = `  ${item.quantity} x Rs. ${item.unitPrice.toLocaleString('en-PK')} = Rs. ${item.total.toLocaleString('en-PK')}`;
      lines.push(itemHeader);
      lines.push(itemDetail);
    });
    lines.push(lineDivider);
  }

  // Totals
  lines.push(`Subtotal: Rs. ${data.subtotal.toLocaleString('en-PK')}`);
  if (data.discount && data.discount > 0) {
    lines.push(`Discount: - Rs. ${data.discount.toLocaleString('en-PK')}`);
  }
  if (data.tax && data.tax > 0) {
    lines.push(`Tax: + Rs. ${data.tax.toLocaleString('en-PK')}`);
  }
  lines.push(`*TOTAL: Rs. ${data.total.toLocaleString('en-PK')}*`);

  // Payment Breakdown
  lines.push(lineDivider);
  lines.push(`Paid Amount: Rs. ${data.paidAmount.toLocaleString('en-PK')}`);

  if (data.creditAmount && data.creditAmount > 0) {
    lines.push(`*Added to Udhaar: Rs. ${data.creditAmount.toLocaleString('en-PK')}*`);
  }

  if (data.customerBalance !== undefined && data.customerBalance > 0) {
    lines.push(`Total Remaining Balance: Rs. ${data.customerBalance.toLocaleString('en-PK')}`);
  }

  if (data.notes) {
    lines.push(lineDivider);
    lines.push(`Note: ${data.notes}`);
  }

  // Footer / Thank You Note
  lines.push(doubleDivider);
  lines.push('Thank you for your business!');
  lines.push('Powered by PocketPOS');

  return lines.join('\n');
}

/**
 * Normalizes a Pakistani phone number for WhatsApp URL.
 * e.g., '03001234567' -> '923001234567'
 */
export function normalizePakistanPhone(phone?: string | null): string {
  if (!phone) return '';
  let clean = phone.replace(/[^0-9+]/g, '');
  if (clean.startsWith('+')) {
    clean = clean.substring(1);
  } else if (clean.startsWith('0')) {
    clean = '92' + clean.substring(1);
  }
  return clean;
}
