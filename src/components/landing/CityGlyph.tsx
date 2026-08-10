// Tiny mono-line skyline mark for the destinations strip: a scaled-down
// cousin of HeroSkyline's deterministic silhouette, one seed per city so
// each glyph looks distinct without needing real photography. Renders in
// currentColor so callers tint it per section.

function seeded(seed: number) {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

const VIEW_W = 160;
const VIEW_H = 90;

function buildingsFor(seed: number) {
  const buildings: { x: number; width: number; height: number }[] = [];
  let x = 0;
  let i = 0;
  while (x < VIEW_W) {
    const width = 14 + seeded(seed + i) * 16;
    const height = 26 + seeded(seed + i + 50) * 56;
    buildings.push({ x, width, height });
    x += width + 3 + seeded(seed + i + 90) * 6;
    i += 1;
  }
  return buildings;
}

export default function CityGlyph({ seed, className = "h-10 w-16" }: { seed: number; className?: string }) {
  const buildings = buildingsFor(seed);
  return (
    <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} preserveAspectRatio="xMidYMax meet" aria-hidden className={className}>
      <g fill="currentColor">
        {buildings.map((b, i) => (
          <rect key={i} x={b.x} y={VIEW_H - b.height} width={b.width} height={b.height} />
        ))}
      </g>
    </svg>
  );
}
