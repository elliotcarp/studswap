// Round avatar used in the Matches/Liked/Swaps lists. Falls back to a
// plain person silhouette (see icons.tsx) instead of a remote placehold.co
// image with "?" burned into it as text, so a slow/blocked network doesn't
// leave a broken-image icon where a placeholder should be.

import clsx from "clsx";
import { UserRoundIcon } from "@/components/icons";

export default function Avatar({
  src,
  alt = "",
  className,
}: {
  src: string | null;
  alt?: string;
  className?: string;
}) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} className={clsx("object-cover", className)} />;
  }
  return (
    <div
      className={clsx(
        "flex items-center justify-center bg-gradient-to-br from-riviera/20 to-bloom/20 text-riviera",
        className
      )}
    >
      <UserRoundIcon className="h-3/5 w-3/5" strokeWidth={1.5} />
    </div>
  );
}
