import type { z } from "zod";
/**
 * Order status enum
 */
export declare const orderStatusEnum: z.ZodEnum<["pending", "completed", "failed"]>;
export type OrderStatus = z.infer<typeof orderStatusEnum>;
/**
 * Schema for creating a checkout session
 */
export declare const createCheckoutSchema: z.ZodObject<
  {
    packageId: z.ZodString;
  },
  "strip",
  z.ZodTypeAny,
  {
    packageId: string;
  },
  {
    packageId: string;
  }
>;
export type CreateCheckout = z.infer<typeof createCheckoutSchema>;
/**
 * Order entity schema
 */
export declare const orderSchema: z.ZodObject<
  {
    id: z.ZodString;
    userId: z.ZodString;
    packageId: z.ZodString;
    amount: z.ZodNumber;
    currency: z.ZodString;
    credits: z.ZodNumber;
    status: z.ZodEnum<["pending", "completed", "failed"]>;
    stripeSessionId: z.ZodString;
    createdAt: z.ZodDate;
    updatedAt: z.ZodDate;
  },
  "strip",
  z.ZodTypeAny,
  {
    id: string;
    credits: number;
    createdAt: Date;
    updatedAt: Date;
    userId: string;
    packageId: string;
    amount: number;
    currency: string;
    status: "pending" | "completed" | "failed";
    stripeSessionId: string;
  },
  {
    id: string;
    credits: number;
    createdAt: Date;
    updatedAt: Date;
    userId: string;
    packageId: string;
    amount: number;
    currency: string;
    status: "pending" | "completed" | "failed";
    stripeSessionId: string;
  }
>;
export type Order = z.infer<typeof orderSchema>;
/**
 * Checkout response schema
 */
export declare const checkoutResponseSchema: z.ZodObject<
  {
    checkoutUrl: z.ZodString;
    sessionId: z.ZodString;
  },
  "strip",
  z.ZodTypeAny,
  {
    checkoutUrl: string;
    sessionId: string;
  },
  {
    checkoutUrl: string;
    sessionId: string;
  }
>;
export type CheckoutResponse = z.infer<typeof checkoutResponseSchema>;
/**
 * Orders list response schema
 */
export declare const ordersResponseSchema: z.ZodObject<
  {
    orders: z.ZodArray<
      z.ZodObject<
        {
          id: z.ZodString;
          userId: z.ZodString;
          packageId: z.ZodString;
          amount: z.ZodNumber;
          currency: z.ZodString;
          credits: z.ZodNumber;
          status: z.ZodEnum<["pending", "completed", "failed"]>;
          stripeSessionId: z.ZodString;
          createdAt: z.ZodDate;
          updatedAt: z.ZodDate;
        },
        "strip",
        z.ZodTypeAny,
        {
          id: string;
          credits: number;
          createdAt: Date;
          updatedAt: Date;
          userId: string;
          packageId: string;
          amount: number;
          currency: string;
          status: "pending" | "completed" | "failed";
          stripeSessionId: string;
        },
        {
          id: string;
          credits: number;
          createdAt: Date;
          updatedAt: Date;
          userId: string;
          packageId: string;
          amount: number;
          currency: string;
          status: "pending" | "completed" | "failed";
          stripeSessionId: string;
        }
      >,
      "many"
    >;
  },
  "strip",
  z.ZodTypeAny,
  {
    orders: {
      id: string;
      credits: number;
      createdAt: Date;
      updatedAt: Date;
      userId: string;
      packageId: string;
      amount: number;
      currency: string;
      status: "pending" | "completed" | "failed";
      stripeSessionId: string;
    }[];
  },
  {
    orders: {
      id: string;
      credits: number;
      createdAt: Date;
      updatedAt: Date;
      userId: string;
      packageId: string;
      amount: number;
      currency: string;
      status: "pending" | "completed" | "failed";
      stripeSessionId: string;
    }[];
  }
>;
export type OrdersResponse = z.infer<typeof ordersResponseSchema>;
//# sourceMappingURL=order.d.ts.map
