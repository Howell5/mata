import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  BETTER_AUTH_SECRET: z.string().min(32, "BETTER_AUTH_SECRET must be at least 32 characters"),
  BETTER_AUTH_URL: z.string().url(),
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  // OAuth providers (required for social login)
  GOOGLE_CLIENT_ID: z.string().min(1, "GOOGLE_CLIENT_ID is required"),
  GOOGLE_CLIENT_SECRET: z.string().min(1, "GOOGLE_CLIENT_SECRET is required"),
  GITHUB_CLIENT_ID: z.string().min(1, "GITHUB_CLIENT_ID is required"),
  GITHUB_CLIENT_SECRET: z.string().min(1, "GITHUB_CLIENT_SECRET is required"),
  // Stripe keys are optional in development, required in production
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  // E2B Sandbox configuration
  E2B_API_KEY: z.string().optional(),
  // Anthropic API key (used by claude-agent-sdk in sandbox)
  ANTHROPIC_API_KEY: z.string().optional(),
  // Sandbox idle timeout before hibernation (default: 30 seconds)
  SANDBOX_IDLE_TIMEOUT_MS: z.coerce.number().default(30000),
  // Max hibernation time before termination (default: 1 hour)
  SANDBOX_MAX_HIBERNATE_MS: z.coerce.number().default(3600000),
});

export type Env = z.infer<typeof envSchema>;

/**
 * Validates and returns environment variables
 * Throws an error if validation fails
 */
export function validateEnv(): Env {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error("❌ Invalid environment variables:");
    console.error(result.error.flatten().fieldErrors);
    throw new Error("Invalid environment variables");
  }

  return result.data;
}

/**
 * Lazy-loaded environment variables
 * Use this instead of validateEnv() in modules that are imported before dotenv.config()
 */
let _env: Env | null = null;
export function getEnv(): Env {
  if (!_env) {
    _env = validateEnv();
  }
  return _env;
}
