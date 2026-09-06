import { PrismaAdapter } from "@next-auth/prisma-adapter";
import type { NextAuthOptions } from "next-auth";
import EmailProvider from "next-auth/providers/email";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import { isAllowedUniversityEmailWithAIFallback } from "@/lib/allowedDomains";
import { verifyPassword } from "@/lib/password";
import { rateLimit } from "@/lib/rateLimit";

const adapter = PrismaAdapter(prisma);
// @next-auth/prisma-adapter's deleteSession calls prisma.session.delete() with no
// guard for a missing row, so it throws (P2025) whenever next-auth tries to
// invalidate a session tied to a stale/already-deleted cookie (e.g. a duplicate
// callback request), crashing the whole sign-in flow. Swallow the not-found case.
adapter.deleteSession = async (sessionToken) => {
  try {
    return await prisma.session.delete({ where: { sessionToken } });
  } catch {
    return null;
  }
};

export const authOptions: NextAuthOptions = {
  adapter,
  providers: [
    EmailProvider({
      server: {
        host: process.env.EMAIL_SERVER_HOST,
        port: Number(process.env.EMAIL_SERVER_PORT),
        auth: {
          user: process.env.EMAIL_SERVER_USER,
          pass: process.env.EMAIL_SERVER_PASSWORD,
        },
      },
      from: process.env.EMAIL_FROM,
      // Outside production, skip the real SMTP send (the .env.example creds are
      // placeholders) and print the magic link to the server console instead, so
      // the full signup flow is testable locally with no email provider set up.
      ...(process.env.NODE_ENV !== "production" && {
        async sendVerificationRequest({ identifier, url }) {
          console.log(`\n[dev] Magic sign-in link for ${identifier}:\n${url}\n`);
        },
      }),
    }),
    CredentialsProvider({
      name: "Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        // Blunt credential-stuffing/brute-force against a single account —
        // keyed by email rather than IP since that's the actual attack
        // surface here (repeated password guesses against one target).
        const key = `login:${credentials.email.toLowerCase()}`;
        if (!rateLimit(key, 50, 60 * 60 * 1000).allowed) return null;
        const user = await prisma.user.findUnique({ where: { email: credentials.email } });
        if (!user?.passwordHash) return null;
        if (!verifyPassword(credentials.password, user.passwordHash)) return null;
        return { id: user.id, email: user.email };
      },
    }),
  ],
  callbacks: {
    // Reject sign-in attempts from non-university email domains before a magic link is even sent.
    // Only actually runs the (AI-fallback-including) check for a brand-new
    // account — an existing User row means this email already passed it once
    // (at credentials registration, or the first magic-link verification),
    // and domains don't change, so every subsequent login shouldn't re-spend
    // an AI call just because it happens to hit this callback again.
    async signIn({ user }) {
      if (!user.email) return false;
      const existing = await prisma.user.findUnique({
        where: { email: user.email },
        select: { id: true },
      });
      if (existing) return true;
      return isAllowedUniversityEmailWithAIFallback(user.email);
    },
    // Credentials provider requires JWT sessions (no adapter-backed session row is
    // created for it), so user.id is only available on the initial sign-in and has
    // to be persisted onto the token to survive later requests.
    async jwt({ token, user }) {
      if (user) token.id = user.id;
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        // JWT sessions are stateless: NextAuth trusts the signed cookie
        // without a DB round trip, so a session for a user deleted after
        // sign-in (e.g. a cleaned-up test account) still looks "valid" and
        // reports an id no row matches. Every page/route downstream keys off
        // `session.user.id` as its logged-in check, so a dangling id doesn't
        // fail loudly there — it fails confusingly, several steps later, as
        // a generic "could not save" once some unrelated write 404s against
        // a user that isn't there. Check existence here, once, and simply
        // leave id unset for a stale session so those checks correctly see
        // "not logged in" instead.
        const exists = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { id: true },
        });
        (session.user as { id?: string }).id = exists ? (token.id as string) : undefined;
      }
      return session;
    },
  },
  pages: {
    signIn: "/signup",
    verifyRequest: "/verify",
  },
  session: {
    strategy: "jwt",
  },
};
