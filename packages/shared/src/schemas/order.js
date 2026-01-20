import { z } from "zod";
/**
 * Order status enum
 */
export const orderStatusEnum = z.enum(["pending", "completed", "failed"]);
/**
 * Schema for creating a checkout session
 */
export const createCheckoutSchema = z.object({
  packageId: z.string().min(1, "Package ID is required"),
});
/**
 * Order entity schema
 */
export const orderSchema = z.object({
  id: z.string().uuid(),
  userId: z.string(),
  packageId: z.string(),
  amount: z.number().int().positive(), // Amount in cents
  currency: z.string(),
  credits: z.number().int().positive(),
  status: orderStatusEnum,
  stripeSessionId: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
/**
 * Checkout response schema
 */
export const checkoutResponseSchema = z.object({
  checkoutUrl: z.string().url(),
  sessionId: z.string(),
});
/**
 * Orders list response schema
 */
export const ordersResponseSchema = z.object({
  orders: z.array(orderSchema),
});
