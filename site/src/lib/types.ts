import { z } from 'zod';

/**
 * Generic form fill payload schema for MCP form-fillup tool
 */
export const FormFillPayloadSchema = z.object({
  name: z.string(),
  email: z.string().email(),
  message: z.string().optional(),
  meta: z.record(z.string(), z.unknown()).optional(),
});

export type FormFillPayload = z.infer<typeof FormFillPayloadSchema>;

/**
 * Generic form completed payload schema sent back to MCP server
 */
export const FormCompletedPayloadSchema = z.object({
  name: z.string(),
  email: z.string().email(),
  message: z.string().optional(),
  completedAt: z.string(),
  meta: z.record(z.string(), z.unknown()).optional(),
});

export type FormCompletedPayload = z.infer<typeof FormCompletedPayloadSchema>;

/**
 * Booking form fill payload schema for MCP form-fillup tool
 */
export const BookingFormFillPayloadSchema = z.object({
  room_id: z.string().optional(),
  customer_name: z.string(),
  customer_email: z.string().email(),
  customer_phone: z.string(),
  check_in_date: z.string(),
  check_out_date: z.string(),
  guests: z.number().min(1).optional(),
  special_requests: z.string().optional(),
  meta: z.record(z.string(), z.unknown()).optional(),
});

export type BookingFormFillPayload = z.infer<typeof BookingFormFillPayloadSchema>;

/**
 * Booking form completed payload schema sent back to MCP server
 */
export const BookingFormCompletedPayloadSchema = z.object({
  room_id: z.string(),
  customer_name: z.string(),
  customer_email: z.string().email(),
  customer_phone: z.string(),
  check_in_date: z.string(),
  check_out_date: z.string(),
  guests: z.number(),
  special_requests: z.string().optional(),
  total_price: z.number().optional(),
  booking_id: z.string().optional(),
  completedAt: z.string(),
  meta: z.record(z.string(), z.unknown()).optional(),
});

export type BookingFormCompletedPayload = z.infer<typeof BookingFormCompletedPayloadSchema>;
