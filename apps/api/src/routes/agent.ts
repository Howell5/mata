import { zValidator } from "@hono/zod-validator";
import { sendMessageSchema, projectIdSchema } from "@repo/shared";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { db } from "../db";
import { projects } from "../db/schema";
import { getSession } from "../lib/dev-auth";
import { errors, ok } from "../lib/response";
import { AgentService } from "../services/agent.service";

const agentRoute = new Hono()
  /**
   * POST /agent/chat
   * Send a message to the agent and receive SSE stream of responses
   */
  .post("/chat", zValidator("json", sendMessageSchema), async (c) => {
    const session = await getSession(c);
    if (!session) {
      return errors.unauthorized(c);
    }

    const { projectId, content } = c.req.valid("json");

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

    // Check if agent is already running
    if (AgentService.isAgentRunning(projectId)) {
      return errors.conflict(c, "Agent is already processing a request");
    }

    // Return SSE stream
    return streamSSE(c, async (stream) => {
      try {
        for await (const event of AgentService.chat(projectId, session.user.id, content)) {
          await stream.writeSSE({
            event: event.type,
            data: JSON.stringify(event.data || {}),
            id: event.timestamp,
          });
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        await stream.writeSSE({
          event: "agent:error",
          data: JSON.stringify({ message: errorMessage }),
        });
      }
    });
  })

  /**
   * POST /agent/stop
   * Stop current agent execution
   */
  .post("/stop", zValidator("json", projectIdSchema.extend({ id: projectIdSchema.shape.id })), async (c) => {
    const session = await getSession(c);
    if (!session) {
      return errors.unauthorized(c);
    }

    const { id: projectId } = c.req.valid("json");

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

    const stopped = AgentService.stopAgent(projectId);

    if (stopped) {
      return ok(c, { message: "Agent execution stopped" });
    } else {
      return errors.badRequest(c, "No agent execution in progress");
    }
  })

  /**
   * GET /agent/history/:projectId
   * Get conversation history for a project
   */
  .get("/history/:id", zValidator("param", projectIdSchema), async (c) => {
    const session = await getSession(c);
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

    const history = await AgentService.getConversationHistory(projectId);

    return ok(c, history || { conversationId: null, messages: [] });
  });

export default agentRoute;
