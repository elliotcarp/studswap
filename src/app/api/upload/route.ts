import { randomUUID } from "crypto";
import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { rateLimit } from "@/lib/rateLimit";

// Photo storage via Vercel Blob (public access, since profile/flat photos
// are shown to matched/prospective counterparts). Writing to the local
// filesystem, as this route used to, doesn't work once deployed: Vercel's
// serverless functions run on a read-only filesystem, so every upload
// silently failed in production.
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const MAX_SIZE_BYTES = 8 * 1024 * 1024;

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  const uploaderKey = (session.user as { id?: string }).id ?? session.user.email ?? "unknown";
  if (!rateLimit(`upload:${uploaderKey}`, 30, 10 * 60 * 1000).allowed) {
    return NextResponse.json({ error: "Slow down a bit and try again shortly." }, { status: 429 });
  }

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });
  }
  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json({ error: "File too large (max 8MB)" }, { status: 400 });
  }

  const ext = file.type.split("/")[1];
  const filename = `${randomUUID()}.${ext}`;
  const blob = await put(filename, file, {
    access: "public",
    token: process.env.PHOTOS_READ_WRITE_TOKEN,
  });

  return NextResponse.json({ url: blob.url });
}
