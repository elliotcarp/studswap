// Shown after a magic link email has been sent. Simple confirmation screen.

import Link from "next/link";

export default function VerifyRequestPage() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-6 text-center">
      <div className="w-full max-w-sm">
        <h1 className="font-display text-xl font-bold mb-2">Check your email</h1>
        <p className="text-gray-600">
          We sent you a sign-in link. Open it on this device to finish signing in.
        </p>
        <Link href="/signup" className="mt-6 inline-block text-sm text-riviera underline">
          Use a different email
        </Link>
      </div>
    </main>
  );
}
