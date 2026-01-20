import { z } from "zod";
/**
 * Standard API error response structure
 * Used by backend error handlers and frontend error interceptors
 */
export const apiErrorSchema = z.object({
  message: z.string(),
  code: z.string().optional(),
  issues: z.array(z.any()).optional(), // For Zod validation errors
});
/**
 * Pagination query parameters
 */
export const paginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
});
