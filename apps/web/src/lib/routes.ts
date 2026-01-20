/**
 * Route path constants
 * Single source of truth for all application routes
 */
export const ROUTES = {
  // Public routes
  HOME: "/",
  PRICING: "/pricing",
  LOGIN: "/login",
  REGISTER: "/register",

  // Protected routes
  DASHBOARD: "/dashboard",
  PROJECTS: "/projects",
  WORKSPACE: "/workspace/:projectId",
  SETTINGS: "/settings",
  BILLING: "/settings/billing",
  ORDERS: "/orders",
} as const;

/**
 * Helper function to generate workspace URL with project ID
 */
export function getWorkspaceUrl(projectId: string): string {
  return `/workspace/${projectId}`;
}

export type RoutePath = (typeof ROUTES)[keyof typeof ROUTES];
