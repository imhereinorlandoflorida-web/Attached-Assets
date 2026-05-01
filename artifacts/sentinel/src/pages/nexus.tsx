import { useState, useEffect, useRef } from "react";

// ── Data ─────────────────────────────────────────────────────────────────────

const GAMES = [
  { id: "NYK@ATL", label: "NYK @ ATL", sub: "G6 • 7:00 PM ET",       badge: "NYK 3-2", color: "#ff8c42" },
  { id: "BOS@PHI", label: "BOS @ PHI", sub: "G6 • 8:00 PM • Peacock", badge: "BOS 3-2", color: "#5aa9e6" },
  { id: "SAS@POR", label: "SAS @ POR", sub: "G6 • TBD",              badge: "POR 3-2", color: "#ff5c8a" },
];

const PATH_META = {
  DRAGON:   { color: "#ff8c42", bg: "rgba(255,140,66,0.10)",  border: "rgba(255,140,66,0.28)",  tag: "TREND",       desc: "Momentum correlation following" },
  MIRROR:   { color: "#5aa9e6", bg: "rgba(90,169,230,0.10)", border: "rgba(90,169,230,0.28)",  tag: "CONTRARIAN", desc: "Sharp signals fading public" },
  MISCHIEF: { color: "#ff5c8a", bg: "rgba(255,92,138,0.10)", border: "rgba(255,92,138,0.28)",  tag: "VARIANCE",   desc: "High-volatility divergent plays" },
} as const;
type PathKey = keyof typeof PATH_META;

interface Prop {
  id: string; player: string; prop: string; direction: "O" | "U"; line: string; stat: string;
  odds: number; game: string; path: PathKey; edge: number; conf: number; note: string; tag: string;
}

const PROPS: Prop[] = [
  { id:"kat-reb", player:"Karl-Anthony Towns",     prop:"O 12.5 REB", direction:"O", line:"12.5", stat:"REB", odds:-120, game:"NYK@ATL", path:"DRAGON",   edge:2.3, conf:78, note:"Towns averaging 14.2 reb last 5, Hawks allow 2nd-most reb to centers, trend confirmed 4/5",         tag:"L5 AVG: 14.2" },
  { id:"naw-pts", player:"Nickeil Alexander-Walker",prop:"U 17.5 PTS", direction:"U", line:"17.5", stat:"PTS", odds: 105, game:"NYK@ATL", path:"MIRROR",   edge:1.8, conf:71, note:"Public hammering over after 22-pt G5, but usage collapses on road — contrarian sharp signal",        tag:"68% PUBLIC OVER" },
  { id:"tat-pts", player:"Jayson Tatum",            prop:"O 27.5 PTS", direction:"O", line:"27.5", stat:"PTS", odds:-115, game:"BOS@PHI", path:"DRAGON",   edge:2.1, conf:82, note:"Celtics pace up 3.2 poss in elimination games, Tatum 29.4 ppg this series",                         tag:"SERIES AVG: 29.4" },
  { id:"max-3pm", player:"Tyrese Maxey",            prop:"O 3.5 3PM",  direction:"O", line:"3.5",  stat:"3PM", odds: 140, game:"BOS@PHI", path:"MISCHIEF", edge:3.4, conf:64, note:"Leads playoffs in 3PM attempts, 76ers variance at 34% — big swings only",                          tag:"MOST 3s PLAYOFFS" },
  { id:"cli-pts", player:"Donovan Clingan",         prop:"U 7.5 PTS",  direction:"U", line:"7.5",  stat:"PTS", odds:-110, game:"SAS@POR", path:"MIRROR",   edge:1.9, conf:73, note:"Averaging 6.3 ppg in playoffs, 28.6% FG — public still hammering the over",                        tag:"PLAYOFF FG: 28.6%" },
  { id:"jok-pts", player:"Nikola Jokic",            prop:"O 24.5 PTS", direction:"O", line:"24.5", stat:"PTS", odds:-105, game:"SAS@POR", path:"DRAGON",   edge:1.9, conf:87, note:"Perimeter defense mismatch confirmed — GoldSheet model agrees, career playoff pace up",             tag:"GoldSheet LOCK" },
  { id:"bri-pts", player:"Mikal Bridges",           prop:"O 18.5 PTS", direction:"O", line:"18.5", stat:"PTS", odds:-108, game:"NYK@ATL", path:"DRAGON",   edge:1.7, conf:76, note:"Usage 34% in G5 on road, Hawks rank 28th defending wings — pace-up game",                         tag:"SER USE: 34%" },
  { id:"wem-blk", player:"Victor Wembanyama",       prop:"O 3.5 BLK",  direction:"O", line:"3.5",  stat:"BLK", odds: 130, game:"SAS@POR", path:"MISCHIEF", edge:2.9, conf:61, note:"4.1 blk last 4 home games, Portland drives at rim 42% — feast or famine",                         tag:"L4 HM: 4.1 BLK" },
  { id:"whi-reb", player:"Derrick White",           prop:"U 5.5 REB",  direction:"U", line:"5.5",  stat:"REB", odds:-115, game:"BOS@PHI", path:"MIRROR",   edge:1.5, conf:68, note:"3.8 reb this series, minutes capped at 28 — books overinflating",                                 tag:"SER AVG: 3.8 REB" },
  { id:"bro-to",  player:"Jaylen Brown",            prop:"O 2.5 TO",   direction:"O", line:"2.5",  stat:"TO",  odds:-118, game:"BOS@PHI", path:"MISCHIEF", edge:2.2, conf:66, note:"2.8 TO series average, pressure defense in elimination games elevates it further",                 tag:"SER AVG: 2.8 TO" },
];

const LEFT_CLASSIFIER: Record<PathKey, string[]> = {
  DRAGON:   ["kat-reb","tat-pts","jok-pts","bri-pts"],
  MIRROR:   ["naw-pts","cli-pts","whi-reb"],
  MISCHIEF: ["max-3pm","wem-blk","bro-to"],
};

// ── Parlay math ───────────────────────────────────────────────────────────────

function toDecimal(odds: number) { return odds > 0 ? odds / 100 + 1 : 100 / Math.abs(odds) + 1; }
function toAmerican(dec: number) {
  if (dec >= 2) return `+${Math.round((dec - 1) * 100)}`;
  return `-${Math.round(100 / (dec - 1))}`;
}

// ── 2D Animated SVG Lattice ───────────────────────────────────────────────────

interface LatticeNode {
  id: string; label: string; path: PathKey; x: number; y: number;
}

const SVG_W = 900, SVG_H = 200;
const NODES: LatticeNode[] = [
  { id:"kat-reb", label:"KAT", path:"DRAGON",   x:660, y: 80 },
  { id:"naw-pts", label:"NAW", path:"MIRROR",   x:180, y:100 },
  { id:"tat-pts", label:"TAT", path:"DRAGON",   x:480, y: 55 },
  { id:"max-3pm", label:"MAX", path:"MISCHIEF", x:390, y:145 },
  { id:"cli-pts", label:"CLI", path:"MIRROR",   x:120, y: 55 },
  { id:"jok-pts", label:"JOK", path:"DRAGON",   x:570, y:150 },
  { id:"bri-pts", label:"BRI", path:"DRAGON",   x:750, y:145 },
  { id:"wem-blk", label:"WEM", path:"MISCHIEF", x:300, y: 60 },
  { id:"whi-reb", label:"WHI", path:"MIRROR",   x:810, y: 60 },
];
const EDGES: [number,number][] = [
  [0,6],[2,3],[2,8],[4,7],[5,6],[1,0],[3,8],
];

function AnimatedLattice({ activeIds }: { activeIds: Set<string> }) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 40);
    return () => clearInterval(id);
  }, []);

  const t = tick / 25;

  return (
    <svg
      viewBox={`0 0 ${SVG_W} ${SVG_H}`}
      className="w-full h-full"
      style={{ display: "block" }}
    >
      <defs>
        {NODES.map(n => (
          <radialGradient key={`grd-${n.id}`} id={`grd-${n.id}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={PATH_META[n.path].color} stopOpacity="0.9" />
            <stop offset="100%" stopColor={PATH_META[n.path].color} stopOpacity="0" />
          </radialGradient>
        ))}
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id="glow-strong" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* Edges */}
      {EDGES.map(([ai, bi], i) => {
        const a = NODES[ai], b = NODES[bi];
        const isActive = activeIds.has(a.id) || activeIds.has(b.id);
        const col = PATH_META[a.path].color;
        const dash = 8 + Math.sin(t + i) * 2;
        const offset = (t * 6 + i * 10) % 30;
        return (
          <line
            key={i}
            x1={a.x} y1={a.y + Math.sin(t * 0.7 + i) * 3}
            x2={b.x} y2={b.y + Math.sin(t * 0.5 + i + 1) * 3}
            stroke={isActive ? col : "#2a3140"}
            strokeWidth={isActive ? 1.5 : 0.6}
            strokeOpacity={isActive ? 0.85 : 0.35}
            strokeDasharray={isActive ? `${dash} ${30 - dash}` : "none"}
            strokeDashoffset={isActive ? -offset : 0}
          />
        );
      })}

      {/* Nodes */}
      {NODES.map(n => {
        const isActive = activeIds.has(n.id);
        const col = PATH_META[n.path].color;
        const float = Math.sin(t * 0.8 + n.x * 0.05) * 4;
        const pulse = isActive ? 1 + Math.sin(t * 2.5) * 0.3 : 1;
        const cx = n.x;
        const cy = n.y + float;
        const r = (isActive ? 9 : 6) * pulse;

        return (
          <g key={n.id} filter={isActive ? "url(#glow-strong)" : "url(#glow)"}>
            {isActive && (
              <circle cx={cx} cy={cy} r={r + 10} fill={col} opacity={0.12 * (0.6 + Math.sin(t * 2) * 0.4)} />
            )}
            <circle cx={cx} cy={cy} r={r} fill={isActive ? col : "none"} stroke={col}
              strokeWidth={isActive ? 0 : 1.5}
              fillOpacity={isActive ? 0.9 : 0}
              strokeOpacity={isActive ? 0 : 0.6}
            />
            <circle cx={cx} cy={cy} r={isActive ? 3 : 2} fill={col} fillOpacity={isActive ? 1 : 0.7} />
            <text
              x={cx} y={cy - (isActive ? 14 : 10)}
              textAnchor="middle" dominantBaseline="middle"
              fontSize={9} fontFamily="monospace"
              fill={col} fillOpacity={isActive ? 1 : 0.55}
              fontWeight={isActive ? "bold" : "normal"}
            >
              {n.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ── Path classifier icon ──────────────────────────────────────────────────────

function PathIcon({ path, size = 13 }: { path: PathKey; size?: number }) {
  const col = PATH_META[path].color;
  if (path === "DRAGON")
    return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={col} strokeWidth="2"><path d="M4 14c4-6 8-6 12 0M12 4v7"/></svg>;
  if (path === "MIRROR")
    return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={col} strokeWidth="2"><path d="M12 4v16M4 12h4M16 12h4"/></svg>;
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={col} strokeWidth="2"><path d="M12 3v3m0 12v3M3 12h3m12 0h3M7 7l2 2m6 6l2 2M7 17l2-2m6-6l2-2"/></svg>;
}

// ── Glass panel style ─────────────────────────────────────────────────────────

const glass: React.CSSProperties = {
  background: "linear-gradient(160deg, rgba(17,20,26,0.92), rgba(10,12,15,0.94))",
  border: "1px solid rgba(31,36,47,0.85)",
  backdropFilter: "blur(16px)",
};

// ── Main component ────────────────────────────────────────────────────────────

export default function NexusPage() {
  const [selectedPath, setSelectedPath] = useState<PathKey | null>(null);
  const [parlay, setParlay] = useState<Prop[]>([]);

  const toggle = (p: Prop) =>
    setParlay(prev => prev.find(x => x.id === p.id) ? prev.filter(x => x.id !== p.id) : [...prev, p]);

  const parlayIds = new Set(parlay.map(p => p.id));

  const filteredProps = selectedPath ? PROPS.filter(p => p.path === selectedPath) : PROPS;

  const dec = parlay.reduce((a, p) => a * toDecimal(p.odds), 1);
  const combined = parlay.length ? toAmerican(dec) : "+0";
  const payout = (100 * dec).toFixed(2);
  const edgeSum = parlay.reduce((a, p) => a + p.edge, 0).toFixed(1);
  const dupes = parlay.map(p => p.game).length - new Set(parlay.map(p => p.game)).size;
  const risk = parlay.length >= 4 || dupes >= 2 ? "HIGH" : parlay.length >= 3 || dupes >= 1 ? "MED" : "LOW";
  const riskPct = risk === "HIGH" ? 85 : risk === "MED" ? 50 : 18;
  const riskColor = risk === "HIGH" ? "#ff5c5c" : risk === "MED" ? "#ffbf5c" : "#3ddc97";

  return (
    <div className="min-h-full -m-6 md:-m-10 flex flex-col font-sans">

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-40 px-5 h-[52px] flex items-center justify-between gap-4 border-b"
        style={{ background:"rgba(8,10,13,0.93)", borderColor:"rgba(255,140,66,0.15)", backdropFilter:"blur(18px)" }}
      >
        <div className="flex items-center gap-3">
          <span className="w-2 h-2 rounded-full bg-[#ff8c42] shadow-[0_0_12px_rgba(255,140,66,0.7)] animate-pulse" />
          <span className="font-mono font-semibold tracking-[0.18em] text-[13px] text-white">
            NEXUS ORACLE <span className="text-[#ff8c42]">•</span> REAL DATA v4.1
          </span>
          <span className="hidden lg:block font-mono text-[10px] text-[#7a8699]">MODEL v4.1 • DATA SYNC ACTIVE</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-mono text-[10px] text-[#ff8c42] px-2.5 py-1 rounded-md border"
            style={{ borderColor:"rgba(255,140,66,0.25)", background:"rgba(255,140,66,0.08)" }}>
            LIVE: APR 30 2026 • 3 GAMES
          </span>
          <span className="hidden sm:flex items-center gap-1.5 font-mono text-[11px] text-[#7a8699]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#3ddc97] animate-pulse" />
            EDGE CALCULATED
          </span>
        </div>
      </div>

      {/* ── Game strip ───────────────────────────────────────────────────── */}
      <div className="px-5 h-8 flex items-center gap-6 overflow-x-auto border-b shrink-0"
        style={{ background:"rgba(12,15,20,0.96)", borderColor:"#141a22" }}>
        {GAMES.map(g => (
          <div key={g.id} className="flex items-center gap-2 whitespace-nowrap shrink-0">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: g.color }} />
            <span className="font-mono text-[11px] text-[#cbd5e1]">{g.label} • {g.sub}</span>
            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded" style={{ background:"#1a1f29", color:"#7a8699" }}>
              {g.badge}
            </span>
          </div>
        ))}
      </div>

      {/* ── Main grid ────────────────────────────────────────────────────── */}
      <div className="flex-1 p-4 grid grid-cols-12 gap-4 max-w-[1700px] mx-auto w-full">

        {/* LEFT: path classifier */}
        <div className="col-span-12 lg:col-span-3 xl:col-span-2">
          <div className="rounded-xl p-4 h-full" style={glass}>
            <div className="flex items-center justify-between mb-4">
              <span className="font-mono text-[10px] tracking-widest text-[#7a8699]">PATH CLASSIFIER</span>
              <span className="font-mono text-[10px] text-[#3ddc97]">{PROPS.length} SIGNALS</span>
            </div>

            {(Object.entries(LEFT_CLASSIFIER) as [PathKey, string[]][]).map(([path, ids]) => {
              const m = PATH_META[path];
              const isActive = selectedPath === path;
              return (
                <div key={path} className="mb-5">
                  <button onClick={() => setSelectedPath(s => s === path ? null : path)}
                    className="w-full flex items-center gap-2 mb-2">
                    <div className="w-5 h-5 rounded-md flex items-center justify-center shrink-0"
                      style={{ background: m.bg, border: `1px solid ${m.border}` }}>
                      <PathIcon path={path} size={11} />
                    </div>
                    <span className="text-[13px] font-medium tracking-wide"
                      style={{ color: isActive ? m.color : "inherit" }}>{path}</span>
                    <span className="ml-auto font-mono text-[10px] text-[#7a8699]">{m.tag}</span>
                  </button>
                  <p className="text-[11px] text-[#7a8699] mb-2.5 leading-snug">{m.desc}</p>
                  <div className="space-y-1.5">
                    {ids.map(pid => {
                      const prop = PROPS.find(p => p.id === pid);
                      if (!prop) return null;
                      const active = parlayIds.has(pid);
                      return (
                        <button key={pid} onClick={() => toggle(prop)}
                          className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg border text-left transition-all"
                          style={{ background: active ? m.bg : "#0c0f14", borderColor: active ? m.border : "#1a1f29" }}>
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: m.color }} />
                            <span className="text-[11px] truncate">
                              {prop.player.split(" ").map((w,i) => i===0 ? w[0]+"." : w).join(" ")} {prop.direction}{prop.line}
                            </span>
                          </div>
                          <span className="font-mono text-[10px] text-[#3ddc97] shrink-0">+{prop.edge}%</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {selectedPath && (
              <button className="w-full font-mono text-[10px] text-[#7a8699] hover:text-white mt-2 transition"
                onClick={() => setSelectedPath(null)}>✕ Clear filter</button>
            )}
          </div>
        </div>

        {/* CENTER: prop feed */}
        <div className="col-span-12 lg:col-span-6 xl:col-span-7">
          <div className="rounded-xl p-4" style={glass}>
            <div className="flex items-center justify-between mb-4">
              <span className="font-mono text-[10px] tracking-widest text-[#7a8699]">LIVE PROP FEED • MODEL v4.1</span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] px-2 py-0.5 rounded border"
                  style={{ background:"rgba(61,220,151,0.08)", color:"#3ddc97", borderColor:"rgba(61,220,151,0.2)" }}>
                  DATA SYNC
                </span>
                <span className="font-mono text-[10px] text-[#7a8699]">{filteredProps.length} ACTIVE</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredProps.map(prop => {
                const m = PATH_META[prop.path];
                const active = parlayIds.has(prop.id);
                const gameColor = GAMES.find(g => g.id === prop.game)?.color ?? "#7a8699";
                return (
                  <button key={prop.id} onClick={() => toggle(prop)}
                    className="group relative rounded-xl p-3.5 text-left border transition-all duration-200 hover:scale-[1.01]"
                    style={{
                      background: active ? `radial-gradient(500px circle at 50% -60px, ${m.color}14, transparent 60%), #0e1218` : "#0c0f14",
                      borderColor: active ? m.color : "#1f242f",
                      boxShadow: active ? `0 0 0 1px ${m.color}30 inset, 0 8px 32px ${m.color}14` : "none",
                    }}
                  >
                    <div className="flex items-center justify-between mb-2.5">
                      <span className="font-mono text-[10px] text-[#7a8699]">
                        {GAMES.find(g=>g.id===prop.game)?.label} • {GAMES.find(g=>g.id===prop.game)?.sub.split(" • ")[0]}
                      </span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded font-medium tracking-wider border"
                        style={{ background: m.bg, color: m.color, borderColor: m.border }}>
                        {prop.path} PATH
                      </span>
                    </div>

                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="text-[14px] font-semibold leading-tight text-white">
                        {prop.player} <span style={{ color:"rgba(226,232,240,0.65)" }}>{prop.prop}</span>
                      </h3>
                      <span className="font-mono text-[13px] font-medium shrink-0" style={{ color: m.color }}>
                        {prop.odds > 0 ? "+" : ""}{prop.odds}
                      </span>
                    </div>

                    <p className="text-[11px] text-[#9aa4b2] leading-snug mb-3">{prop.note}</p>

                    <div className="flex items-center justify-between pt-2.5 border-t" style={{ borderColor:"#1f242f88" }}>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-[#7a8699]">EDGE</span>
                          <span className="font-mono text-[11px] text-[#3ddc97] font-medium">+{prop.edge}%</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-[#7a8699]">CONF</span>
                          <span className="font-mono text-[11px]">{prop.conf}%</span>
                        </div>
                      </div>
                      <span className="font-mono text-[9px]" style={{ color: gameColor }}>{prop.tag}</span>
                    </div>

                    <div className="mt-2.5 h-0.5 w-full rounded-full overflow-hidden" style={{ background:"#1a1f29" }}>
                      <div className="h-full rounded-full transition-all duration-500"
                        style={{ width:`${prop.conf}%`, background: m.color, opacity:0.45 }} />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* RIGHT: assembler */}
        <div className="col-span-12 lg:col-span-3 xl:col-span-3">
          <div className="rounded-xl p-4 sticky top-[86px]" style={glass}>
            <div className="flex items-center justify-between mb-3">
              <span className="font-mono text-[10px] tracking-widest text-[#7a8699]">LIVE ASSEMBLER</span>
              <span className="font-mono text-[10px] px-1.5 py-0.5 rounded"
                style={{ background:"#1a1f29", color:"#7a8699" }}>
                {parlay.length} LEG{parlay.length !== 1 ? "S" : ""}
              </span>
            </div>

            {parlay.length === 0 ? (
              <div className="text-center py-8 rounded-lg border border-dashed"
                style={{ background:"rgba(12,15,20,0.5)", borderColor:"#1f242f" }}>
                <div className="w-8 h-8 mx-auto mb-2 rounded-full flex items-center justify-center"
                  style={{ background:"#1a1f29" }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7a8699" strokeWidth="1.5">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                </div>
                <p className="text-[12px] text-[#7a8699]">Click props to build parlay</p>
                <p className="font-mono text-[10px] text-[#5a6475] mt-1">Real odds • Edge calculated</p>
              </div>
            ) : (
              <>
                <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1 mb-4">
                  {parlay.map(p => {
                    const m = PATH_META[p.path];
                    return (
                      <div key={p.id} className="flex items-center justify-between p-2.5 rounded-lg border"
                        style={{ background:"#0c0f14", borderColor:"#1f242f" }}>
                        <div className="min-w-0">
                          <div className="text-[12px] font-medium truncate">{p.prop}</div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="font-mono text-[10px] text-[#7a8699]">{p.game}</span>
                            <span className="text-[9px] px-1 py-0.5 rounded"
                              style={{ background: m.bg, color: m.color }}>{p.path}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[12px]">{p.odds > 0 ? "+" : ""}{p.odds}</span>
                          <button onClick={() => toggle(p)}
                            className="w-5 h-5 grid place-items-center rounded text-[#7a8699] hover:text-white transition">×</button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="pt-3 border-t space-y-2.5" style={{ borderColor:"#1f242f" }}>
                  {[
                    { label:"Combined Odds", val: combined,       col:"#ff8c42",  size:"text-[14px]" },
                    { label:"Total Edge",    val: `+${edgeSum}%`, col:"#3ddc97",  size:"text-[12px]" },
                    { label:"$100 Payout",   val: `$${payout}`,   col:"inherit",  size:"text-[12px]" },
                  ].map(row => (
                    <div key={row.label} className="flex justify-between items-center">
                      <span className="text-[11px] text-[#7a8699]">{row.label}</span>
                      <span className={`font-mono font-medium ${row.size}`} style={{ color: row.col }}>{row.val}</span>
                    </div>
                  ))}
                  <div>
                    <div className="flex justify-between mb-1.5">
                      <span className="text-[11px] text-[#7a8699]">Correlation Risk</span>
                      <span className="font-mono text-[10px]" style={{ color: riskColor }}>{risk}</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full overflow-hidden border"
                      style={{ background:"#0c0f14", borderColor:"#1a1f29" }}>
                      <div className="h-full rounded-full transition-all duration-300"
                        style={{ width:`${riskPct}%`, background: riskColor }} />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-4">
                  <button onClick={() => setParlay([])}
                    className="h-9 rounded-lg text-[12px] font-medium transition border"
                    style={{ background:"#1a1f29", borderColor:"#2a3140", color:"inherit" }}>
                    Clear
                  </button>
                  <button className="h-9 rounded-lg text-[12px] font-semibold text-black transition"
                    style={{ background:"#ff8c42", boxShadow:"0 0 20px rgba(255,140,66,0.3)" }}>
                    Execute
                  </button>
                </div>
                <p className="font-mono text-[10px] text-[#5a6475] text-center mt-2.5">PAPER TRADE • MODEL v4.1</p>
              </>
            )}
          </div>
        </div>

        {/* BOTTOM: correlation lattice (2D SVG animated) */}
        <div className="col-span-12">
          <div className="rounded-xl p-3" style={glass}>
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono text-[10px] tracking-widest text-[#7a8699]">
                CORRELATION LATTICE • PLAYER NETWORK
              </span>
              <div className="flex items-center gap-4 font-mono text-[10px] text-[#7a8699]">
                <span className="hidden sm:inline">NODES: {NODES.length} PLAYERS</span>
                <span className="hidden md:inline">EDGES: {EDGES.length} CORRELATIONS</span>
                <div className="flex items-center gap-1">
                  <span className="w-1 h-1 rounded-full bg-[#3ddc97] animate-pulse" />
                  <span className="text-[#3ddc97]">LIVE</span>
                </div>
              </div>
            </div>

            <div className="relative rounded-lg overflow-hidden border"
              style={{ height:220, background:"#070910", borderColor:"#1a1f29" }}>
              <AnimatedLattice activeIds={new Set(parlay.map(p => p.id))} />

              {/* Legend */}
              <div className="absolute bottom-2 left-3 flex items-center gap-4 font-mono text-[9px]">
                {(Object.entries(PATH_META) as [PathKey, typeof PATH_META[PathKey]][]).map(([k, v]) => (
                  <div key={k} className="flex items-center gap-1.5">
                    <span className="w-4 h-0.5 rounded" style={{ background: v.color }} />
                    <span style={{ color:"#7a8699" }}>{k}</span>
                  </div>
                ))}
              </div>

              {/* Active overlay */}
              {parlay.length > 0 && (
                <div className="absolute top-2 left-3 font-mono text-[9px] px-2 py-1 rounded border"
                  style={{ background:"rgba(255,140,66,0.1)", color:"#ff8c42", borderColor:"rgba(255,140,66,0.3)" }}>
                  {parlay.length} NODE{parlay.length > 1 ? "S" : ""} ACTIVE — CORRELATIONS HIGHLIGHTED
                </div>
              )}

              <div className="absolute top-2 right-3 font-mono text-[9px] px-2 py-1 rounded border"
                style={{ background:"rgba(10,12,15,0.85)", color:"#5a6475", borderColor:"#1a1f29" }}>
                Built from Game 1–5 correlations
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
