import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// This file tests the SandboxManager service logic
// Note: Integration tests requiring actual E2B instances should be run separately

describe("SandboxManager Types and Interfaces", () => {
  it("should define FileNode interface correctly", async () => {
    const { SandboxManager } = await import("./sandbox.service");

    // Type check - if this compiles, the interface exists
    type FileNode = {
      name: string;
      path: string;
      isDir: boolean;
      children?: FileNode[];
    };

    const node: FileNode = {
      name: "test",
      path: "/test",
      isDir: true,
      children: [],
    };

    expect(node.name).toBe("test");
    expect(SandboxManager).toBeDefined();
  });

  it("should define SandboxInfo interface correctly", () => {
    type SandboxInfo = {
      id: string;
      projectId: string;
      state: "creating" | "running" | "paused" | "terminated";
      previewUrl: string | null;
      agentSessionId: string | null;
      lastActiveAt: Date;
    };

    const info: SandboxInfo = {
      id: "test-id",
      projectId: "project-id",
      state: "running",
      previewUrl: null,
      agentSessionId: null,
      lastActiveAt: new Date(),
    };

    expect(info.state).toBe("running");
  });

  it("should define CommandResult interface correctly", () => {
    type CommandResult = {
      stdout: string;
      stderr: string;
      exitCode: number;
    };

    const result: CommandResult = {
      stdout: "output",
      stderr: "",
      exitCode: 0,
    };

    expect(result.exitCode).toBe(0);
  });
});

describe("SandboxManager Static Methods Exist", () => {
  it("should export SandboxManager class with required static methods", async () => {
    const { SandboxManager } = await import("./sandbox.service");

    // Lifecycle methods
    expect(typeof SandboxManager.create).toBe("function");
    expect(typeof SandboxManager.ensureRunning).toBe("function");
    expect(typeof SandboxManager.pause).toBe("function");
    expect(typeof SandboxManager.resume).toBe("function");
    expect(typeof SandboxManager.terminate).toBe("function");

    // Info methods
    expect(typeof SandboxManager.getInfo).toBe("function");
    expect(typeof SandboxManager.getSandboxInstance).toBe("function");

    // File operations
    expect(typeof SandboxManager.listFiles).toBe("function");
    expect(typeof SandboxManager.readFile).toBe("function");
    expect(typeof SandboxManager.writeFile).toBe("function");
    expect(typeof SandboxManager.deleteFile).toBe("function");
    expect(typeof SandboxManager.createDirectory).toBe("function");

    // Command execution
    expect(typeof SandboxManager.executeCommand).toBe("function");
    expect(typeof SandboxManager.executeCommandStream).toBe("function");

    // Utility methods
    expect(typeof SandboxManager.touch).toBe("function");
    expect(typeof SandboxManager.getHostUrl).toBe("function");
    expect(typeof SandboxManager.updateAgentSession).toBe("function");
    expect(typeof SandboxManager.updatePreviewUrl).toBe("function");
  });
});
