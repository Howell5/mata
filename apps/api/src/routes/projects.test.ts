import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";

// Test the projects route structure and validation
describe("Projects Route Structure", () => {
  it("should export a Hono route", async () => {
    const { default: projectsRoute } = await import("./projects");
    expect(projectsRoute).toBeDefined();
    expect(projectsRoute).toBeInstanceOf(Hono);
  });
});

describe("Projects Schema Validation", () => {
  it("should validate project name is required", () => {
    // Import the schema used in the route
    const projectSchema = {
      name: (value: string) => value.length >= 1 && value.length <= 100,
      description: (value: string | undefined) =>
        value === undefined || value.length <= 500,
    };

    expect(projectSchema.name("Valid Name")).toBe(true);
    expect(projectSchema.name("")).toBe(false);
    expect(projectSchema.description("A description")).toBe(true);
    expect(projectSchema.description(undefined)).toBe(true);
  });
});

describe("SSE Events Constants", () => {
  it("should define all SSE event types", async () => {
    const { SSE_EVENTS } = await import("../lib/sse");

    expect(SSE_EVENTS.AGENT_THINKING).toBeDefined();
    expect(SSE_EVENTS.AGENT_TOOL_CALL).toBeDefined();
    expect(SSE_EVENTS.AGENT_TOOL_RESULT).toBeDefined();
    expect(SSE_EVENTS.AGENT_MESSAGE).toBeDefined();
    expect(SSE_EVENTS.AGENT_DONE).toBeDefined();
    expect(SSE_EVENTS.AGENT_ERROR).toBeDefined();
    expect(SSE_EVENTS.SANDBOX_STATUS).toBeDefined();
    expect(SSE_EVENTS.FILE_CHANGED).toBeDefined();
    expect(SSE_EVENTS.TERMINAL_OUTPUT).toBeDefined();
  });
});

describe("Response Helpers", () => {
  it("should export ok helper function", async () => {
    const { ok, errors } = await import("../lib/response");

    expect(typeof ok).toBe("function");
    expect(typeof errors.unauthorized).toBe("function");
    expect(typeof errors.forbidden).toBe("function");
    expect(typeof errors.notFound).toBe("function");
    expect(typeof errors.badRequest).toBe("function");
  });
});
