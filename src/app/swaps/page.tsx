// List of confirmed swaps. GET /api/swaps -> list of SwapSummary.

import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Navbar from "@/components/Navbar";
import SwapsView from "./SwapsView";

export default async function SwapsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/signup");
  }

  return (
    <>
      <SwapsView />
      <Navbar />
    </>
  );
}
