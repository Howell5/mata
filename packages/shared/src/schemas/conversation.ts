import { z } from "zod";

/**
 * Message role enum
 */
export const messageRoleSchema = z.enum(["user", "assistant"]);
export type MessageRole = z.infer<typeof messageRoleSchema>;

/**
 * Tool call schema
 */
export const toolCallSchema = z.object({
  id: z.string(),
  name: z.string(),
  input: z.record(z.unknown()),
  result: z.unknown().optional(),
});
export type ToolCall = z.infer<typeof toolCallSchema>;

/**
 * Message schema
 */
export const messageSchema = z.object({
  id: z.string().uuid(),
  role: messageRoleSchema,
  content: z.string(),
  toolCalls: z.array(toolCallSchema).nullable(),
  createdAt: z.string().datetime(),
});
export type Message = z.infer<typeof messageSchema>;

/**
 * Conversation schema
 */
export const conversationSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  messages: z.array(messageSchema),
  createdAt: z.string().datetime(),
});
export type Conversation = z.infer<typeof conversationSchema>;

/**
 * Send message schema
 */
export const sendMessageSchema = z.object({
  projectId: z.string().uuid("Invalid project ID"),
  content: z.string().min(1, "Message cannot be empty").max(10000, "Message too long"),
});
export type SendMessage = z.infer<typeof sendMessageSchema>;

/**
 * SSE event types for agent communication
 */
export const agentEventTypeSchema = z.enum([
  "agent:thinking",
  "agent:tool_call",
  "agent:tool_result",
  "agent:message",
  "agent:done",
  "agent:error",
  "sandbox:status",
  "file:changed",
  "terminal:output",
]);
export type AgentEventType = z.infer<typeof agentEventTypeSchema>;

/**
 * Agent event schema (for SSE)
 */
export const agentEventSchema = z.object({
  type: agentEventTypeSchema,
  data: z.unknown(),
  timestamp: z.string().datetime(),
});
export type AgentEvent = z.infer<typeof agentEventSchema>;
