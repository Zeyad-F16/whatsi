import { z } from 'zod';
import { parsePhoneNumberFromString } from 'libphonenumber-js';

export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Invalid email format').max(255),
  phone: z.string().refine((val) => {
    const phoneNumber = parsePhoneNumberFromString(val);
    return phoneNumber ? phoneNumber.isValid() : false;
  }, 'Invalid phone number format'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[\W_0-9]/, 'Password must contain at least one number or special character')
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required')
});

export const adminLoginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required')
});
