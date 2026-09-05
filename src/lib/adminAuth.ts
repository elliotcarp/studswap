import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// Admin gating for the internal /admin surface (payouts owed, no-show
// reports, settlement disputes, the manual "our fault" refund trigger) —
// deliberately an env allow-list rather than a User.isAdmin DB column, so
// there's no new sensitive flag sitting in the database that a bug or a
// compromised account could flip. Set ADMIN_EMAILS as a comma-separated
// list of the exact sign-in emails that should have access.
export async function getAdminEmail(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  if (!email) return null;

  const allowed = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  return allowed.includes(email.toLowerCase()) ? email : null;
}
