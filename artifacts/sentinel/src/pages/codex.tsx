import { useState, useMemo } from "react";
import { ShieldAlert } from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────

type PathState = 1 | -1 | 0 | "dormant";

interface Guardian {
  name: string;
  glyph: string;
  start: number;
  end: number;
  color: string;
  angelu: number;
  deminu: number;
  neutral: number;
  dormant: number;
  net: number;
}

interface PathNode {
  id: number;
  guardian: Guardian;
  state: PathState;
  angle: number; // degrees from top, clockwise
}

// ── Guardian configuration (canonical) ───────────────────────────────────────

const GUARDIANS: Guardian[] = [
  { name: "Lion",    glyph: "♌", start: 1,  end: 19, color: "#f59e0b", angelu: 8, deminu: 5, neutral: 5, dormant: 1, net: +3 },
  { name: "Phoenix", glyph: "✦", start: 20, end: 38, color: "#f97316", angelu: 9, deminu: 4, neutral: 4, dormant: 2, net: +5 },
  { name: "Dragon",  glyph: "♐", start: 39, end: 57, color: "#f43f5e", angelu: 5, deminu: 7, neutral: 5, dormant: 2, net: -2 },
  { name: "Owl",     glyph: "⊙", start: 58, end: 76, color: "#0dd4f0", angelu: 5, deminu: 5, neutral: 7, dormant: 2, net:  0 },
  { name: "Raven",   glyph: "♆", start: 77, end: 96, color: "#7e47eb", angelu: 3, deminu: 7, neutral: 7, dormant: 3, net: -4 },
];

// ── Seeded deterministic state generation ─────────────────────────────────────

function seededLCG(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = Math.imul(s, 1664525) + 1013904223;
    return (s >>> 0) / 4294967296;
  };
}

function shuffleWithSeed<T>(arr: T[], rand: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function hasCluster(arr: PathState[], maxRun = 3): boolean {
  let run = 1;
  for (let i = 1; i < arr.length; i++) {
    if (arr[i] === arr[i - 1] && arr[i] !== "dormant") {
      run++;
      if (run > maxRun) return true;
    } else run = 1;
  }
  return false;
}

function breakClusters(arr: PathState[], rand: () => number): PathState[] {
  const a = [...arr];
  let attempts = 0;
  while (hasCluster(a, 3) && attempts < 500) {
    const i = Math.floor(rand() * a.length);
    const j = Math.floor(rand() * a.length);
    if (i !== j) [a[i], a[j]] = [a[j], a[i]];
    attempts++;
  }
  return a;
}

function dormantNonAdjacent(arr: PathState[], rand: () => number): PathState[] {
  const a = [...arr];
  let attempts = 0;
  function hasAdjacentDormant(): boolean {
    for (let i = 0; i < a.length - 1; i++) {
      if (a[i] === "dormant" && a[i + 1] === "dormant") return true;
    }
    return false;
  }
  while (hasAdjacentDormant() && attempts < 500) {
    const dormantIdx = a.map((s, i) => (s === "dormant" ? i : -1)).filter(i => i >= 0);
    const nonDormantIdx = a.map((s, i) => (s !== "dormant" ? i : -1)).filter(i => i >= 0);
    if (dormantIdx.length && nonDormantIdx.length) {
      const di = dormantIdx[Math.floor(rand() * dormantIdx.length)];
      const ni = nonDormantIdx[Math.floor(rand() * nonDormantIdx.length)];
      [a[di], a[ni]] = [a[ni], a[di]];
    }
    attempts++;
  }
  return a;
}

function generateGuardianStates(g: Guardian, rand: () => number): PathState[] {
  const pool: PathState[] = [
    ...Array<PathState>(g.angelu).fill(1),
    ...Array<PathState>(g.deminu).fill(-1),
    ...Array<PathState>(g.neutral).fill(0),
    ...Array<PathState>(g.dormant).fill("dormant"),
  ];
  let arr = shuffleWithSeed(pool, rand);
  arr = breakClusters(arr, rand);
  arr = dormantNonAdjacent(arr, rand);
  return arr;
}

function buildLattice(): PathNode[] {
  const rand = seededLCG(0xC0DE96);
  const nodes: PathNode[] = [];
  for (const g of GUARDIANS) {
    const states = generateGuardianStates(g, rand);
    let si = 0;
    for (let id = g.start; id <= g.end; id++) {
      const angle = (id - 1) * (360 / 96);
      nodes.push({ id, guardian: g, state: states[si++], angle });
    }
  }
  return nodes;
}

// ── State display helpers ─────────────────────────────────────────────────────

const STATE_COLOR: Record<string, string> = {
  "1":       "#0dd4f0",
  "-1":      "#f43f5e",
  "0":       "#f59e0b",
  "dormant": "#4b5563",
};
const STATE_LABEL: Record<string, string> = {
  "1":       "Angelu",
  "-1":      "Deminu",
  "0":       "Neutral",
  "dormant": "Dormant",
};
const STATE_SYMBOL: Record<string, string> = {
  "1":       "⊕",
  "-1":      "⊖",
  "0":       "○",
  "dormant": "◇",
};

function stateKey(s: PathState): string { return String(s); }

// ── SVG geometry helpers ──────────────────────────────────────────────────────

function polar(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function describeArc(cx: number, cy: number, r: number, startDeg: number, endDeg: number): string {
  const s = polar(cx, cy, r, startDeg);
  const e = polar(cx, cy, r, endDeg);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y}`;
}

function describeSector(cx: number, cy: number, r1: number, r2: number, startDeg: number, endDeg: number): string {
  const s1 = polar(cx, cy, r1, startDeg);
  const e1 = polar(cx, cy, r1, endDeg);
  const s2 = polar(cx, cy, r2, startDeg);
  const e2 = polar(cx, cy, r2, endDeg);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${s1.x} ${s1.y} A ${r1} ${r1} 0 ${large} 1 ${e1.x} ${e1.y} L ${e2.x} ${e2.y} A ${r2} ${r2} 0 ${large} 0 ${s2.x} ${s2.y} Z`;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function CodexPage() {
  const nodes = useMemo(() => buildLattice(), []);
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const [selectedGuardian, setSelectedGuardian] = useState<string | null>(null);

  const hoveredNode = nodes.find(n => n.id === hoveredId);

  const CX = 300, CY = 300;
  const R_DOT   = 260;
  const R_INNER = 180;
  const R_RING  = 230;
  const DOT_R   = 5;

  // Global verification
  const totalAngelu  = nodes.filter(n => n.state === 1).length;
  const totalDeminu  = nodes.filter(n => n.state === -1).length;
  const totalNeutral = nodes.filter(n => n.state === 0).length;
  const totalDormant = nodes.filter(n => n.state === "dormant").length;
  const netState     = totalAngelu - totalDeminu;

  const dormantPaths = nodes.filter(n => n.state === "dormant");

  const filtered = selectedGuardian
    ? nodes.filter(n => n.guardian.name === selectedGuardian)
    : nodes;

  return (
    <div className="min-h-full space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ShieldAlert className="w-4 h-4 text-primary" />
            <span className="text-[10px] font-mono uppercase tracking-widest text-primary">
              CODEX 96-PATH · Sovereign Lattice v2.0
            </span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Path Map</h1>
          <p className="text-muted-foreground text-sm mt-1 font-mono">
            Deterministic trinary routing lattice · 5 Guardian Domains · 96 operational paths
          </p>
        </div>
        <div className="text-right text-[10px] font-mono text-muted-foreground/60 space-y-1">
          <div className="text-primary">Net State: <span className="font-bold">{netState > 0 ? "+" : ""}{netState}</span></div>
          <div>Verified: ✓ SATISFIED</div>
        </div>
      </div>

      {/* Main layout */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-8">

        {/* Left: circular SVG */}
        <div className="space-y-6">
          <div className="relative bg-card/30 border border-border rounded-sm overflow-hidden">
            {/* Hovered path info */}
            {hoveredNode && (
              <div
                className="absolute top-4 left-4 z-20 pointer-events-none"
                style={{ fontFamily: "monospace" }}
              >
                <div className="bg-background/95 border rounded-sm px-3 py-2 text-xs space-y-0.5 shadow-xl"
                  style={{ borderColor: hoveredNode.guardian.color + "66" }}
                >
                  <div className="text-[10px] uppercase tracking-widest" style={{ color: hoveredNode.guardian.color }}>
                    {hoveredNode.guardian.glyph} {hoveredNode.guardian.name}
                  </div>
                  <div className="text-white font-bold text-base">Path {String(hoveredNode.id).padStart(2, "0")}</div>
                  <div className="flex items-center gap-1.5">
                    <span style={{ color: STATE_COLOR[stateKey(hoveredNode.state)] }}>
                      {STATE_SYMBOL[stateKey(hoveredNode.state)]}
                    </span>
                    <span style={{ color: STATE_COLOR[stateKey(hoveredNode.state)] }}>
                      {STATE_LABEL[stateKey(hoveredNode.state)]}
                    </span>
                    <span className="text-muted-foreground">
                      ({hoveredNode.state === "dormant" ? "◇" : hoveredNode.state > 0 ? "+1" : hoveredNode.state < 0 ? "−1" : "0"})
                    </span>
                  </div>
                </div>
              </div>
            )}

            <svg
              viewBox="0 0 600 600"
              className="w-full max-w-[600px] mx-auto"
              style={{ display: "block" }}
            >
              {/* Background gradient */}
              <defs>
                {GUARDIANS.map(g => (
                  <radialGradient key={g.name} id={`glow-${g.name}`} cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor={g.color} stopOpacity="0.15" />
                    <stop offset="100%" stopColor={g.color} stopOpacity="0" />
                  </radialGradient>
                ))}
                <radialGradient id="center-glow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#0dd4f0" stopOpacity="0.08" />
                  <stop offset="100%" stopColor="#0dd4f0" stopOpacity="0" />
                </radialGradient>
              </defs>

              {/* Deep background */}
              <rect width="600" height="600" fill="#09090f" />

              {/* Center glow */}
              <circle cx={CX} cy={CY} r={R_INNER} fill="url(#center-glow)" />

              {/* Guardian sector arcs (semi-transparent fills) */}
              {GUARDIANS.map(g => {
                const startA = (g.start - 1) * (360 / 96);
                const endA   = g.end * (360 / 96);
                const mid    = (startA + endA) / 2;
                const mp     = polar(CX, CY, R_INNER + (R_DOT - R_INNER) * 0.55, mid);
                return (
                  <g key={g.name}>
                    <path
                      d={describeSector(CX, CY, R_INNER, R_DOT + 18, startA, endA)}
                      fill={g.color}
                      fillOpacity={selectedGuardian === null || selectedGuardian === g.name ? 0.07 : 0.02}
                      stroke={g.color}
                      strokeOpacity={selectedGuardian === null || selectedGuardian === g.name ? 0.3 : 0.05}
                      strokeWidth={0.5}
                      style={{ cursor: "pointer", transition: "fill-opacity 0.2s" }}
                      onClick={() => setSelectedGuardian(s => s === g.name ? null : g.name)}
                    />
                    {/* Guardian label */}
                    <text
                      x={mp.x}
                      y={mp.y}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontSize={11}
                      fontWeight="bold"
                      fontFamily="monospace"
                      fill={g.color}
                      fillOpacity={selectedGuardian === null || selectedGuardian === g.name ? 0.9 : 0.2}
                      style={{ pointerEvents: "none", letterSpacing: "0.1em" }}
                    >
                      {g.name.toUpperCase()}
                    </text>
                  </g>
                );
              })}

              {/* Spoke lines */}
              {nodes.map(n => {
                const pt = polar(CX, CY, R_DOT, n.angle);
                const pi = polar(CX, CY, R_INNER + 4, n.angle);
                const isSelected = !selectedGuardian || selectedGuardian === n.guardian.name;
                const col = STATE_COLOR[stateKey(n.state)];
                return (
                  <line
                    key={`spoke-${n.id}`}
                    x1={pi.x} y1={pi.y}
                    x2={pt.x} y2={pt.y}
                    stroke={col}
                    strokeWidth={0.5}
                    strokeOpacity={isSelected ? 0.2 : 0.04}
                  />
                );
              })}

              {/* Inner ring */}
              <circle cx={CX} cy={CY} r={R_INNER} fill="none" stroke="#1c1c2a" strokeWidth={1} />
              {/* Outer ring */}
              <circle cx={CX} cy={CY} r={R_DOT + 18} fill="none" stroke="#1c1c2a" strokeWidth={0.5} />

              {/* Path dots */}
              {nodes.map(n => {
                const pt = polar(CX, CY, R_DOT, n.angle);
                const col = STATE_COLOR[stateKey(n.state)];
                const isHovered = hoveredId === n.id;
                const isSelected = !selectedGuardian || selectedGuardian === n.guardian.name;
                const opacity = isSelected ? 1 : 0.12;
                return (
                  <g key={n.id} style={{ cursor: "pointer" }}>
                    {isHovered && (
                      <circle
                        cx={pt.x} cy={pt.y}
                        r={DOT_R + 6}
                        fill={col}
                        fillOpacity={0.2}
                        stroke={col}
                        strokeWidth={1}
                        strokeOpacity={0.6}
                      />
                    )}
                    <circle
                      cx={pt.x} cy={pt.y}
                      r={n.state === "dormant" ? DOT_R - 1 : DOT_R}
                      fill={n.state === "dormant" ? "none" : col}
                      stroke={col}
                      strokeWidth={n.state === "dormant" ? 1 : 0}
                      fillOpacity={opacity}
                      strokeOpacity={opacity}
                      onMouseEnter={() => setHoveredId(n.id)}
                      onMouseLeave={() => setHoveredId(null)}
                    />
                    {/* Path ID label for every 5th path */}
                    {n.id % 5 === 0 && (
                      <text
                        x={polar(CX, CY, R_DOT + 26, n.angle).x}
                        y={polar(CX, CY, R_DOT + 26, n.angle).y}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fontSize={7}
                        fontFamily="monospace"
                        fill={n.guardian.color}
                        fillOpacity={isSelected ? 0.7 : 0.15}
                        style={{ pointerEvents: "none" }}
                      >
                        {n.id}
                      </text>
                    )}
                  </g>
                );
              })}

              {/* Center orb */}
              <circle cx={CX} cy={CY} r={40} fill="#09090f" stroke="#1c1c2a" strokeWidth={1.5} />
              <circle cx={CX} cy={CY} r={36} fill="none" stroke="#0dd4f0" strokeWidth={0.5} strokeOpacity={0.3} />
              <text x={CX} y={CY - 7} textAnchor="middle" dominantBaseline="middle" fontSize={11} fontFamily="monospace" fill="#0dd4f0" fillOpacity={0.9}>IH</text>
              <text x={CX} y={CY + 8} textAnchor="middle" dominantBaseline="middle" fontSize={7} fontFamily="monospace" fill="#0dd4f0" fillOpacity={0.5} letterSpacing="1">SOVEREIGN</text>
            </svg>

            {/* Legend */}
            <div className="px-6 pb-5 flex flex-wrap gap-x-6 gap-y-2 justify-center">
              {([
                { key: "1", label: "Angelu", count: totalAngelu },
                { key: "-1", label: "Deminu", count: totalDeminu },
                { key: "0", label: "Neutral", count: totalNeutral },
                { key: "dormant", label: "Dormant", count: totalDormant },
              ] as const).map(({ key, label, count }) => (
                <div key={key} className="flex items-center gap-2 text-xs font-mono">
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{
                      backgroundColor: key === "dormant" ? "transparent" : STATE_COLOR[key],
                      border: key === "dormant" ? `1px solid ${STATE_COLOR[key]}` : "none",
                    }}
                  />
                  <span style={{ color: STATE_COLOR[key] }}>{STATE_SYMBOL[key]} {label}</span>
                  <span className="text-muted-foreground">
                    {count} · {(count / 96 * 100).toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Dormant Registry */}
          <div className="border border-border/60 rounded-sm p-5 bg-card/20">
            <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-3">
              ◇ Dormant Path Registry ({dormantPaths.length})
            </div>
            <div className="flex flex-wrap gap-2">
              {dormantPaths.map(n => (
                <span
                  key={n.id}
                  className="px-2.5 py-1 rounded text-xs font-mono border"
                  style={{
                    borderColor: n.guardian.color + "44",
                    color: n.guardian.color,
                    backgroundColor: n.guardian.color + "11",
                  }}
                >
                  {String(n.id).padStart(2, "0")} · {n.guardian.name}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Right: guardian tables + global stats */}
        <div className="space-y-4">

          {/* Global verification */}
          <div className="border border-primary/20 rounded-sm p-4 bg-primary/5">
            <div className="text-[10px] font-mono uppercase tracking-widest text-primary mb-3">
              Global Verification
            </div>
            <div className="space-y-2 text-xs font-mono">
              {[
                { label: "Angelu (+1)", value: totalAngelu, color: STATE_COLOR["1"], target: 30 },
                { label: "Deminu (−1)", value: totalDeminu, color: STATE_COLOR["-1"], target: 28 },
                { label: "Neutral (0)", value: totalNeutral, color: STATE_COLOR["0"], target: 28 },
                { label: "Dormant (◇)", value: totalDormant, color: STATE_COLOR["dormant"], target: 10 },
              ].map(row => (
                <div key={row.label} className="flex justify-between items-center">
                  <span style={{ color: row.color }}>{row.label}</span>
                  <span className="flex items-center gap-2">
                    <span className="text-foreground font-bold">{row.value}</span>
                    <span className={row.value === row.target ? "text-emerald-400" : "text-destructive"}>
                      {row.value === row.target ? "✓" : "✗"}
                    </span>
                  </span>
                </div>
              ))}
              <div className="pt-2 border-t border-border/40 flex justify-between">
                <span className="text-muted-foreground">Net State</span>
                <span className="font-bold" style={{ color: netState >= 0 ? "#0dd4f0" : "#f43f5e" }}>
                  {netState > 0 ? "+" : ""}{netState} {netState === 2 ? "✓" : ""}
                </span>
              </div>
            </div>
          </div>

          {/* Guardian breakdown */}
          {GUARDIANS.map(g => {
            const gNodes = nodes.filter(n => n.guardian.name === g.name);
            const gAngelu  = gNodes.filter(n => n.state === 1).length;
            const gDeminu  = gNodes.filter(n => n.state === -1).length;
            const gNeutral = gNodes.filter(n => n.state === 0).length;
            const gDormant = gNodes.filter(n => n.state === "dormant").length;
            const gNet     = gAngelu - gDeminu;
            const isActive = selectedGuardian === g.name;

            return (
              <div
                key={g.name}
                className="border rounded-sm p-4 cursor-pointer transition-all duration-200"
                style={{
                  borderColor: isActive ? g.color + "88" : "#1c1c2a",
                  backgroundColor: isActive ? g.color + "0a" : "transparent",
                }}
                onClick={() => setSelectedGuardian(s => s === g.name ? null : g.name)}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-base" style={{ color: g.color }}>{g.glyph}</span>
                    <span className="font-mono font-bold text-sm" style={{ color: g.color }}>
                      {g.name.toUpperCase()}
                    </span>
                  </div>
                  <div className="text-[10px] font-mono text-muted-foreground">
                    {g.start}–{g.end}
                  </div>
                </div>

                <div className="grid grid-cols-5 gap-1 text-center text-[10px] font-mono mb-2">
                  {[
                    { label: "+", value: gAngelu, color: STATE_COLOR["1"] },
                    { label: "−", value: gDeminu, color: STATE_COLOR["-1"] },
                    { label: "0", value: gNeutral, color: STATE_COLOR["0"] },
                    { label: "◇", value: gDormant, color: STATE_COLOR["dormant"] },
                    { label: "Net", value: gNet > 0 ? `+${gNet}` : String(gNet), color: gNet >= 0 ? "#0dd4f0" : "#f43f5e" },
                  ].map(col => (
                    <div key={col.label}>
                      <div className="text-muted-foreground mb-1">{col.label}</div>
                      <div className="font-bold" style={{ color: col.color }}>{col.value}</div>
                    </div>
                  ))}
                </div>

                {/* Mini state strip */}
                <div className="flex gap-0.5 mt-2">
                  {gNodes.map(n => (
                    <div
                      key={n.id}
                      className="h-1.5 flex-1 rounded-full transition-opacity"
                      style={{
                        backgroundColor: STATE_COLOR[stateKey(n.state)],
                        opacity: n.state === "dormant" ? 0.25 : 0.7,
                      }}
                      title={`Path ${n.id}: ${STATE_LABEL[stateKey(n.state)]}`}
                    />
                  ))}
                </div>
              </div>
            );
          })}

          {/* Polarity note */}
          <div className="text-[10px] font-mono text-muted-foreground/50 leading-relaxed p-2">
            <div className="mb-1 text-muted-foreground/70">Trinary System</div>
            Angelu (+1) = forward resolution<br />
            Deminu (−1) = entropic pull<br />
            Neutral (0) = phase-locked stasis<br />
            Dormant (◇) = non-adjacent latency
          </div>
        </div>
      </div>
    </div>
  );
}
