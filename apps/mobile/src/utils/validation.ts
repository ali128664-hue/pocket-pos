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
