import { defineConfig } from "vitest/config";
import path from "path";

// Integration tests (src/**/*.integration.test.ts) hit a real, throwaway
// SQLite database (prisma/test.db, gitignored) rather than mocking Prisma —
// the race/idempotency behavior the brief asks to be tested (double
// confirm, webhook redelivery, no-show blocking a refund) is exactly the
// kind of thing a mock would rubber-stamp instead of actually exercising.
// globalSetup pushes the current schema into it once before the run.
//
// The URL below is "./test.db", not "./prisma/test.db" — Prisma resolves a
// relative sqlite `file:` path relative to schema.prisma's own directory
// (prisma/), for both the CLI and the generated client, so "./test.db"
// here is what actually lands at prisma/test.db on disk. Using
// "./prisma/test.db" looks more explicit but doubles up into
// prisma/prisma/test.db instead.
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    env: {
      DATABASE_URL: "file:./test.db",
      // Never a real key — just satisfies `new Stripe(...)` at module load
      // time for files that import @/lib/stripe. Every test that would
      // actually reach the network mocks @/lib/stripe or
      // @/lib/confirmationCharge instead of relying on this key working.
      STRIPE_SECRET_KEY: "sk_test_vitest_placeholder",
    },
    globalSetup: "./vitest.globalSetup.ts",
  },
});
