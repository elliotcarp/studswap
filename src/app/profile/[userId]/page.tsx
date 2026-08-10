// Read-only view of another user's profile, reached by tapping a name/photo
// on the Liked or Matches tabs.

import { redirect, notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toProfileCardData } from "@/lib/profileMapping";
import ProfileCard from "@/components/ProfileCard";
import BackButton from "@/components/BackButton";

export default async function UserProfilePage({ params }: { params: { userId: string } }) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) {
    redirect("/signup");
  }
  if (params.userId === userId) {
    redirect("/profile");
  }

  const profile = await prisma.profile.findUnique({ where: { userId: params.userId } });
  if (!profile) {
    notFound();
  }

  return (
    <main className="flex h-screen flex-col items-center bg-gray-50 p-4">
      <div className="mb-3 w-full max-w-md">
        <BackButton />
      </div>
      <div className="relative h-[calc(100vh-4.5rem)] w-full max-w-md">
        <ProfileCard profile={toProfileCardData(params.userId, profile)} ratingDisplay="full" />
      </div>
    </main>
  );
}
