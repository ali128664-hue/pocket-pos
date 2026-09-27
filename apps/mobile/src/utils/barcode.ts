/**
 * Barcode normalization and validation utilities for PocketPOS.
 * Supports standard retail symbologies: EAN-13, EAN-8, UPC-A, UPC-E, Code-128, Code-39, ITF-14.
 */

export interface BarcodeValidationResult {
  isValid: boolean;
  normalized: string;
  symbology?: string;
  error?: string;
}

/**
 * Normalizes scanned or manually entered barcode strings:
 * - Removes leading/trailing whitespace
 * - Strips common invisible control characters or line breaks (from hardware HID scanners)
 * - Retains alphanumeric characters and standard symbols (dashes, periods)
 */
export function normalizeBarcode(raw: string | null | undefined): string {
  if (!raw) return '';
  // Strip control characters, carriage returns, newlines, and trim
  return raw.replace(/[\x00-\x1F\x7F]/g, '').trim();
}

/**
 * Detects symbology and validates barcode structure.
 */
export function detectBarcodeSymbology(barcode: string): string {
  const clean = normalizeBarcode(barcode);
  if (/^\d{13}$/.test(clean)) return 'EAN-13';
  if (/^\d{12}$/.test(clean)) return 'UPC-A';
  if (/^\d{8}$/.test(clean)) return 'EAN-8';
  if (/^\d{6,8}$/.test(clean)) return 'UPC-E';
  if (/^\d{14}$/.test(clean)) return 'ITF-14';
  if (/^[A-Z0-9\-\.\ \$\/\+\%]+$/i.test(clean)) {
    return clean.length <= 15 ? 'CODE-39' : 'CODE-128';
  }
  return 'GENERIC';
}

/**
 * Validates barcode for minimum requirements.
 */
export function validateBarcode(raw: string | null | undefined): BarcodeValidationResult {
  const normalized = normalizeBarcode(raw);
  if (!normalized) {
    return {
      isValid: false,
      normalized: '',
      error: 'Barcode cannot be empty',
    };
  }

  if (normalized.length < 3) {
    return {
      isValid: false,
      normalized,
      error: 'Barcode must be at least 3 characters',
    };
  }

  if (normalized.length > 64) {
    return {
      isValid: false,
      normalized,
      error: 'Barcode must not exceed 64 characters',
    };
  }

  return {
    isValid: true,
    normalized,
    symbology: detectBarcodeSymbology(normalized),
  };
}

/**
 * Formats barcode for presentation (e.g. adding grouping spaces for EAN-13: 896 1234 56789 0)
 */
export function formatBarcodeDisplay(barcode: string): string {
  const clean = normalizeBarcode(barcode);
  if (/^\d{13}$/.test(clean)) {
    // EAN-13: 1-6-6 or 3-4-5-1 format
    return `${clean.slice(0, 3)} ${clean.slice(3, 7)} ${clean.slice(7, 12)} ${clean.slice(12)}`;
  }
  if (/^\d{12}$/.test(clean)) {
    // UPC-A: 1-5-5-1
    return `${clean.slice(0, 1)} ${clean.slice(1, 6)} ${clean.slice(6, 11)} ${clean.slice(11)}`;
  }
  return clean;
}
