// Shared night-scene backdrop for the landing page's dark sections (hero and
// closing CTA): drifting aurora glow, a dusk skyline, film grain, and a
// vignette. Purely decorative (aria-hidden), stacked in paint order below.
import FilmGrain from "./FilmGrain";
import HeroSkyline from "./HeroSkyline";

export default function CinematicBackdrop({
  vignette = true,
  skylineClassName,
}: {
  vignette?: boolean;
  skylineClassName?: string;
}) {
  return (
    <>
      <div
        aria-hidden
        className="hero-aurora pointer-events-none absolute inset-0 opacity-80"
        style={{
          background:
            "radial-gradient(circle at 18% 25%, #FF4F93, transparent 55%), radial-gradient(circle at 82% 15%, #2F5FF0, transparent 50%), radial-gradient(circle at 50% 105%, #FF6A3D, transparent 55%)",
        }}
      />
      <HeroSkyline className={skylineClassName} />
      <FilmGrain />
      {vignette && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ background: "radial-gradient(ellipse at 50% 35%, transparent 35%, rgba(6,5,12,0.6) 100%)" }}
        />
      )}
    </>
  );
}
