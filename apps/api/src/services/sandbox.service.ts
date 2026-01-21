import { Sandbox } from "e2b";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { projects, sandboxes, type SandboxState } from "../db/schema";
import { validateEnv } from "../env";

// Lazy env validation - only validate when actually needed
let _env: ReturnType<typeof validateEnv> | null = null;
function getEnv() {
  if (!_env) {
    _env = validateEnv();
  }
  return _env;
}

/**
 * File node representation for file tree
 */
export interface FileNode {
  name: string;
  path: string;
  isDir: boolean;
  children?: FileNode[];
}

/**
 * Sandbox info returned to clients
 */
export interface SandboxInfo {
  id: string;
  projectId: string;
  state: SandboxState;
  previewUrl: string | null;
  agentSessionId: string | null;
  lastActiveAt: Date;
}

/**
 * Command execution result
 */
export interface CommandResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

/**
 * Active sandbox instances cache
 * Maps sandbox ID to E2B Sandbox instance
 */
const activeSandboxes = new Map<string, Sandbox>();

/**
 * SandboxManager handles E2B sandbox lifecycle operations
 */
export class SandboxManager {
  /**
   * Get E2B API key from environment
   */
  private static getApiKey(): string {
    const apiKey = getEnv().E2B_API_KEY;
    if (!apiKey) {
      throw new Error("E2B_API_KEY is not configured");
    }
    return apiKey;
  }

  /**
   * Create a new sandbox for a project
   */
  static async create(projectId: string): Promise<SandboxInfo> {
    // Check if project exists
    const project = await db.query.projects.findFirst({
      where: eq(projects.id, projectId),
    });

    if (!project) {
      throw new Error("Project not found");
    }

    // Check if sandbox already exists
    const existingSandbox = await db.query.sandboxes.findFirst({
      where: eq(sandboxes.projectId, projectId),
    });

    if (existingSandbox && existingSandbox.state !== "terminated") {
      throw new Error("Sandbox already exists for this project");
    }

    // Create E2B sandbox
    const sandbox = await Sandbox.create({
      apiKey: this.getApiKey(),
      timeoutMs: 300000, // 5 minutes default timeout
      metadata: {
        projectId,
      },
    });

    // Store in active cache
    activeSandboxes.set(sandbox.sandboxId, sandbox);

    // Save to database
    const [sandboxRecord] = await db
      .insert(sandboxes)
      .values({
        id: sandbox.sandboxId,
        projectId,
        state: "running",
        previewUrl: null,
        agentSessionId: null,
        lastActiveAt: new Date(),
      })
      .onConflictDoUpdate({
        target: sandboxes.projectId,
        set: {
          id: sandbox.sandboxId,
          state: "running",
          previewUrl: null,
          lastActiveAt: new Date(),
        },
      })
      .returning();

    return {
      id: sandboxRecord.id,
      projectId: sandboxRecord.projectId,
      state: sandboxRecord.state,
      previewUrl: sandboxRecord.previewUrl,
      agentSessionId: sandboxRecord.agentSessionId,
      lastActiveAt: sandboxRecord.lastActiveAt,
    };
  }

  /**
   * Ensure a sandbox is running for a project
   * Creates new one if not exists, resumes if paused
   */
  static async ensureRunning(projectId: string): Promise<SandboxInfo> {
    const sandboxRecord = await db.query.sandboxes.findFirst({
      where: eq(sandboxes.projectId, projectId),
    });

    // No sandbox exists, create one
    if (!sandboxRecord || sandboxRecord.state === "terminated") {
      return this.create(projectId);
    }

    // Sandbox is paused, resume it
    if (sandboxRecord.state === "paused") {
      return this.resume(sandboxRecord.id);
    }

    // Sandbox is creating or running
    if (sandboxRecord.state === "creating" || sandboxRecord.state === "running") {
      // Try to connect to verify it's actually running
      try {
        const sandbox = await this.getSandboxInstance(sandboxRecord.id);
        const isRunning = await sandbox.isRunning();

        if (!isRunning) {
          // Sandbox died unexpectedly, create new one
          await this.terminate(sandboxRecord.id);
          return this.create(projectId);
        }

        // Update last active time
        await db
          .update(sandboxes)
          .set({ lastActiveAt: new Date() })
          .where(eq(sandboxes.id, sandboxRecord.id));

        return {
          id: sandboxRecord.id,
          projectId: sandboxRecord.projectId,
          state: "running",
          previewUrl: sandboxRecord.previewUrl,
          agentSessionId: sandboxRecord.agentSessionId,
          lastActiveAt: new Date(),
        };
      } catch {
        // Connection failed, create new sandbox
        return this.create(projectId);
      }
    }

    throw new Error(`Unknown sandbox state: ${sandboxRecord.state}`);
  }

  /**
   * Get or connect to an E2B sandbox instance
   */
  static async getSandboxInstance(sandboxId: string): Promise<Sandbox> {
    // Check cache first
    let sandbox = activeSandboxes.get(sandboxId);

    if (!sandbox) {
      // Connect to existing sandbox
      sandbox = await Sandbox.connect(sandboxId, {
        apiKey: this.getApiKey(),
      });
      activeSandboxes.set(sandboxId, sandbox);
    }

    return sandbox;
  }

  /**
   * Pause a sandbox (save state for later resumption)
   */
  static async pause(sandboxId: string): Promise<void> {
    const sandboxRecord = await db.query.sandboxes.findFirst({
      where: eq(sandboxes.id, sandboxId),
    });

    if (!sandboxRecord) {
      throw new Error("Sandbox not found");
    }

    if (sandboxRecord.state !== "running") {
      throw new Error(`Cannot pause sandbox in state: ${sandboxRecord.state}`);
    }

    // Get sandbox instance
    const sandbox = await this.getSandboxInstance(sandboxId);

    // Pause the sandbox using E2B beta API
    await sandbox.betaPause();

    // Remove from active cache
    activeSandboxes.delete(sandboxId);

    // Update database
    await db
      .update(sandboxes)
      .set({
        state: "paused",
        lastActiveAt: new Date(),
      })
      .where(eq(sandboxes.id, sandboxId));
  }

  /**
   * Resume a paused sandbox
   */
  static async resume(sandboxId: string): Promise<SandboxInfo> {
    const sandboxRecord = await db.query.sandboxes.findFirst({
      where: eq(sandboxes.id, sandboxId),
    });

    if (!sandboxRecord) {
      throw new Error("Sandbox not found");
    }

    if (sandboxRecord.state !== "paused") {
      throw new Error(`Cannot resume sandbox in state: ${sandboxRecord.state}`);
    }

    // Connect to sandbox (automatically resumes if paused)
    const sandbox = await Sandbox.connect(sandboxId, {
      apiKey: this.getApiKey(),
    });

    // Store in cache
    activeSandboxes.set(sandboxId, sandbox);

    // Update database
    const [updated] = await db
      .update(sandboxes)
      .set({
        state: "running",
        lastActiveAt: new Date(),
      })
      .where(eq(sandboxes.id, sandboxId))
      .returning();

    return {
      id: updated.id,
      projectId: updated.projectId,
      state: updated.state,
      previewUrl: updated.previewUrl,
      agentSessionId: updated.agentSessionId,
      lastActiveAt: updated.lastActiveAt,
    };
  }

  /**
   * Terminate a sandbox completely
   */
  static async terminate(sandboxId: string): Promise<void> {
    const sandboxRecord = await db.query.sandboxes.findFirst({
      where: eq(sandboxes.id, sandboxId),
    });

    if (!sandboxRecord) {
      return; // Already doesn't exist
    }

    try {
      // Try to kill the E2B sandbox
      await Sandbox.kill(sandboxId, {
        apiKey: this.getApiKey(),
      });
    } catch {
      // Sandbox may already be dead, continue
    }

    // Remove from cache
    activeSandboxes.delete(sandboxId);

    // Update database
    await db
      .update(sandboxes)
      .set({ state: "terminated" })
      .where(eq(sandboxes.id, sandboxId));
  }

  /**
   * Get sandbox info from database
   */
  static async getInfo(projectId: string): Promise<SandboxInfo | null> {
    const sandboxRecord = await db.query.sandboxes.findFirst({
      where: eq(sandboxes.projectId, projectId),
    });

    if (!sandboxRecord) {
      return null;
    }

    return {
      id: sandboxRecord.id,
      projectId: sandboxRecord.projectId,
      state: sandboxRecord.state,
      previewUrl: sandboxRecord.previewUrl,
      agentSessionId: sandboxRecord.agentSessionId,
      lastActiveAt: sandboxRecord.lastActiveAt,
    };
  }

  /**
   * Update agent session ID for a sandbox
   */
  static async updateAgentSession(sandboxId: string, sessionId: string): Promise<void> {
    await db
      .update(sandboxes)
      .set({ agentSessionId: sessionId })
      .where(eq(sandboxes.id, sandboxId));
  }

  /**
   * Update preview URL for a sandbox
   */
  static async updatePreviewUrl(sandboxId: string, previewUrl: string): Promise<void> {
    await db.update(sandboxes).set({ previewUrl }).where(eq(sandboxes.id, sandboxId));
  }

  /**
   * Touch sandbox to update last active time
   */
  static async touch(sandboxId: string): Promise<void> {
    await db
      .update(sandboxes)
      .set({ lastActiveAt: new Date() })
      .where(eq(sandboxes.id, sandboxId));
  }

  // ==================== File Operations ====================

  /**
   * List files in sandbox directory
   */
  static async listFiles(sandboxId: string, path = "/"): Promise<FileNode[]> {
    const sandbox = await this.getSandboxInstance(sandboxId);
    const entries = await sandbox.files.list(path);

    return entries.map((entry) => ({
      name: entry.name,
      path: entry.path,
      isDir: entry.type === "dir",
    }));
  }

  /**
   * Read file content from sandbox
   */
  static async readFile(sandboxId: string, path: string): Promise<string> {
    const sandbox = await this.getSandboxInstance(sandboxId);
    return await sandbox.files.read(path);
  }

  /**
   * Write file content to sandbox
   */
  static async writeFile(sandboxId: string, path: string, content: string): Promise<void> {
    const sandbox = await this.getSandboxInstance(sandboxId);
    await sandbox.files.write(path, content);
  }

  /**
   * Delete file from sandbox
   */
  static async deleteFile(sandboxId: string, path: string): Promise<void> {
    const sandbox = await this.getSandboxInstance(sandboxId);
    await sandbox.files.remove(path);
  }

  /**
   * Create directory in sandbox
   */
  static async createDirectory(sandboxId: string, path: string): Promise<void> {
    const sandbox = await this.getSandboxInstance(sandboxId);
    await sandbox.files.makeDir(path);
  }

  // ==================== Command Execution ====================

  /**
   * Execute a command in sandbox
   */
  static async executeCommand(
    sandboxId: string,
    command: string,
    options?: {
      cwd?: string;
      envs?: Record<string, string>;
      timeoutMs?: number;
    },
  ): Promise<CommandResult> {
    const sandbox = await this.getSandboxInstance(sandboxId);

    const result = await sandbox.commands.run(command, {
      cwd: options?.cwd,
      envs: options?.envs,
      timeoutMs: options?.timeoutMs ?? 60000, // 1 minute default
    });

    return {
      stdout: result.stdout,
      stderr: result.stderr,
      exitCode: result.exitCode,
    };
  }

  /**
   * Execute a command in sandbox with streaming output
   */
  static async *executeCommandStream(
    sandboxId: string,
    command: string,
    options?: {
      cwd?: string;
      envs?: Record<string, string>;
      timeoutMs?: number;
    },
  ): AsyncGenerator<{ type: "stdout" | "stderr"; data: string }> {
    const sandbox = await this.getSandboxInstance(sandboxId);

    const process = await sandbox.commands.run(command, {
      cwd: options?.cwd,
      envs: options?.envs,
      timeoutMs: options?.timeoutMs ?? 60000,
      onStdout: (_data) => {
        // This callback is for internal handling, actual streaming is done differently
      },
      onStderr: (_data) => {
        // This callback is for internal handling
      },
    });

    // For now, yield the final result
    // TODO: Implement proper streaming when E2B SDK supports it
    if (process.stdout) {
      yield { type: "stdout", data: process.stdout };
    }
    if (process.stderr) {
      yield { type: "stderr", data: process.stderr };
    }
  }

  /**
   * Get the host URL for a port in the sandbox
   */
  static async getHostUrl(sandboxId: string, port: number): Promise<string> {
    const sandbox = await this.getSandboxInstance(sandboxId);
    return sandbox.getHost(port);
  }
}
