import type { Context } from "hono";
import { streamSSE } from "hono/streaming";

/**
 * SSE event types for real-time updates
 */
export const SSE_EVENTS = {
  // Agent events
  AGENT_THINKING: "agent:thinking",
  AGENT_TOOL_CALL: "agent:tool_call",
  AGENT_TOOL_RESULT: "agent:tool_result",
  AGENT_MESSAGE: "agent:message",
  AGENT_DONE: "agent:done",
  AGENT_ERROR: "agent:error",

  // Sandbox events
  SANDBOX_STATUS: "sandbox:status",
  SANDBOX_STARTING: "sandbox:starting",
  SANDBOX_READY: "sandbox:ready",
  SANDBOX_PAUSED: "sandbox:paused",
  SANDBOX_TERMINATED: "sandbox:terminated",

  // File events
  FILE_CHANGED: "file:changed",
  FILE_CREATED: "file:created",
  FILE_DELETED: "file:deleted",

  // Terminal events
  TERMINAL_OUTPUT: "terminal:output",
  TERMINAL_ERROR: "terminal:error",
  TERMINAL_EXIT: "terminal:exit",
} as const;

export type SSEEventType = (typeof SSE_EVENTS)[keyof typeof SSE_EVENTS];

/**
 * SSE event data structure
 */
export interface SSEEvent {
  type: SSEEventType;
  data: unknown;
  timestamp?: string;
}

/**
 * Create an SSE event object
 */
export function createSSEEvent(type: SSEEventType, data: unknown): SSEEvent {
  return {
    type,
    data,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Helper to create an SSE response with proper headers
 */
export function createSSEResponse(
  c: Context,
  generator: () => AsyncGenerator<SSEEvent>,
): Response {
  return streamSSE(c, async (stream) => {
    try {
      for await (const event of generator()) {
        await stream.writeSSE({
          event: event.type,
          data: JSON.stringify(event.data),
          id: event.timestamp,
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      await stream.writeSSE({
        event: SSE_EVENTS.AGENT_ERROR,
        data: JSON.stringify({ message: errorMessage }),
      });
    }
  });
}

/**
 * File change event data
 */
export interface FileChangeData {
  path: string;
  action: "created" | "modified" | "deleted";
}

/**
 * Terminal output data
 */
export interface TerminalOutputData {
  type: "stdout" | "stderr";
  content: string;
}

/**
 * Sandbox status data
 */
export interface SandboxStatusData {
  sandboxId: string;
  status: "starting" | "running" | "paused" | "terminated" | "error";
  message?: string;
}

/**
 * Agent message data
 */
export interface AgentMessageData {
  content: string;
  delta?: boolean; // true if this is a partial/streaming update
}

/**
 * Agent tool call data
 */
export interface AgentToolCallData {
  id: string;
  name: string;
  input: Record<string, unknown>;
}

/**
 * Agent tool result data
 */
export interface AgentToolResultData {
  toolUseId: string;
  result: unknown;
  isError: boolean;
}
