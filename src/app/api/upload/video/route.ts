import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { authOptions } from "@/lib/auth";
import { rateLimit } from "@/lib/rateLimit";

// Client-upload token endpoint for flat walkthrough videos: the browser
// uploads the file bytes straight to Blob storage (see VideoUploader.tsx),
// never through this route, which only ever handles small JSON requests
// (the token handshake). Unlike /api/upload (photos), a server-proxied
// upload isn't an option here — videos routinely exceed the ~4.5MB request
// body limit on a Vercel serverless function, photos don't once resized.
const ALLOWED_TYPES = ["video/mp4", "video/quicktime", "video/webm"];
const MAX_SIZE_BYTES = 150 * 1024 * 1024;

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  const uploaderKey = (session.user as { id?: string }).id ?? session.user.email ?? "unknown";
  if (!rateLimit(`upload-video:${uploaderKey}`, 10, 10 * 60 * 1000).allowed) {
    return NextResponse.json({ error: "Slow down a bit and try again shortly." }, { status: 429 });
  }

  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      token: process.env.PHOTOS_READ_WRITE_TOKEN,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: ALLOWED_TYPES,
        maximumSizeInBytes: MAX_SIZE_BYTES,
        addRandomSuffix: true,
      }),
      onUploadCompleted: async () => {
        // No DB write needed here: the client sets the returned blob URL
        // into the onboarding/profile form state itself, which is what
        // actually persists it (see POST /api/profile).
      },
    });
    return NextResponse.json(jsonResponse);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not start upload" },
      { status: 400 }
    );
  }
}
