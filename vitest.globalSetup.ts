import { execSync } from "child_process";
import path from "path";

// Pushes the current schema into the throwaway test SQLite DB (see
// vitest.config.ts) once before the whole test run, so integration tests
// can hit a real Prisma client instead of mocking it. Must match
// vitest.config.ts's DATABASE_URL exactly — see the comment there on why
// it's "./test.db" and not "./prisma/test.db".
//
// schema.prisma's datasource provider is kept in sync with DATABASE_URL by
// scripts/set-prisma-provider.js (also run before dev/build/migrate) — the
// generated client is provider-specific, so it's regenerated here too
// rather than reusing whatever was last built for prod Postgres.
export default function globalSetup() {
  const env = { ...process.env, DATABASE_URL: "file:./test.db" };
  const providerScript = path.join(__dirname, "scripts", "set-prisma-provider.js");

  execSync(`node "${providerScript}"`, { env, stdio: "inherit" });
  execSync("npx prisma generate", { env, stdio: "inherit" });
  execSync("npx prisma db push --skip-generate --accept-data-loss", { env, stdio: "inherit" });
}
