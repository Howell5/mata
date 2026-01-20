import type { z } from "zod";
/**
 * Schema for creating a new post
 * Shared between backend validation and frontend forms
 */
export declare const createPostSchema: z.ZodObject<
  {
    title: z.ZodString;
    content: z.ZodString;
  },
  "strip",
  z.ZodTypeAny,
  {
    title: string;
    content: string;
  },
  {
    title: string;
    content: string;
  }
>;
export type CreatePost = z.infer<typeof createPostSchema>;
/**
 * Schema for updating a post
 */
export declare const updatePostSchema: z.ZodObject<
  {
    title: z.ZodOptional<z.ZodString>;
    content: z.ZodOptional<z.ZodString>;
  },
  "strip",
  z.ZodTypeAny,
  {
    title?: string | undefined;
    content?: string | undefined;
  },
  {
    title?: string | undefined;
    content?: string | undefined;
  }
>;
export type UpdatePost = z.infer<typeof updatePostSchema>;
/**
 * Schema for post ID parameter
 */
export declare const postIdSchema: z.ZodObject<
  {
    id: z.ZodString;
  },
  "strip",
  z.ZodTypeAny,
  {
    id: string;
  },
  {
    id: string;
  }
>;
export type PostId = z.infer<typeof postIdSchema>;
//# sourceMappingURL=post.d.ts.map
