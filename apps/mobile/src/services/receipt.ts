import { Linking, Share, Platform } from 'react-native';
import {
  generateReceiptText,
  normalizePakistanPhone,
  ReceiptData,
  ReceiptItem,
  ReceiptPayment,
} from './receiptFormat';

export type { ReceiptData, ReceiptItem, ReceiptPayment };
export { generateReceiptText, normalizePakistanPhone };

/**
 * Triggers receipt sharing via WhatsApp with automatic fallback to native Share sheet.
 */
export async function shareReceiptViaWhatsApp(params: {
  phone?: string | null;
  receiptText: string;
}): Promise<boolean> {
  const { phone, receiptText } = params;
  const encodedText = encodeURIComponent(receiptText);
  const normalizedPhone = normalizePakistanPhone(phone);

  const whatsappUrl = normalizedPhone
    ? `whatsapp://send?phone=${normalizedPhone}&text=${encodedText}`
    : `whatsapp://send?text=${encodedText}`;

  try {
    const supported = await Linking.canOpenURL(whatsappUrl);
    if (supported) {
      await Linking.openURL(whatsappUrl);
      return true;
    } else {
      // Fallback to web link or native share sheet
      const webUrl = normalizedPhone
        ? `https://wa.me/${normalizedPhone}?text=${encodedText}`
        : `https://wa.me/?text=${encodedText}`;
      const canWeb = await Linking.canOpenURL(webUrl);
      if (canWeb && Platform.OS !== 'web') {
        await Share.share({
          message: receiptText,
          title: 'PocketPOS Digital Receipt',
        });
        return true;
      }
      await Share.share({
        message: receiptText,
        title: 'PocketPOS Digital Receipt',
      });
      return true;
    }
  } catch {
    try {
      await Share.share({
        message: receiptText,
        title: 'PocketPOS Digital Receipt',
      });
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * General native share sheet for digital receipts (AirDrop, SMS, Email, etc.)
 */
export async function shareReceiptGeneral(receiptText: string): Promise<boolean> {
  try {
    await Share.share({
      message: receiptText,
      title: 'PocketPOS Digital Receipt',
    });
    return true;
  } catch {
    return false;
  }
}
