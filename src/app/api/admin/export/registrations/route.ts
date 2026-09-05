import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminEmail } from "@/lib/adminAuth";

function csvEscape(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

// GET: CSV export of every listing's short-term rental registration status
// (EU 2024/1028). No reporting logic yet — collection only, per the brief,
// pending legal advice on exactly what's required — this just makes sure
// what's already collected can actually be pulled out.
export async function GET() {
  const adminEmail = await getAdminEmail();
  if (!adminEmail) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const profiles = await prisma.profile.findMany({
    select: {
      userId: true,
      name: true,
      homeCity: true,
      shortTermRentalRegistrationNumber: true,
      shortTermRentalRegistrationExempt: true,
    },
    orderBy: { name: "asc" },
  });

  const header = "userId,name,homeCity,shortTermRentalRegistrationNumber,shortTermRentalRegistrationExempt";
  const rows = profiles.map((p) =>
    [
      p.userId,
      csvEscape(p.name),
      csvEscape(p.homeCity),
      csvEscape(p.shortTermRentalRegistrationNumber ?? ""),
      p.shortTermRentalRegistrationExempt ? "true" : "false",
    ].join(",")
  );
  const csv = [header, ...rows].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=registrations.csv",
    },
  });
}
