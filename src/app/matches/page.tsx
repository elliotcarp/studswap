// List of mutual matches. GET /api/matches -> list of MatchSummary.

import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Navbar from "@/components/Navbar";
import MatchesView from "./MatchesView";

export default async function MatchesPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/signup");
  }

  return (
    <>
      <MatchesView />
      <Navbar />
    </>
  );
}
