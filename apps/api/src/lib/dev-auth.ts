import type { Context } from "hono";
import { auth } from "../auth";
import { getEnv } from "../env";

/**
 * Mock session for development when DEV_BYPASS_AUTH is enabled
 */
const DEV_MOCK_SESSION = {
  user: {
    id: "dev-user-id",
    name: "Dev User",
    email: "dev@example.com",
    emailVerified: true,
    image: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  session: {
    id: "dev-session-id",
    userId: "dev-user-id",
    expiresAt: new Date(Date.now() + 86400000),
    token: "dev-token",
    createdAt: new Date(),
    updatedAt: new Date(),
    ipAddress: null,
    userAgent: null,
  },
};

/**
 * Get session with optional dev bypass
 * In development with DEV_BYPASS_AUTH=true, returns a mock session
 */
export async function getSession(c: Context) {
  const env = getEnv();

  // Check for dev bypass
  if (env.DEV_BYPASS_AUTH && env.NODE_ENV === "development") {
    const mockSession = { ...DEV_MOCK_SESSION };
    // Use custom user ID if provided
    if (env.DEV_USER_ID) {
      mockSession.user.id = env.DEV_USER_ID;
      mockSession.session.userId = env.DEV_USER_ID;
    }
    return mockSession;
  }

  // Normal auth flow
  return auth.api.getSession({ headers: c.req.raw.headers });
}
