import { lt, eq, and } from "drizzle-orm";
import { db } from "../db";
import { sandboxes } from "../db/schema";
import { validateEnv } from "../env";
import { SandboxManager } from "./sandbox.service";

// Lazy env validation - only validate when actually needed
let _env: ReturnType<typeof validateEnv> | null = null;
function getEnv() {
  if (!_env) {
    _env = validateEnv();
  }
  return _env;
}

/**
 * Sandbox cleanup service
 * Handles automatic pausing and termination of idle sandboxes
 */
export class SandboxCleanupService {
  private static cleanupInterval: NodeJS.Timeout | null = null;
  private static isRunning = false;

  /**
   * Start the cleanup service
   * Runs periodically to check for idle sandboxes
   */
  static start(): void {
    if (this.isRunning) {
      console.log("[SandboxCleanup] Service already running");
      return;
    }

    this.isRunning = true;

    // Run cleanup every 10 seconds
    const intervalMs = 10000;
    this.cleanupInterval = setInterval(() => {
      this.runCleanup().catch((error) => {
        console.error("[SandboxCleanup] Cleanup cycle failed:", error);
      });
    }, intervalMs);

    console.log("[SandboxCleanup] Service started");

    // Run initial cleanup
    this.runCleanup().catch((error) => {
      console.error("[SandboxCleanup] Initial cleanup failed:", error);
    });
  }

  /**
   * Stop the cleanup service
   */
  static stop(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.isRunning = false;
    console.log("[SandboxCleanup] Service stopped");
  }

  /**
   * Run a single cleanup cycle
   */
  static async runCleanup(): Promise<void> {
    const now = new Date();

    // 1. Pause idle running sandboxes
    await this.pauseIdleSandboxes(now);

    // 2. Terminate long-hibernating sandboxes
    await this.terminateHibernatingSandboxes(now);
  }

  /**
   * Pause sandboxes that have been idle for too long
   */
  private static async pauseIdleSandboxes(now: Date): Promise<void> {
    const idleThreshold = new Date(now.getTime() - getEnv().SANDBOX_IDLE_TIMEOUT_MS);

    // Find running sandboxes that have been idle
    const idleSandboxes = await db.query.sandboxes.findMany({
      where: and(eq(sandboxes.state, "running"), lt(sandboxes.lastActiveAt, idleThreshold)),
    });

    for (const sandbox of idleSandboxes) {
      try {
        console.log(`[SandboxCleanup] Pausing idle sandbox: ${sandbox.id}`);
        await SandboxManager.pause(sandbox.id);
        console.log(`[SandboxCleanup] Successfully paused sandbox: ${sandbox.id}`);
      } catch (error) {
        console.error(`[SandboxCleanup] Failed to pause sandbox ${sandbox.id}:`, error);
        // Continue with other sandboxes
      }
    }

    if (idleSandboxes.length > 0) {
      console.log(`[SandboxCleanup] Paused ${idleSandboxes.length} idle sandboxes`);
    }
  }

  /**
   * Terminate sandboxes that have been paused for too long
   */
  private static async terminateHibernatingSandboxes(now: Date): Promise<void> {
    const hibernateThreshold = new Date(now.getTime() - getEnv().SANDBOX_MAX_HIBERNATE_MS);

    // Find paused sandboxes that have been hibernating too long
    const hibernatingSandboxes = await db.query.sandboxes.findMany({
      where: and(eq(sandboxes.state, "paused"), lt(sandboxes.lastActiveAt, hibernateThreshold)),
    });

    for (const sandbox of hibernatingSandboxes) {
      try {
        console.log(`[SandboxCleanup] Terminating long-hibernating sandbox: ${sandbox.id}`);
        await SandboxManager.terminate(sandbox.id);
        console.log(`[SandboxCleanup] Successfully terminated sandbox: ${sandbox.id}`);
      } catch (error) {
        console.error(`[SandboxCleanup] Failed to terminate sandbox ${sandbox.id}:`, error);
        // Continue with other sandboxes
      }
    }

    if (hibernatingSandboxes.length > 0) {
      console.log(`[SandboxCleanup] Terminated ${hibernatingSandboxes.length} hibernating sandboxes`);
    }
  }

  /**
   * Manually trigger cleanup (useful for testing)
   */
  static async triggerCleanup(): Promise<{
    pausedCount: number;
    terminatedCount: number;
  }> {
    const now = new Date();
    const idleThreshold = new Date(now.getTime() - getEnv().SANDBOX_IDLE_TIMEOUT_MS);
    const hibernateThreshold = new Date(now.getTime() - getEnv().SANDBOX_MAX_HIBERNATE_MS);

    let pausedCount = 0;
    let terminatedCount = 0;

    // Pause idle sandboxes
    const idleSandboxes = await db.query.sandboxes.findMany({
      where: and(eq(sandboxes.state, "running"), lt(sandboxes.lastActiveAt, idleThreshold)),
    });

    for (const sandbox of idleSandboxes) {
      try {
        await SandboxManager.pause(sandbox.id);
        pausedCount++;
      } catch {
        // Ignore errors for manual trigger
      }
    }

    // Terminate hibernating sandboxes
    const hibernatingSandboxes = await db.query.sandboxes.findMany({
      where: and(eq(sandboxes.state, "paused"), lt(sandboxes.lastActiveAt, hibernateThreshold)),
    });

    for (const sandbox of hibernatingSandboxes) {
      try {
        await SandboxManager.terminate(sandbox.id);
        terminatedCount++;
      } catch {
        // Ignore errors for manual trigger
      }
    }

    return { pausedCount, terminatedCount };
  }
}
