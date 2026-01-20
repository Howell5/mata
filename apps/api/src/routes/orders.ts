import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { auth } from "../auth";
import { db } from "../db";
import { orders } from "../db/schema";
import { errors, ok } from "../lib/response";

const ordersRoute = new Hono()
  /**
   * GET /orders
   * Get current user's order history
   */
  .get("/", async (c) => {
    // Authentication check
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session) {
      return errors.unauthorized(c);
    }

    // Query user's orders
    const userOrders = await db.query.orders.findMany({
      where: eq(orders.userId, session.user.id),
      orderBy: (orders, { desc }) => [desc(orders.createdAt)],
    });

    return ok(c, { orders: userOrders });
  });

export default ordersRoute;
