import { execSync } from "child_process";

// Pushes the current schema into the throwaway test SQLite DB (see
// vitest.config.ts) once before the whole test run, so integration tests
// can hit a real Prisma client instead of mocking it. Must match
// vitest.config.ts's DATABASE_URL exactly — see the comment there on why
// it's "./test.db" and not "./prisma/test.db".
export default function globalSetup() {
  execSync("npx prisma db push --skip-generate --accept-data-loss", {
    env: { ...process.env, DATABASE_URL: "file:./test.db" },
    stdio: "inherit",
  });
}
