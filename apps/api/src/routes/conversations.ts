import { zValidator } from "@hono/zod-validator";
import { projectIdSchema } from "@repo/shared";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { db } from "../db";
import { projects } from "../db/schema";
import { getSession } from "../lib/dev-auth";
import { errors, ok } from "../lib/response";
import { AgentService } from "../services/agent.service";

const conversationsRoute = new Hono()
  /**
   * GET /conversations/:id
   * Get conversation history for a project
   */
  .get("/:id", zValidator("param", projectIdSchema), async (c) => {
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

export default conversationsRoute;
