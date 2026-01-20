import { z } from "zod";

/**
 * Sandbox state enum
 */
export const sandboxStateSchema = z.enum(["creating", "running", "paused", "terminated"]);
export type SandboxState = z.infer<typeof sandboxStateSchema>;

/**
 * Project creation schema
 */
export const createProjectSchema = z.object({
  name: z.string().min(1, "Project name is required").max(100, "Project name too long"),
  description: z.string().max(500, "Description too long").optional(),
});
export type CreateProject = z.infer<typeof createProjectSchema>;

/**
 * Project update schema
 */
export const updateProjectSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
});
export type UpdateProject = z.infer<typeof updateProjectSchema>;

/**
 * Project ID schema for path params
 */
export const projectIdSchema = z.object({
  id: z.string().uuid("Invalid project ID"),
});
export type ProjectId = z.infer<typeof projectIdSchema>;

/**
 * Project schema (full response)
 */
export const projectSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  userId: z.string(),
  sandboxState: sandboxStateSchema.nullable(),
  previewUrl: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type Project = z.infer<typeof projectSchema>;

/**
 * Project with sandbox info
 */
export const projectWithSandboxSchema = projectSchema.extend({
  sandbox: z
    .object({
      id: z.string(),
      state: sandboxStateSchema,
      previewUrl: z.string().nullable(),
      agentSessionId: z.string().nullable(),
      lastActiveAt: z.string().datetime(),
    })
    .nullable(),
});
export type ProjectWithSandbox = z.infer<typeof projectWithSandboxSchema>;
