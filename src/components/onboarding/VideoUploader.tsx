"use client";

// Optional flat walkthrough video: a single slot, uploaded straight from the
// browser to Blob storage (see /api/upload/video) rather than proxied
// through a server route like PhotoGridEditor's photos — videos routinely
// exceed the ~4.5MB body limit a Vercel serverless function will accept.

import { useRef, useState } from "react";
import { upload } from "@vercel/blob/client";

const ALLOWED_TYPES = new Set(["video/mp4", "video/quicktime", "video/webm"]);
const MAX_SIZE_BYTES = 150 * 1024 * 1024;

export default function VideoUploader({
  value,
  onChange,
}: {
  value: string;
  onChange: (url: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setError(null);

    if (!ALLOWED_TYPES.has(file.type)) {
      setError("Unsupported video format. Try MP4, MOV, or WebM.");
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      setError(`That video is too large (max ${MAX_SIZE_BYTES / (1024 * 1024)}MB).`);
      return;
    }

    setUploading(true);
    try {
      const blob = await upload(file.name, file, {
        access: "public",
        handleUploadUrl: "/api/upload/video",
      });
      onChange(blob.url);
    } catch {
      setError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  if (uploading) {
    return (
      <div className="flex aspect-video w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 text-sm text-gray-400">
        <span>Uploading…</span>
      </div>
    );
  }

  if (value) {
    return (
      <div className="flex flex-col gap-2">
        <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-black">
          <video src={value} controls className="h-full w-full" />
          <button
            type="button"
            onClick={() => onChange("")}
            aria-label="Remove video"
            className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-sm text-white"
          >
            ×
          </button>
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="flex aspect-video w-full cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-gray-300 text-gray-400 transition-transform active:scale-[0.98]">
        <span className="text-2xl">🎬</span>
        <span className="text-sm">Add a video</span>
        <input
          ref={inputRef}
          type="file"
          accept="video/mp4,video/quicktime,video/webm"
          onChange={(e) => {
            handleFile(e.target.files?.[0]);
            e.target.value = "";
          }}
          className="hidden"
        />
      </label>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
