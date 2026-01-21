import { zValidator } from "@hono/zod-validator";
import { createProjectSchema, projectIdSchema, updateProjectSchema } from "@repo/shared";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { db } from "../db";
import { projects } from "../db/schema";
import { getSession } from "../lib/dev-auth";
import { errors, ok } from "../lib/response";

const projectsRoute = new Hono()
  /**
   * GET /projects
   * List all projects for the authenticated user
   */
  .get("/", async (c) => {
    const session = await getSession(c);
    if (!session) {
      return errors.unauthorized(c);
    }

    const userProjects = await db.query.projects.findMany({
      where: eq(projects.userId, session.user.id),
      orderBy: (projects, { desc }) => [desc(projects.updatedAt)],
      with: {
        sandbox: true,
      },
    });

    return ok(c, {
      projects: userProjects.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        userId: p.userId,
        sandboxState: p.sandbox?.state ?? null,
        previewUrl: p.sandbox?.previewUrl ?? null,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
      })),
    });
  })

  /**
   * POST /projects
   * Create a new project
   */
  .post("/", zValidator("json", createProjectSchema), async (c) => {
    const session = await getSession(c);
    if (!session) {
      return errors.unauthorized(c);
    }

    const { name, description } = c.req.valid("json");

    const [newProject] = await db
      .insert(projects)
      .values({
        name,
        description: description ?? null,
        userId: session.user.id,
      })
      .returning();

    return ok(
      c,
      {
        id: newProject.id,
        name: newProject.name,
        description: newProject.description,
        userId: newProject.userId,
        sandboxState: null,
        previewUrl: null,
        createdAt: newProject.createdAt.toISOString(),
        updatedAt: newProject.updatedAt.toISOString(),
      },
      201,
    );
  })

  /**
   * GET /projects/:id
   * Get a single project by ID
   */
  .get("/:id", zValidator("param", projectIdSchema), async (c) => {
    const session = await getSession(c);
    if (!session) {
      return errors.unauthorized(c);
    }

    const { id } = c.req.valid("param");

    const project = await db.query.projects.findFirst({
      where: eq(projects.id, id),
      with: {
        sandbox: true,
      },
    });

    if (!project) {
      return errors.notFound(c, "Project not found");
    }

    if (project.userId !== session.user.id) {
      return errors.forbidden(c);
    }

    return ok(c, {
      id: project.id,
      name: project.name,
      description: project.description,
      userId: project.userId,
      sandbox: project.sandbox
        ? {
            id: project.sandbox.id,
            state: project.sandbox.state,
            previewUrl: project.sandbox.previewUrl,
            agentSessionId: project.sandbox.agentSessionId,
            lastActiveAt: project.sandbox.lastActiveAt.toISOString(),
          }
        : null,
      createdAt: project.createdAt.toISOString(),
      updatedAt: project.updatedAt.toISOString(),
    });
  })

  /**
   * PATCH /projects/:id
   * Update a project
   */
  .patch(
    "/:id",
    zValidator("param", projectIdSchema),
    zValidator("json", updateProjectSchema),
    async (c) => {
      const session = await getSession(c);
      if (!session) {
        return errors.unauthorized(c);
      }

      const { id } = c.req.valid("param");
      const updates = c.req.valid("json");

      const project = await db.query.projects.findFirst({
        where: eq(projects.id, id),
      });

      if (!project) {
        return errors.notFound(c, "Project not found");
      }

      if (project.userId !== session.user.id) {
        return errors.forbidden(c);
      }

      const [updatedProject] = await db
        .update(projects)
        .set({
          ...updates,
          updatedAt: new Date(),
        })
        .where(eq(projects.id, id))
        .returning();

      return ok(c, {
        id: updatedProject.id,
        name: updatedProject.name,
        description: updatedProject.description,
        userId: updatedProject.userId,
        createdAt: updatedProject.createdAt.toISOString(),
        updatedAt: updatedProject.updatedAt.toISOString(),
      });
    },
  )

  /**
   * DELETE /projects/:id
   * Delete a project and its associated sandbox
   */
  .delete("/:id", zValidator("param", projectIdSchema), async (c) => {
    const session = await getSession(c);
    if (!session) {
      return errors.unauthorized(c);
    }

    const { id } = c.req.valid("param");

    const project = await db.query.projects.findFirst({
      where: eq(projects.id, id),
      with: {
        sandbox: true,
      },
    });

    if (!project) {
      return errors.notFound(c, "Project not found");
    }

    if (project.userId !== session.user.id) {
      return errors.forbidden(c);
    }

    // TODO: Terminate sandbox if running (will be implemented in sandbox service)

    // Delete project (cascades to sandbox, conversations, messages)
    await db.delete(projects).where(eq(projects.id, id));

    return ok(c, { message: "Project deleted successfully" });
  });

export default projectsRoute;
