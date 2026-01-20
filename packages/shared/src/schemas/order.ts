import { z } from "zod";

/**
 * Order status enum
 */
export const orderStatusEnum = z.enum(["pending", "completed", "failed"]);
export type OrderStatus = z.infer<typeof orderStatusEnum>;

/**
 * Schema for creating a checkout session
 */
export const createCheckoutSchema = z.object({
  packageId: z.string().min(1, "Package ID is required"),
});

export type CreateCheckout = z.infer<typeof createCheckoutSchema>;

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

export type Order = z.infer<typeof orderSchema>;

/**
 * Checkout response schema
 */
export const checkoutResponseSchema = z.object({
  checkoutUrl: z.string().url(),
  sessionId: z.string(),
});

export type CheckoutResponse = z.infer<typeof checkoutResponseSchema>;

/**
 * Orders list response schema
 */
export const ordersResponseSchema = z.object({
  orders: z.array(orderSchema),
});

export type OrdersResponse = z.infer<typeof ordersResponseSchema>;
