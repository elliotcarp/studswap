import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { isAllowedUniversityEmailWithAIFallback } from "@/lib/allowedDomains";
import { hashPassword } from "@/lib/password";
import { rateLimit, getClientIp } from "@/lib/rateLimit";

const registerSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8, "Password must be at least 8 characters").max(200),
});

// POST: create (or add a password to) an account for password-based sign-in.
// The client follows this up with signIn("credentials", ...) to log in.
export async function POST(request: Request) {
  const ip = getClientIp(request);
  const { allowed, retryAfterMs } = rateLimit(`register:${ip}`, 5, 15 * 60 * 1000);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many signup attempts. Try again in a few minutes." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(retryAfterMs / 1000)) } }
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid signup" },
      { status: 400 }
    );
  }

  const { email, password } = parsed.data;
  if (!(await isAllowedUniversityEmailWithAIFallback(email))) {
    return NextResponse.json(
      { error: "That doesn't look like a university email. Sign up with your university address." },
      { status: 400 }
    );
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing?.passwordHash) {
    return NextResponse.json(
      { error: "An account with this email already has a password. Log in instead." },
      { status: 409 }
    );
  }

  const passwordHash = hashPassword(password);
  if (existing) {
    await prisma.user.update({ where: { id: existing.id }, data: { passwordHash } });
  } else {
    await prisma.user.create({ data: { email, passwordHash, emailVerified: new Date() } });
  }

  return NextResponse.json({ ok: true });
}
