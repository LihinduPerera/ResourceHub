/**
 * Typed, fail-fast access to environment variables.
 *
 * Importing this module from a server-only context guarantees the required
 * configuration exists before any request is handled. Values are read once at
 * module load.
 */

function requireEnv(name: string): string {
  const value = process.env[name];

  if (!value || value.trim() === "") {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export const env = Object.freeze({
  databaseUrl: requireEnv("DATABASE_URL"),
  nodeEnv: process.env.NODE_ENV ?? "development",
});

/**
 * Auth configuration is optional at the module level (e.g. for scripts/tests
 * that only need the database), so it is obtained lazily.
 */
export function getAuthConfig() {
  return {
    secret: requireEnv("BETTER_AUTH_SECRET"),
    url: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
  };
}
