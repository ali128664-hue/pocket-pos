import { z } from 'zod';

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
  password: z
    .string()
    .min(1, 'Password is required')
    .min(6, 'Password must be at least 6 characters long'),
});

export type LoginFormData = z.infer<typeof loginSchema>;

export const signUpSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(1, 'Full name is required')
      .min(2, 'Name must be at least 2 characters'),
    phone: z
      .string()
      .trim()
      .regex(/^(\+92|0)?3[0-9]{9}$/, 'Please enter a valid Pakistani mobile number (e.g., 03001234567)')
      .optional()
      .or(z.literal('')),
    email: z
      .string()
      .trim()
      .min(1, 'Email is required')
      .email('Please enter a valid email address'),
    password: z
      .string()
      .min(1, 'Password is required')
      .min(6, 'Password must be at least 6 characters long'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type SignUpFormData = z.infer<typeof signUpSchema>;

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
});

export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export const shopOnboardingSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Shop name is required')
    .min(2, 'Shop name must be at least 2 characters')
    .max(100, 'Shop name cannot exceed 100 characters'),
  phone: z
    .string()
    .trim()
    .min(1, 'Phone number is required')
    .regex(/^(\+92|0)?3[0-9]{9}$/, 'Please enter a valid Pakistani mobile number (e.g., 03001234567 or +923001234567)'),
  city: z
    .string()
    .trim()
    .min(1, 'City is required')
    .min(2, 'City must be at least 2 characters'),
  address: z.string().trim().optional().or(z.literal('')),
  taxRate: z
    .string()
    .trim()
    .regex(/^([0-9]+(\.[0-9]{1,2})?)?$/, 'Please enter a valid tax rate percentage')
    .refine((val) => !val || (Number(val) >= 0 && Number(val) <= 100), {
      message: 'Tax rate must be between 0% and 100%',
    })
    .default('0'),
  invoicePrefix: z
    .string()
    .trim()
    .min(1, 'Invoice prefix is required')
    .max(10, 'Invoice prefix cannot exceed 10 characters')
    .regex(/^[a-zA-Z0-9-_]+$/, 'Invoice prefix can only contain letters, numbers, hyphens, and underscores')
    .default('INV'),
  logoUri: z.string().nullable().optional(),
});

export type ShopOnboardingFormData = z.infer<typeof shopOnboardingSchema>;

// Phase 4: Product & Category Management Schemas
export const categorySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Category name is required')
    .max(50, 'Category name cannot exceed 50 characters'),
  description: z.string().trim().max(200, 'Description cannot exceed 200 characters').optional().or(z.literal('')),
});

export type CategoryFormData = z.infer<typeof categorySchema>;

export const productSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Product name is required')
    .min(2, 'Product name must be at least 2 characters')
    .max(120, 'Product name cannot exceed 120 characters'),
  sku: z.string().trim().max(50, 'SKU cannot exceed 50 characters').optional().or(z.literal('')),
  barcode: z.string().trim().max(64, 'Barcode cannot exceed 64 characters').optional().or(z.literal('')),
  brand: z.string().trim().max(60, 'Brand cannot exceed 60 characters').optional().or(z.literal('')),
  categoryId: z.string().nullable().optional(),
  description: z.string().trim().max(500, 'Description cannot exceed 500 characters').optional().or(z.literal('')),
  unit: z.string().trim().min(1, 'Unit is required').default('pcs'),
  purchasePrice: z
    .string()
    .trim()
    .min(1, 'Purchase price is required')
    .regex(/^\d+(\.\d{1,2})?$/, 'Please enter a valid amount (e.g. 150.00)')
    .refine((val) => Number(val) >= 0, { message: 'Purchase price cannot be negative' }),
  sellingPrice: z
    .string()
    .trim()
    .min(1, 'Selling price is required')
    .regex(/^\d+(\.\d{1,2})?$/, 'Please enter a valid amount (e.g. 200.00)')
    .refine((val) => Number(val) >= 0, { message: 'Selling price cannot be negative' }),
  currentStock: z
    .string()
    .trim()
    .min(1, 'Current stock is required')
    .regex(/^\d+(\.\d{1,3})?$/, 'Please enter a valid stock quantity')
    .refine((val) => Number(val) >= 0, { message: 'Current stock cannot be negative' }),
  minimumStock: z
    .string()
    .trim()
    .min(1, 'Minimum stock is required')
    .regex(/^\d+(\.\d{1,3})?$/, 'Please enter a valid stock quantity')
    .refine((val) => Number(val) >= 0, { message: 'Minimum stock cannot be negative' }),
  imageUrl: z.string().nullable().optional(),
  isActive: z.boolean().default(true),
});

export type ProductFormData = z.infer<typeof productSchema>;

export const stockAdjustmentSchema = z.object({
  quantityChange: z
    .string()
    .trim()
    .min(1, 'Quantity is required')
    .regex(/^[+-]?\d+(\.\d{1,3})?$/, 'Enter a valid positive or negative number (e.g. +10 or -5)')
    .refine((val) => Number(val) !== 0, { message: 'Adjustment quantity cannot be 0' }),
  movementType: z.enum(['MANUAL_CORRECTION', 'PURCHASE_RECEIPT', 'DAMAGED_EXPIRED', 'RETURN'], {
    message: 'Please select a valid adjustment reason',
  }),
  notes: z.string().trim().max(250, 'Reason/notes cannot exceed 250 characters').optional().or(z.literal('')),
});

export type StockAdjustmentFormData = z.infer<typeof stockAdjustmentSchema>;
