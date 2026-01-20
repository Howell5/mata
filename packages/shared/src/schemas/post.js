import { z } from "zod";
/**
 * Schema for creating a new post
 * Shared between backend validation and frontend forms
 */
export const createPostSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title must be less than 200 characters"),
  content: z.string().min(1, "Content is required"),
});
/**
 * Schema for updating a post
 */
export const updatePostSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.string().min(1).optional(),
});
/**
 * Schema for post ID parameter
 */
export const postIdSchema = z.object({
  id: z.string().uuid(),
});
