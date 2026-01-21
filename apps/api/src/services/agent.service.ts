import { eq } from "drizzle-orm";
import { db } from "../db";
import { sandboxes, conversations, messages } from "../db/schema";
import { getEnv } from "../env";
import { SandboxManager } from "./sandbox.service";

/**
 * Agent event types for SSE streaming
 */
export type AgentEventType =
  | "agent:thinking"
  | "agent:tool_call"
  | "agent:tool_result"
  | "agent:message"
  | "agent:done"
  | "agent:error"
  | "sandbox:status"
  | "file:changed"
  | "terminal:output";

/**
 * Agent event structure
 */
export interface AgentEvent {
  type: AgentEventType;
  data?: unknown;
  timestamp: string;
}

/**
 * Active agent executions
 * Maps projectId to AbortController for stopping
 */
const activeAgents = new Map<string, AbortController>();

/**
 * Agent worker script content
 * This is injected into the sandbox on first run
 */
const AGENT_WORKER_SCRIPT = `#!/usr/bin/env node
const { query } = require("@anthropic-ai/claude-agent-sdk");

function emit(event) {
  console.log(JSON.stringify(event));
}

function now() {
  return new Date().toISOString();
}

async function main() {
  const userMessage = process.argv[2];
  if (!userMessage) {
    emit({ type: "agent:error", data: { message: "No message provided" }, timestamp: now() });
    process.exit(1);
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    emit({ type: "agent:error", data: { message: "ANTHROPIC_API_KEY not set" }, timestamp: now() });
    process.exit(1);
  }

  const sessionId = process.env.SESSION_ID;
  const projectDir = process.env.PROJECT_DIR || "/home/user/project";

  emit({ type: "agent:thinking", timestamp: now() });

  try {
    const response = query({
      prompt: userMessage,
      options: {
        resume: sessionId || undefined,
        allowedTools: ["Read", "Write", "Edit", "Bash", "Glob", "Grep", "WebFetch"],
        permissionMode: "acceptEdits",
        cwd: projectDir,
        systemPrompt: \`You are an AI assistant helping to build web applications.
Your working directory is \${projectDir}. Use modern web practices (React, TypeScript, Tailwind CSS).
Available tools: Read, Write, Edit, Bash, Glob, Grep, WebFetch.
Always explain what you're doing and verify changes after making them.\`,
      },
    });

    for await (const message of response) {
      if (message.type === "text") {
        emit({ type: "agent:message", data: { content: message.text }, timestamp: now() });
      } else if (message.type === "tool_use") {
        emit({ type: "agent:tool_call", data: { id: message.id, name: message.name, input: message.input }, timestamp: now() });
      } else if (message.type === "tool_result") {
        emit({ type: "agent:tool_result", data: { toolUseId: message.tool_use_id, result: message.content, isError: message.is_error }, timestamp: now() });
      }
    }

    emit({ type: "agent:done", data: { sessionId: response.sessionId }, timestamp: now() });
  } catch (error) {
    emit({ type: "agent:error", data: { message: error.message || "Unknown error" }, timestamp: now() });
    process.exit(1);
  }
}

main().catch(e => {
  emit({ type: "agent:error", data: { message: e.message || "Unexpected error" }, timestamp: now() });
  process.exit(1);
});
`;

/**
 * AgentService handles Claude Agent SDK execution in E2B sandbox
 */
export class AgentService {
  /**
   * Check if agent is currently executing for a project
   */
  static isAgentRunning(projectId: string): boolean {
    return activeAgents.has(projectId);
  }

  /**
   * Stop agent execution for a project
   */
  static stopAgent(projectId: string): boolean {
    const controller = activeAgents.get(projectId);
    if (controller) {
      controller.abort();
      activeAgents.delete(projectId);
      return true;
    }
    return false;
  }

  /**
   * Initialize sandbox for agent execution
   * Sets up the agent worker script and required dependencies
   */
  static async initializeSandbox(sandboxId: string): Promise<void> {
    // Create project directory
    await SandboxManager.executeCommand(sandboxId, "mkdir -p /home/user/project", { cwd: "/" });

    // Create agent worker script directory
    await SandboxManager.executeCommand(sandboxId, "mkdir -p /home/user/.agent", { cwd: "/" });

    // Write agent worker script
    await SandboxManager.writeFile(sandboxId, "/home/user/.agent/worker.js", AGENT_WORKER_SCRIPT);

    // Install claude-agent-sdk if not already installed
    const checkResult = await SandboxManager.executeCommand(
      sandboxId,
      "npm list -g @anthropic-ai/claude-agent-sdk 2>/dev/null || echo 'not-installed'",
      { cwd: "/" },
    );

    if (checkResult.stdout.includes("not-installed")) {
      console.log("[Agent] Installing @anthropic-ai/claude-agent-sdk...");
      await SandboxManager.executeCommand(sandboxId, "npm install -g @anthropic-ai/claude-agent-sdk", {
        cwd: "/",
        timeoutMs: 120000, // 2 minutes for npm install
      });
      console.log("[Agent] Installation complete");
    }
  }

  /**
   * Send a message to the agent and stream responses
   */
  static async *chat(
    projectId: string,
    _userId: string,
    message: string,
  ): AsyncGenerator<AgentEvent> {
    // Check if agent is already running
    if (this.isAgentRunning(projectId)) {
      yield {
        type: "agent:error",
        data: { message: "Agent is already processing a request" },
        timestamp: new Date().toISOString(),
      };
      return;
    }

    // Create abort controller for this execution
    const controller = new AbortController();
    activeAgents.set(projectId, controller);

    try {
      // Ensure sandbox is running
      yield {
        type: "sandbox:status",
        data: { status: "starting" },
        timestamp: new Date().toISOString(),
      };

      const sandboxInfo = await SandboxManager.ensureRunning(projectId);

      yield {
        type: "sandbox:status",
        data: { status: "running", sandboxId: sandboxInfo.id },
        timestamp: new Date().toISOString(),
      };

      // Initialize sandbox if needed
      await this.initializeSandbox(sandboxInfo.id);

      // Get or create conversation
      let conversation = await db.query.conversations.findFirst({
        where: eq(conversations.projectId, projectId),
      });

      if (!conversation) {
        const [newConversation] = await db
          .insert(conversations)
          .values({ projectId })
          .returning();
        conversation = newConversation;
      }

      // Save user message
      await db.insert(messages).values({
        conversationId: conversation.id,
        role: "user",
        content: message,
      });

      // Get existing session ID for resumption
      const sandboxRecord = await db.query.sandboxes.findFirst({
        where: eq(sandboxes.id, sandboxInfo.id),
      });
      const sessionId = sandboxRecord?.agentSessionId || "";

      // Prepare environment variables for agent
      const envs: Record<string, string> = {
        ANTHROPIC_API_KEY: getEnv().ANTHROPIC_API_KEY || "",
        PROJECT_DIR: "/home/user/project",
      };
      if (sessionId) {
        envs.SESSION_ID = sessionId;
      }

      // Execute agent worker script
      const escapedMessage = message.replace(/'/g, "'\\''");
      const command = `node /home/user/.agent/worker.js '${escapedMessage}'`;

      const result = await SandboxManager.executeCommand(sandboxInfo.id, command, {
        cwd: "/home/user/project",
        envs,
        timeoutMs: 300000, // 5 minutes timeout
      });

      // Parse stdout for agent events (JSON lines)
      const lines = result.stdout.split("\n").filter((line) => line.trim());
      let assistantContent = "";
      const toolCalls: unknown[] = [];
      let newSessionId: string | null = null;

      for (const line of lines) {
        // Check for abort
        if (controller.signal.aborted) {
          yield {
            type: "agent:error",
            data: { message: "Agent execution was stopped" },
            timestamp: new Date().toISOString(),
          };
          break;
        }

        try {
          const event = JSON.parse(line) as AgentEvent;
          yield event;

          // Collect assistant response content
          if (event.type === "agent:message" && event.data) {
            const data = event.data as { content?: string };
            assistantContent += data.content || "";
          }

          // Collect tool calls
          if (event.type === "agent:tool_call" && event.data) {
            toolCalls.push(event.data);
          }

          // Capture new session ID
          if (event.type === "agent:done" && event.data) {
            const data = event.data as { sessionId?: string };
            newSessionId = data.sessionId || null;
          }
        } catch {
          // Skip non-JSON lines (might be other output)
          console.log("[Agent] Non-JSON output:", line);
        }
      }

      // Handle stderr if any errors
      if (result.stderr && result.exitCode !== 0) {
        yield {
          type: "agent:error",
          data: { message: result.stderr },
          timestamp: new Date().toISOString(),
        };
      }

      // Save assistant message if we got a response
      if (assistantContent || toolCalls.length > 0) {
        await db.insert(messages).values({
          conversationId: conversation.id,
          role: "assistant",
          content: assistantContent || "(Tool calls only)",
          toolCalls: toolCalls.length > 0 ? toolCalls : null,
        });
      }

      // Update session ID if changed
      if (newSessionId) {
        await SandboxManager.updateAgentSession(sandboxInfo.id, newSessionId);
      }

      // Touch sandbox to update activity time
      await SandboxManager.touch(sandboxInfo.id);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      yield {
        type: "agent:error",
        data: { message: errorMessage },
        timestamp: new Date().toISOString(),
      };
    } finally {
      activeAgents.delete(projectId);
    }
  }

  /**
   * Get conversation history for a project
   */
  static async getConversationHistory(projectId: string): Promise<{
    conversationId: string;
    messages: Array<{
      id: string;
      role: "user" | "assistant";
      content: string;
      toolCalls: unknown;
      createdAt: string;
    }>;
  } | null> {
    const conversation = await db.query.conversations.findFirst({
      where: eq(conversations.projectId, projectId),
      with: {
        messages: {
          orderBy: (messages, { asc }) => [asc(messages.createdAt)],
        },
      },
    });

    if (!conversation) {
      return null;
    }

    return {
      conversationId: conversation.id,
      messages: conversation.messages.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        toolCalls: m.toolCalls,
        createdAt: m.createdAt.toISOString(),
      })),
    };
  }
}
