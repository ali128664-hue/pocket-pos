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
