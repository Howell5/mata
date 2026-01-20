import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      exclude: [
        "node_modules",
        "dist",
        "src/**/*.d.ts",
        "*.config.ts",
      ],
    },
    // Set timeout for integration tests
    testTimeout: 30000,
    hookTimeout: 30000,
    // Set test environment variables
    env: {
      DATABASE_URL: "postgresql://test:test@localhost:5432/test",
      BETTER_AUTH_SECRET: "test-secret-key-for-testing-purposes",
      BETTER_AUTH_URL: "http://localhost:3000",
      GOOGLE_CLIENT_ID: "test-google-client-id",
      GOOGLE_CLIENT_SECRET: "test-google-client-secret",
      GITHUB_CLIENT_ID: "test-github-client-id",
      GITHUB_CLIENT_SECRET: "test-github-client-secret",
      E2B_API_KEY: "test-e2b-api-key",
      ANTHROPIC_API_KEY: "test-anthropic-api-key",
    },
  },
});
