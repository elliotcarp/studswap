// Custom-drawn dusk skyline for the cinematic landing hero: two silhouette
// depth layers plus a scatter of lit windows that twinkle (see the `twinkle`
// keyframe in globals.css, disabled under prefers-reduced-motion). Deterministic
// (seeded, not Math.random) so server-rendered markup never drifts.

function seeded(seed: number) {
  // Cheap, deterministic pseudo-random in [0, 1), stable across renders.
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

interface Building {
  x: number;
  width: number;
  height: number;
}

function buildRow(count: number, seedOffset: number, viewWidth: number, minH: number, maxH: number): Building[] {
  const buildings: Building[] = [];
  let x = -20;
  for (let i = 0; i < count; i++) {
    const width = 40 + seeded(i + seedOffset) * 55;
    const height = minH + seeded(i + seedOffset + 100) * (maxH - minH);
    buildings.push({ x, width, height });
    x += width + 6 + seeded(i + seedOffset + 200) * 10;
    if (x > viewWidth + 20) break;
  }
  return buildings;
}

const VIEW_W = 1440;
const VIEW_H = 480;
const backRow = buildRow(30, 0, VIEW_W, 90, 230);
const frontRow = buildRow(22, 50, VIEW_W, 150, 420);

// A handful of front-row windows get the twinkle treatment; the rest stay
// steadily lit, so the skyline reads as alive without turning noisy.
function windowsFor(building: Building, bIndex: number) {
  const cols = Math.max(2, Math.floor(building.width / 18));
  const rows = Math.max(2, Math.floor(building.height / 22));
  const lit: { x: number; y: number; twinkle: boolean; delay: number }[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const s = seeded(bIndex * 97 + r * 13 + c * 31);
      if (s > 0.62) continue; // most panes stay dark, night-time silhouette
      lit.push({
        x: building.x + 8 + c * (building.width / cols),
        y: VIEW_H - 14 - r * (building.height / rows),
        twinkle: s > 0.5,
        delay: seeded(bIndex * 41 + r * 7 + c) * 6,
      });
    }
  }
  return lit;
}

export default function HeroSkyline({ className = "h-[62vh] min-h-[340px]" }: { className?: string }) {
  return (
    <svg
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      preserveAspectRatio="xMidYMax slice"
      aria-hidden
      className={`absolute inset-x-0 bottom-0 w-full ${className}`}
    >
      {/* Back row: hazier, bluer, further away */}
      <g fill="#2A2740" opacity={0.55}>
        {backRow.map((b, i) => (
          <rect key={i} x={b.x} y={VIEW_H - b.height} width={b.width} height={b.height + 4} />
        ))}
      </g>

      {/* Front row: the true silhouette line against the glow */}
      <g fill="#141220">
        {frontRow.map((b, i) => (
          <rect key={i} x={b.x} y={VIEW_H - b.height} width={b.width} height={b.height + 4} />
        ))}
      </g>

      {/* Lit windows, scattered across the front row, some twinkling */}
      {frontRow.map((b, bi) =>
        windowsFor(b, bi).map((w, wi) => (
          <rect
            key={`${bi}-${wi}`}
            x={w.x}
            y={w.y}
            width={2.5}
            height={4}
            rx={0.5}
            fill={wi % 5 === 0 ? "#D4FF3D" : "#FFC98A"}
            className={w.twinkle ? "hero-window-twinkle" : undefined}
            style={w.twinkle ? { animationDelay: `${w.delay}s` } : undefined}
            opacity={w.twinkle ? undefined : 0.85}
          />
        ))
      )}
    </svg>
  );
}
