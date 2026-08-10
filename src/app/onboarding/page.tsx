// First-time profile creation: Hinge-style multi-step wizard.
// If a profile already exists, editing happens on /profile instead of redoing
// the whole wizard.

import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import OnboardingWizard from "./OnboardingWizard";
import AcceptTermsGate from "./AcceptTermsGate";

export default async function OnboardingPage() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) {
    redirect("/signup");
  }

  const [user, existingProfile] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { acceptedTermsAt: true } }),
    prisma.profile.findUnique({ where: { userId } }),
  ]);

  if (existingProfile) {
    redirect("/profile");
  }

  if (!user?.acceptedTermsAt) {
    return <AcceptTermsGate />;
  }

  return <OnboardingWizard />;
}
