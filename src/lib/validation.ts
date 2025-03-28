import { z } from 'zod';

// Adjust the phone regex to be more lenient
const phoneRegex = /^\+?[0-9\-\(\)\s]{7,20}$/;

export const locationSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  streetAddress: z.string().min(1, 'Street address is required'),
  country: z.string().min(1, 'Country is required'),
  state: z.string().min(1, 'State/Province is required'),
  city: z.string().min(1, 'City is required'),
  date: z.string().min(1, 'Date is required'),
  time: z.string().min(1, 'Time is required'),
  specialInstructions: z.string().optional(),
});

export const orderFormSchema = z.object({
  customerName: z.string().min(2, 'Customer name must be at least 2 characters'),
  customerAddress: z.string().min(5, 'Customer address must be at least 5 characters'),
  contactPerson: z.string().min(2, 'Contact person must be at least 2 characters'),
  phoneNumber: z.string()
    .regex(phoneRegex, 'Invalid phone number format. Please enter a valid phone number')
    .min(7, 'Phone number must be at least 7 digits'),
  loadTenderNumber: z.string().min(1, 'Load tender number is required'),
  rate: z.string()
    .min(1, 'Rate is required')
    .refine((val) => !isNaN(Number(val)), 'Rate must be a valid number')
    .refine((val) => Number(val) > 0, 'Rate must be greater than 0'),
  currency: z.enum(['CAD', 'USD']),
  commodity: z.string().min(2, 'Commodity must be at least 2 characters'),
  weight: z.string()
    .min(1, 'Weight is required')
    .refine((val) => !isNaN(Number(val)), 'Weight must be a valid number')
    .refine((val) => Number(val) > 0, 'Weight must be greater than 0'),
  referenceNumber: z.string().optional(),
  pickupLocations: z.array(locationSchema).min(1, 'At least one pickup location is required'),
  deliveryLocations: z.array(locationSchema).min(1, 'At least one delivery location is required'),
});