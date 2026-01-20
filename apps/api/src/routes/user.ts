import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { auth } from "../auth";
import { db } from "../db";
import { user } from "../db/schema";
import { errors, ok } from "../lib/response";

const userRoute = new Hono()
  /**
   * GET /user/me
   * Get current user's profile including credits
   */
  .get("/me", async (c) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session) {
      return errors.unauthorized(c);
    }

    const userData = await db.query.user.findFirst({
      where: eq(user.id, session.user.id),
      columns: {
        id: true,
        name: true,
        email: true,
        credits: true,
      },
    });

    if (!userData) {
      return errors.notFound(c, "User not found");
    }

    return ok(c, userData);
  });

export default userRoute;
