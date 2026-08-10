"use client";

// Photo grid, Hinge-style ("Pair your photos and videos with prompts").
// Shows existing photos plus a single trailing "+" tile (rather than
// pre-rendering every remaining empty slot) since the range is wide.
// Uploads go to /api/upload (local disk storage in dev); parent only cares
// about the final list of photo URLs.

import { useRef, useState } from "react";

interface Photo {
  id: string;
  url: string;
  uploading: boolean;
}

export default function PhotoGridEditor({
  photoUrls,
  onChange,
  minCount,
  maxCount,
  markProfilePicture = false,
}: {
  photoUrls: string[];
  onChange: (urls: string[]) => void;
  minCount: number;
  maxCount: number;
  // Labels the first photo as "Profile picture" and lets others be promoted
  // into that slot, only meaningful for the "photos of you" grid.
  markProfilePicture?: boolean;
}) {
  const nextId = useRef(0);
  const [photos, setPhotos] = useState<Photo[]>(
    photoUrls.map((url) => ({ id: String(nextId.current++), url, uploading: false }))
  );
  const [error, setError] = useState<string | null>(null);

  function emit(next: Photo[]) {
    setPhotos(next);
    onChange(next.filter((p) => !p.uploading).map((p) => p.url));
  }

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError(null);

    const room = maxCount - photos.length;
    const toUpload = Array.from(files).slice(0, room);

    for (const file of toUpload) {
      const id = String(nextId.current++);
      setPhotos((prev) => {
        const next = [...prev, { id, url: "", uploading: true }];
        return next;
      });

      try {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/upload", { method: "POST", body: formData });
        if (!res.ok) throw new Error("Upload failed");
        const data = await res.json();
        setPhotos((prev) => {
          const next = prev.map((p) => (p.id === id ? { ...p, url: data.url, uploading: false } : p));
          onChange(next.filter((p) => !p.uploading).map((p) => p.url));
          return next;
        });
      } catch {
        setError("One of your photos failed to upload. Please try again.");
        setPhotos((prev) => {
          const next = prev.filter((p) => p.id !== id);
          onChange(next.filter((p) => !p.uploading).map((p) => p.url));
          return next;
        });
      }
    }
  }

  function removePhoto(id: string) {
    emit(photos.filter((p) => p.id !== id));
  }

  // The first photo is your profile picture: it's what shows on candidate
  // cards, matches, and the liked list, so let people promote a later photo
  // to that slot instead of forcing them to re-upload in order.
  function makeProfilePicture(id: string) {
    const target = photos.find((p) => p.id === id);
    if (!target) return;
    emit([target, ...photos.filter((p) => p.id !== id)]);
  }

  const canAddMore = photos.length < maxCount;

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-3 gap-2">
        {photos.map((photo, index) => (
          <div
            key={photo.id}
            className="relative aspect-square overflow-hidden rounded-lg border border-gray-200 bg-gray-100"
          >
            {photo.uploading ? (
              <div className="flex h-full w-full items-center justify-center text-xs text-gray-400">
                Uploading…
              </div>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photo.url} alt="" className="h-full w-full object-cover" />
            )}
            {!photo.uploading && markProfilePicture && index === 0 && (
              <span className="absolute bottom-1 left-1 rounded-full bg-riviera px-2 py-0.5 text-[10px] font-medium text-white">
                Profile picture
              </span>
            )}
            {!photo.uploading && markProfilePicture && index !== 0 && (
              <button
                type="button"
                onClick={() => makeProfilePicture(photo.id)}
                className="absolute bottom-1 left-1 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white"
              >
                Make profile picture
              </button>
            )}
            {!photo.uploading && (
              <button
                type="button"
                onClick={() => removePhoto(photo.id)}
                aria-label="Remove photo"
                className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-sm text-white"
              >
                ×
              </button>
            )}
          </div>
        ))}
        {canAddMore && (
          <label className="flex aspect-square cursor-pointer items-center justify-center rounded-lg border border-dashed border-gray-300 text-2xl text-gray-300">
            +
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => {
                handleFiles(e.target.files);
                e.target.value = "";
              }}
              className="hidden"
            />
          </label>
        )}
      </div>
      <p className="text-xs text-gray-400">
        {photos.length} added (min {minCount}, up to {maxCount})
      </p>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
