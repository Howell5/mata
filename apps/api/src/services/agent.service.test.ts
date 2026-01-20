import { describe, it, expect } from "vitest";

// This file tests the AgentService structure
// Note: Integration tests requiring actual sandbox instances should be run separately

describe("AgentService Types and Interfaces", () => {
  it("should define AgentEvent type correctly", () => {
    type AgentEvent =
      | { type: "thinking" }
      | { type: "message"; content: string }
      | { type: "tool_call"; id: string; name: string; input: Record<string, unknown> }
      | { type: "tool_result"; toolUseId: string; result: unknown; isError: boolean }
      | { type: "done" }
      | { type: "error"; error: string };

    const thinkingEvent: AgentEvent = { type: "thinking" };
    const messageEvent: AgentEvent = { type: "message", content: "Hello" };
    const toolCallEvent: AgentEvent = {
      type: "tool_call",
      id: "tc-1",
      name: "write_file",
      input: { path: "/test.txt", content: "test" },
    };
    const toolResultEvent: AgentEvent = {
      type: "tool_result",
      toolUseId: "tc-1",
      result: "success",
      isError: false,
    };
    const doneEvent: AgentEvent = { type: "done" };
    const errorEvent: AgentEvent = { type: "error", error: "Something went wrong" };

    expect(thinkingEvent.type).toBe("thinking");
    expect(messageEvent.type).toBe("message");
    expect(toolCallEvent.type).toBe("tool_call");
    expect(toolResultEvent.type).toBe("tool_result");
    expect(doneEvent.type).toBe("done");
    expect(errorEvent.type).toBe("error");
  });
});

describe("AgentService Static Methods Exist", () => {
  it("should export AgentService class with required static methods", async () => {
    const { AgentService } = await import("./agent.service");

    expect(typeof AgentService.isAgentRunning).toBe("function");
    expect(typeof AgentService.stopAgent).toBe("function");
    expect(typeof AgentService.initializeSandbox).toBe("function");
    expect(typeof AgentService.chat).toBe("function");
    expect(typeof AgentService.getConversationHistory).toBe("function");
  });

  it("should return false for isAgentRunning when no agent is running", async () => {
    const { AgentService } = await import("./agent.service");
    const result = AgentService.isAgentRunning("non-existent-project");
    expect(result).toBe(false);
  });

  it("should return false for stopAgent when no agent to stop", async () => {
    const { AgentService } = await import("./agent.service");
    const result = AgentService.stopAgent("non-existent-project");
    expect(result).toBe(false);
  });
});
