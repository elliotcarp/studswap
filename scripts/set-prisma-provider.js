// Keeps prisma/schema.prisma's datasource provider in sync with whatever
// DATABASE_URL actually points at, so the same schema file works against
// local SQLite (dev/test) and prod Postgres/Neon without a manual edit.
// Run before any `prisma` CLI command — see package.json scripts and
// vitest.globalSetup.ts.
const fs = require("fs");
const path = require("path");

function readEnvFile(filename) {
  const envPath = path.join(__dirname, "..", filename);
  if (!fs.existsSync(envPath)) return null;
  const match = fs
    .readFileSync(envPath, "utf8")
    .match(/^DATABASE_URL\s*=\s*"?([^"\n\r]*)"?\s*$/m);
  return match ? match[1] : null;
}

// Mirrors Next.js's own env precedence (process.env > .env.local > .env),
// since this script runs as a plain `node` call (via npm's pre-script
// hooks) before Next or Prisma has loaded any dotenv file itself. .env.local
// matters here: a `vercel env pull` drops real Postgres credentials there,
// which `next dev` then actually connects with regardless of what .env
// says — this has to check the same file `next dev` would end up using, or
// the schema provider set below wouldn't match the URL protocol.
function resolveDatabaseUrl() {
  return process.env.DATABASE_URL || readEnvFile(".env.local") || readEnvFile(".env") || "";
}

const schemaPath = path.join(__dirname, "..", "prisma", "schema.prisma");
const url = resolveDatabaseUrl();
const provider = url.startsWith("file:") ? "sqlite" : "postgresql";

const schema = fs.readFileSync(schemaPath, "utf8");
const updated = schema.replace(
  /(datasource\s+db\s*\{[^}]*provider\s*=\s*)"[^"]+"/,
  `$1"${provider}"`
);

if (updated !== schema) {
  fs.writeFileSync(schemaPath, updated);
  console.log(`prisma/schema.prisma: datasource provider set to "${provider}" (from DATABASE_URL)`);
}
