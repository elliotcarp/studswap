"use client";

// Photo grid, Hinge-style ("Pair your photos and videos with prompts").
// Shows existing photos plus a single trailing "+" tile (rather than
// pre-rendering every remaining empty slot) since the range is wide.
// Uploads go to /api/upload (Vercel Blob storage), after being resized/
// re-encoded client-side (see resizeImage.ts). Parent only cares about the
// final list of photo URLs.
//
// Reordering is real drag-and-drop (skill §2: direct manipulation, 1:1
// tracking), built on Framer Motion's Reorder.Group/Item — the same
// pointer-driven drag engine SwipeCardStack uses, just the list-reorder
// flavor of it, with sibling tiles reflowing via spring `layout`
// animations as a dragged tile crosses them. The "Make profile picture"
// button stays alongside drag (not replaced by it) so promoting a photo to
// the first slot is still reachable without a pointer gesture.

import { useRef, useState } from "react";
import { Reorder } from "framer-motion";
import { resizeImageFile } from "@/lib/resizeImage";

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
  coverLabel = "Profile picture",
  minIsRecommended = false,
}: {
  photoUrls: string[];
  onChange: (urls: string[]) => void;
  minCount: number;
  maxCount: number;
  // Labels the first photo and lets others be promoted into that slot —
  // "Profile picture" for the "photos of you" grid, "Cover photo" for the
  // "photos of the flat" grid, since that one now leads the card (see
  // ProfileCard.tsx).
  markProfilePicture?: boolean;
  coverLabel?: string;
  // Onboarding's photo steps are skippable (see OnboardingWizard.tsx), so
  // minCount there is no longer enforced — show it as guidance, not a
  // requirement.
  minIsRecommended?: boolean;
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
        // Resize/re-encode before upload: normalizes phone photos (which
        // can be an unsupported format like HEIC, or bigger than the
        // server accepts) to a JPEG that reliably clears both checks.
        let resized: File;
        try {
          resized = await resizeImageFile(file);
        } catch {
          throw new Error(`Couldn't read "${file.name}" — try a JPEG, PNG, or screenshot of it instead.`);
        }

        const formData = new FormData();
        formData.append("file", resized);
        const res = await fetch("/api/upload", { method: "POST", body: formData });
        if (!res.ok) throw new Error("Upload failed");
        const data = await res.json();
        setPhotos((prev) => {
          const next = prev.map((p) => (p.id === id ? { ...p, url: data.url, uploading: false } : p));
          onChange(next.filter((p) => !p.uploading).map((p) => p.url));
          return next;
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "One of your photos failed to upload. Please try again.");
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
      <div className="flex flex-wrap gap-2">
        <Reorder.Group
          as="div"
          axis="x"
          values={photos}
          onReorder={emit}
          className="contents"
        >
          {photos.map((photo, index) => (
            <Reorder.Item
              key={photo.id}
              value={photo}
              as="div"
              // Uploading tiles aren't draggable yet — nothing to reorder
              // until the URL exists — but still render in place.
              dragListener={!photo.uploading}
              whileDrag={{ scale: 1.05, zIndex: 1, boxShadow: "0 8px 24px rgba(0,0,0,0.25)" }}
              className="relative aspect-square w-[calc((100%-1rem)/3)] cursor-grab touch-none overflow-hidden rounded-lg border border-gray-200 bg-gray-100 active:cursor-grabbing"
            >
              {photo.uploading ? (
                <div className="flex h-full w-full items-center justify-center text-xs text-gray-400">
                  Uploading…
                </div>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photo.url} alt="" className="h-full w-full object-cover" draggable={false} />
              )}
              {!photo.uploading && markProfilePicture && index === 0 && (
                <span className="absolute bottom-1 left-1 rounded-full bg-riviera px-2 py-0.5 text-[10px] font-medium text-white">
                  {coverLabel}
                </span>
              )}
              {!photo.uploading && markProfilePicture && index !== 0 && (
                <button
                  type="button"
                  onClick={() => makeProfilePicture(photo.id)}
                  className="absolute bottom-1 left-1 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white"
                >
                  Make {coverLabel.toLowerCase()}
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
            </Reorder.Item>
          ))}
        </Reorder.Group>
        {canAddMore && (
          <label className="flex aspect-square w-[calc((100%-1rem)/3)] cursor-pointer items-center justify-center rounded-lg border border-dashed border-gray-300 text-2xl text-gray-300 transition-transform active:scale-95">
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
        {photos.length} added ({minIsRecommended ? "recommended" : "min"} {minCount}, up to {maxCount})
      </p>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
