import { zValidator } from "@hono/zod-validator";
import { projectIdSchema } from "@repo/shared";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { auth } from "../auth";
import { db } from "../db";
import { projects, sandboxes } from "../db/schema";
import { errors, ok } from "../lib/response";
import { SandboxManager } from "../services/sandbox.service";

// Validation schemas for sandbox operations
const filePathSchema = z.object({
  path: z.string().min(1, "Path is required"),
});

const writeFileSchema = z.object({
  path: z.string().min(1, "Path is required"),
  content: z.string(),
});

const executeCommandSchema = z.object({
  command: z.string().min(1, "Command is required"),
  cwd: z.string().optional(),
  envs: z.record(z.string()).optional(),
  timeoutMs: z.number().positive().optional(),
});

const sandboxIdSchema = z.object({
  sandboxId: z.string().min(1, "Sandbox ID is required"),
});

/**
 * Helper to verify sandbox ownership
 */
async function verifySandboxOwnership(
  sandboxId: string,
  userId: string,
): Promise<{ error: string | null; sandbox: typeof sandboxes.$inferSelect | null }> {
  const sandboxRecord = await db.query.sandboxes.findFirst({
    where: eq(sandboxes.id, sandboxId),
    with: {
      project: true,
    },
  });

  if (!sandboxRecord) {
    return { error: "Sandbox not found", sandbox: null };
  }

  if (sandboxRecord.project.userId !== userId) {
    return { error: "forbidden", sandbox: null };
  }

  return { error: null, sandbox: sandboxRecord };
}

const sandboxRoute = new Hono()
  /**
   * POST /sandbox/project/:id/start
   * Start or resume a sandbox for a project
   */
  .post("/project/:id/start", zValidator("param", projectIdSchema), async (c) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session) {
      return errors.unauthorized(c);
    }

    const { id: projectId } = c.req.valid("param");

    // Verify project ownership
    const project = await db.query.projects.findFirst({
      where: eq(projects.id, projectId),
    });

    if (!project) {
      return errors.notFound(c, "Project not found");
    }

    if (project.userId !== session.user.id) {
      return errors.forbidden(c);
    }

    try {
      const sandboxInfo = await SandboxManager.ensureRunning(projectId);
      return ok(c, sandboxInfo);
    } catch (error) {
      console.error("[Sandbox] Failed to start sandbox:", error);
      return errors.internal(c);
    }
  })

  /**
   * POST /sandbox/:sandboxId/pause
   * Pause a running sandbox
   */
  .post("/:sandboxId/pause", zValidator("param", sandboxIdSchema), async (c) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session) {
      return errors.unauthorized(c);
    }

    const { sandboxId } = c.req.valid("param");

    const { error } = await verifySandboxOwnership(sandboxId, session.user.id);
    if (error === "Sandbox not found") {
      return errors.notFound(c, error);
    }
    if (error === "forbidden") {
      return errors.forbidden(c);
    }

    try {
      await SandboxManager.pause(sandboxId);
      return ok(c, { message: "Sandbox paused successfully" });
    } catch (error) {
      console.error("[Sandbox] Failed to pause sandbox:", error);
      return errors.internal(c);
    }
  })

  /**
   * POST /sandbox/:sandboxId/terminate
   * Terminate a sandbox completely
   */
  .post("/:sandboxId/terminate", zValidator("param", sandboxIdSchema), async (c) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session) {
      return errors.unauthorized(c);
    }

    const { sandboxId } = c.req.valid("param");

    const { error } = await verifySandboxOwnership(sandboxId, session.user.id);
    if (error === "Sandbox not found") {
      return errors.notFound(c, error);
    }
    if (error === "forbidden") {
      return errors.forbidden(c);
    }

    try {
      await SandboxManager.terminate(sandboxId);
      return ok(c, { message: "Sandbox terminated successfully" });
    } catch (error) {
      console.error("[Sandbox] Failed to terminate sandbox:", error);
      return errors.internal(c);
    }
  })

  /**
   * GET /sandbox/:sandboxId/files
   * List files in a sandbox directory
   */
  .get("/:sandboxId/files", zValidator("param", sandboxIdSchema), async (c) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session) {
      return errors.unauthorized(c);
    }

    const { sandboxId } = c.req.valid("param");
    const path = c.req.query("path") || "/";

    const { error, sandbox } = await verifySandboxOwnership(sandboxId, session.user.id);
    if (error === "Sandbox not found") {
      return errors.notFound(c, error);
    }
    if (error === "forbidden") {
      return errors.forbidden(c);
    }

    if (sandbox?.state !== "running") {
      return errors.badRequest(c, "Sandbox is not running");
    }

    try {
      const files = await SandboxManager.listFiles(sandboxId, path);
      return ok(c, { files, path });
    } catch (error) {
      console.error("[Sandbox] Failed to list files:", error);
      return errors.internal(c);
    }
  })

  /**
   * GET /sandbox/:sandboxId/file
   * Read a file from sandbox
   */
  .get("/:sandboxId/file", zValidator("param", sandboxIdSchema), async (c) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session) {
      return errors.unauthorized(c);
    }

    const { sandboxId } = c.req.valid("param");
    const path = c.req.query("path");

    if (!path) {
      return errors.badRequest(c, "Path query parameter is required");
    }

    const { error, sandbox } = await verifySandboxOwnership(sandboxId, session.user.id);
    if (error === "Sandbox not found") {
      return errors.notFound(c, error);
    }
    if (error === "forbidden") {
      return errors.forbidden(c);
    }

    if (sandbox?.state !== "running") {
      return errors.badRequest(c, "Sandbox is not running");
    }

    try {
      const content = await SandboxManager.readFile(sandboxId, path);
      return ok(c, { path, content });
    } catch (error) {
      console.error("[Sandbox] Failed to read file:", error);
      return errors.notFound(c, "File not found or cannot be read");
    }
  })

  /**
   * POST /sandbox/:sandboxId/file
   * Write a file to sandbox
   */
  .post(
    "/:sandboxId/file",
    zValidator("param", sandboxIdSchema),
    zValidator("json", writeFileSchema),
    async (c) => {
      const session = await auth.api.getSession({ headers: c.req.raw.headers });
      if (!session) {
        return errors.unauthorized(c);
      }

      const { sandboxId } = c.req.valid("param");
      const { path, content } = c.req.valid("json");

      const { error, sandbox } = await verifySandboxOwnership(sandboxId, session.user.id);
      if (error === "Sandbox not found") {
        return errors.notFound(c, error);
      }
      if (error === "forbidden") {
        return errors.forbidden(c);
      }

      if (sandbox?.state !== "running") {
        return errors.badRequest(c, "Sandbox is not running");
      }

      try {
        await SandboxManager.writeFile(sandboxId, path, content);
        return ok(c, { message: "File written successfully", path });
      } catch (error) {
        console.error("[Sandbox] Failed to write file:", error);
        return errors.internal(c);
      }
    },
  )

  /**
   * DELETE /sandbox/:sandboxId/file
   * Delete a file from sandbox
   */
  .delete("/:sandboxId/file", zValidator("param", sandboxIdSchema), async (c) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session) {
      return errors.unauthorized(c);
    }

    const { sandboxId } = c.req.valid("param");
    const path = c.req.query("path");

    if (!path) {
      return errors.badRequest(c, "Path query parameter is required");
    }

    const { error, sandbox } = await verifySandboxOwnership(sandboxId, session.user.id);
    if (error === "Sandbox not found") {
      return errors.notFound(c, error);
    }
    if (error === "forbidden") {
      return errors.forbidden(c);
    }

    if (sandbox?.state !== "running") {
      return errors.badRequest(c, "Sandbox is not running");
    }

    try {
      await SandboxManager.deleteFile(sandboxId, path);
      return ok(c, { message: "File deleted successfully", path });
    } catch (error) {
      console.error("[Sandbox] Failed to delete file:", error);
      return errors.internal(c);
    }
  })

  /**
   * POST /sandbox/:sandboxId/directory
   * Create a directory in sandbox
   */
  .post(
    "/:sandboxId/directory",
    zValidator("param", sandboxIdSchema),
    zValidator("json", filePathSchema),
    async (c) => {
      const session = await auth.api.getSession({ headers: c.req.raw.headers });
      if (!session) {
        return errors.unauthorized(c);
      }

      const { sandboxId } = c.req.valid("param");
      const { path } = c.req.valid("json");

      const { error, sandbox } = await verifySandboxOwnership(sandboxId, session.user.id);
      if (error === "Sandbox not found") {
        return errors.notFound(c, error);
      }
      if (error === "forbidden") {
        return errors.forbidden(c);
      }

      if (sandbox?.state !== "running") {
        return errors.badRequest(c, "Sandbox is not running");
      }

      try {
        await SandboxManager.createDirectory(sandboxId, path);
        return ok(c, { message: "Directory created successfully", path });
      } catch (error) {
        console.error("[Sandbox] Failed to create directory:", error);
        return errors.internal(c);
      }
    },
  )

  /**
   * POST /sandbox/:sandboxId/execute
   * Execute a command in sandbox
   */
  .post(
    "/:sandboxId/execute",
    zValidator("param", sandboxIdSchema),
    zValidator("json", executeCommandSchema),
    async (c) => {
      const session = await auth.api.getSession({ headers: c.req.raw.headers });
      if (!session) {
        return errors.unauthorized(c);
      }

      const { sandboxId } = c.req.valid("param");
      const { command, cwd, envs, timeoutMs } = c.req.valid("json");

      const { error, sandbox } = await verifySandboxOwnership(sandboxId, session.user.id);
      if (error === "Sandbox not found") {
        return errors.notFound(c, error);
      }
      if (error === "forbidden") {
        return errors.forbidden(c);
      }

      if (sandbox?.state !== "running") {
        return errors.badRequest(c, "Sandbox is not running");
      }

      try {
        const result = await SandboxManager.executeCommand(sandboxId, command, {
          cwd,
          envs,
          timeoutMs,
        });
        return ok(c, result);
      } catch (error) {
        console.error("[Sandbox] Failed to execute command:", error);
        return errors.internal(c);
      }
    },
  )

  /**
   * GET /sandbox/:sandboxId/preview
   * Get preview URL for a port
   */
  .get("/:sandboxId/preview", zValidator("param", sandboxIdSchema), async (c) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session) {
      return errors.unauthorized(c);
    }

    const { sandboxId } = c.req.valid("param");
    const portStr = c.req.query("port");

    if (!portStr) {
      return errors.badRequest(c, "Port query parameter is required");
    }

    const port = Number.parseInt(portStr, 10);
    if (Number.isNaN(port) || port < 1 || port > 65535) {
      return errors.badRequest(c, "Invalid port number");
    }

    const { error, sandbox } = await verifySandboxOwnership(sandboxId, session.user.id);
    if (error === "Sandbox not found") {
      return errors.notFound(c, error);
    }
    if (error === "forbidden") {
      return errors.forbidden(c);
    }

    if (sandbox?.state !== "running") {
      return errors.badRequest(c, "Sandbox is not running");
    }

    try {
      const hostUrl = await SandboxManager.getHostUrl(sandboxId, port);
      // Update preview URL in database
      await SandboxManager.updatePreviewUrl(sandboxId, hostUrl);
      return ok(c, { port, url: hostUrl });
    } catch (error) {
      console.error("[Sandbox] Failed to get host URL:", error);
      return errors.internal(c);
    }
  });

export default sandboxRoute;
