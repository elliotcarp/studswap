"use client";

// Sign up: email + password, creates the account and logs in immediately.
// Sign in: email + password for returning users; a magic link is offered as
// a fallback there for anyone who forgot their password (or signed up before
// password auth existed and never set one).
// Domain check happens server-side (see src/lib/auth.ts and /api/auth/register).

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import Spinner from "@/components/Spinner";

export default function SignupPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"signup" | "signin">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [linkSent, setLinkSent] = useState(false);

  function accessDeniedMessage() {
    return "That doesn't look like a university email. Use your university address (e.g. name@student.uni-leipzig.de).";
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(
          res.status === 409
            ? "An account with this email already has a password. Switch to Sign in."
            : (data?.error ?? "Something went wrong. Please try again.")
        );
        return;
      }

      const result = await signIn("credentials", { email, password, redirect: false });
      if (result?.error) {
        setError(result.error === "AccessDenied" ? accessDeniedMessage() : "Something went wrong signing you in.");
        return;
      }
      router.push("/onboarding");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const result = await signIn("credentials", { email, password, redirect: false });
      if (result?.error) {
        setError(
          result.error === "AccessDenied"
            ? accessDeniedMessage()
            : "Incorrect email or password. If this account doesn't have a password yet, try Sign up, or send yourself a magic link below."
        );
        return;
      }
      router.push("/onboarding");
    } finally {
      setSubmitting(false);
    }
  }

  async function sendMagicLink() {
    setError(null);
    setSubmitting(true);
    try {
      // redirect: false lets us read the result inline instead of bouncing
      // through a full-page redirect just to find out the domain was rejected.
      const result = await signIn("email", { email, callbackUrl: "/onboarding", redirect: false });
      if (result?.error) {
        setError(
          result.error === "AccessDenied" ? accessDeniedMessage() : "Something went wrong sending your sign-in link."
        );
        return;
      }
      setLinkSent(true);
      router.push("/verify");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col justify-center p-6">
      <div className="mx-auto w-full max-w-sm">
        <h1 className="font-display text-2xl font-bold mb-2">Welcome</h1>
        <p className="text-gray-600 mb-6">Use your university email to get started.</p>

        <div className="mb-4 flex rounded-lg border border-gray-300 p-1 text-sm">
          <button
            type="button"
            onClick={() => {
              setTab("signup");
              setError(null);
            }}
            className={`flex-1 rounded-md py-1.5 font-medium ${
              tab === "signup" ? "bg-riviera text-white" : "text-gray-600"
            }`}
          >
            Sign up
          </button>
          <button
            type="button"
            onClick={() => {
              setTab("signin");
              setError(null);
            }}
            className={`flex-1 rounded-md py-1.5 font-medium ${
              tab === "signin" ? "bg-riviera text-white" : "text-gray-600"
            }`}
          >
            Sign in
          </button>
        </div>

        <form onSubmit={tab === "signup" ? handleSignUp : handleSignIn} className="flex flex-col gap-3">
          <label htmlFor="email" className="text-sm font-medium text-gray-700">
            University email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@student.uni-leipzig.de"
            className="rounded-lg border border-gray-300 px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-gray-400"
          />

          <label htmlFor="password" className="text-sm font-medium text-gray-700">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete={tab === "signup" ? "new-password" : "current-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={tab === "signup" ? "At least 8 characters" : "Your password"}
            className="rounded-lg border border-gray-300 px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-gray-400"
          />

          {error && (
            <p role="alert" className="text-sm text-red-600">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="mt-2 flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-bloom to-riviera px-4 py-3 text-base font-medium text-white shadow-lg shadow-bloom/30 disabled:opacity-60"
          >
            {submitting && <Spinner />}
            {submitting
              ? tab === "signup"
                ? "Verifying your student email…"
                : "Signing in…"
              : tab === "signup"
                ? "Create account"
                : "Sign in"}
          </button>
          {submitting && tab === "signup" && (
            <p className="text-center text-xs text-gray-400">
              We're checking that your email belongs to a real university. This can take a few seconds.
            </p>
          )}
        </form>

        {tab === "signin" && (
          <button
            type="button"
            onClick={sendMagicLink}
            disabled={submitting || !email || linkSent}
            className="mt-3 flex w-full items-center justify-center gap-1.5 text-center text-sm font-medium text-gray-500 underline disabled:opacity-50"
          >
            {submitting && <Spinner className="h-3.5 w-3.5" />}
            {linkSent ? "Link sent. Check your email" : "Forgot your password? Email me a sign-in link instead"}
          </button>
        )}

        <p className="mt-6 text-center text-xs text-gray-400">
          By continuing, you agree to StudSwap&apos;s{" "}
          <Link href="/terms" target="_blank" className="underline">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link href="/privacy" target="_blank" className="underline">
            Privacy Policy
          </Link>
          . You&apos;ll confirm this again before setting up your profile.
        </p>
      </div>
    </main>
  );
}
