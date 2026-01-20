import type { z } from "zod";
/**
 * Standard API error response structure
 * Used by backend error handlers and frontend error interceptors
 */
export declare const apiErrorSchema: z.ZodObject<
  {
    message: z.ZodString;
    code: z.ZodOptional<z.ZodString>;
    issues: z.ZodOptional<z.ZodArray<z.ZodAny, "many">>;
  },
  "strip",
  z.ZodTypeAny,
  {
    message: string;
    issues?: any[] | undefined;
    code?: string | undefined;
  },
  {
    message: string;
    issues?: any[] | undefined;
    code?: string | undefined;
  }
>;
export type ApiError = z.infer<typeof apiErrorSchema>;
/**
 * Pagination query parameters
 */
export declare const paginationSchema: z.ZodObject<
  {
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
  },
  "strip",
  z.ZodTypeAny,
  {
    page: number;
    limit: number;
  },
  {
    page?: number | undefined;
    limit?: number | undefined;
  }
>;
export type Pagination = z.infer<typeof paginationSchema>;
//# sourceMappingURL=common.d.ts.map
