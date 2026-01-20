import { z } from "zod";

/**
 * Unified API Response Structure
 *
 * All API endpoints return either:
 * - Success: { success: true, data: T }
 * - Error: { success: false, error: { message, code?, issues? } }
 */

/**
 * API error details
 */
export const apiErrorDetailSchema = z.object({
  message: z.string(),
  code: z.string().optional(),
  issues: z.array(z.any()).optional(),
});

export type ApiErrorDetail = z.infer<typeof apiErrorDetailSchema>;

/**
 * Successful API response
 */
export interface ApiSuccess<T> {
  success: true;
  data: T;
}

/**
 * Failed API response
 */
export interface ApiFailure {
  success: false;
  error: ApiErrorDetail;
}

/**
 * Unified API response type
 */
export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

/**
 * Legacy ApiError type (for backward compatibility)
 * @deprecated Use ApiFailure instead
 */
export type ApiError = ApiErrorDetail;

/**
 * Pagination query parameters
 */
export const paginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
});

export type Pagination = z.infer<typeof paginationSchema>;
