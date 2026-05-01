import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Activity, Bookmark, FileText, Search, Shield, Tag, Zap, ChevronRight } from "lucide-react";
import { omegaDossier, systemArtifact, DossierEntry, ArtifactStatus, ArtifactCategory } from "@/data/systemArtifact";

// ── Status / category display helpers ────────────────────────────────────────

const STATUS_CONFIG: Record<ArtifactStatus, { label: string; color: string; bg: string; border: string; dot: string }> = {
  STABLE:   { label: "STABLE",   color: "#00ff41", bg: "rgba(0,255,65,0.07)",   border: "rgba(0,255,65,0.22)",   dot: "#00ff41" },
  ACTIVE:   { label: "ACTIVE",   color: "#00eaff", bg: "rgba(0,234,255,0.07)",  border: "rgba(0,234,255,0.22)",  dot: "#00eaff" },
  PARTIAL:  { label: "PARTIAL",  color: "#ffcc00", bg: "rgba(255,204,0,0.07)",  border: "rgba(255,204,0,0.22)",  dot: "#ffcc00" },
  AT_RISK:  { label: "AT RISK",  color: "#ff6b6b", bg: "rgba(255,107,107,0.07)",border: "rgba(255,107,107,0.22)",dot: "#ff6b6b" },
};

const CATEGORY_COLOR: Record<ArtifactCategory, string> = {
  PROTOCOL:   "#7e47eb",
  INTEL:      "#00eaff",
  OPERATIONS: "#ff8c42",
};

function StatusBadge({ status }: { status: ArtifactStatus }) {
  const s = STATUS_CONFIG[status];
  return (
    <span
      className="inline-flex items-center gap-1.5 text-[9px] font-mono font-bold tracking-widest px-2 py-0.5 rounded-sm border uppercase"
      style={{ color: s.color, background: s.bg, borderColor: s.border }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.dot, boxShadow: `0 0 5px ${s.dot}` }} />
      {s.label}
    </span>
  );
}

// ── Sidebar card ──────────────────────────────────────────────────────────────

function DossierCard({ entry, isSelected, onClick }: { entry: DossierEntry; isSelected: boolean; onClick: () => void }) {
  const catCol = CATEGORY_COLOR[entry.category];
  const s = STATUS_CONFIG[entry.status];
  return (
    <button
      onClick={onClick}
      className="w-full text-left p-4 rounded-sm border transition-all duration-200 flex flex-col gap-2 relative overflow-hidden group"
      style={{
        borderColor: isSelected ? "rgba(0,234,255,0.3)" : "rgba(26,58,69,0.6)",
        background: isSelected ? "rgba(0,234,255,0.04)" : "transparent",
      }}
    >
      {isSelected && (
        <div className="absolute left-0 top-0 bottom-0 w-0.5" style={{ background: "#00eaff", boxShadow: "0 0 8px #00eaff" }} />
      )}
      <div className="flex items-center justify-between gap-2">
        <span className="text-[9px] font-mono uppercase tracking-widest" style={{ color: catCol, opacity: 0.9 }}>
          {entry.category}
        </span>
        <StatusBadge status={entry.status} />
      </div>
      <h3
        className="text-[11px] font-bold uppercase tracking-tight transition-colors"
        style={{ color: isSelected ? "#00eaff" : "#8899a6" }}
      >
        {entry.title}
      </h3>
      <p className="text-[9px] text-[#8899a6] leading-relaxed line-clamp-2 opacity-60">{entry.summary}</p>
      <div className="flex flex-wrap gap-1">
        {entry.tags.slice(0, 3).map(tag => (
          <span key={tag} className="text-[8px] px-1.5 py-0.5 border uppercase font-mono opacity-50 rounded-sm"
            style={{ background: "rgba(255,255,255,0.04)", borderColor: "#1a3a45" }}>
            {tag}
          </span>
        ))}
      </div>
    </button>
  );
}

// ── Detail panel ──────────────────────────────────────────────────────────────

function DetailPanel({ entry }: { entry: DossierEntry }) {
  const catCol = CATEGORY_COLOR[entry.category];

  return (
    <motion.div
      key={entry.id}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      className="max-w-4xl space-y-8"
    >
      {/* Header */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3 text-[10px] font-mono uppercase">
          <span className="px-2 py-0.5 rounded-sm font-bold" style={{ background: catCol + "22", color: catCol }}>
            {entry.category}
          </span>
          <StatusBadge status={entry.status} />
          <span className="opacity-30">Updated: {entry.lastUpdated}</span>
          <span className="opacity-30">ID: {entry.id}</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-black uppercase tracking-[0.15em] leading-tight">
          {entry.title}
        </h1>
        <p className="text-sm text-[#8899a6] leading-relaxed max-w-2xl">{entry.summary}</p>
        <div className="flex flex-wrap gap-2">
          {entry.tags.map(tag => (
            <span key={tag} className="inline-flex items-center gap-1 text-[9px] px-2 py-1 border rounded-sm font-mono uppercase opacity-60"
              style={{ borderColor: "#1a3a45", background: "rgba(255,255,255,0.03)" }}>
              <Tag size={9} />
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* Grid: domain brief + side panels */}
      <div className="grid grid-cols-1 xl:grid-cols-[1.4fr_0.6fr] gap-6">

        {/* Domain brief + next actions */}
        <div className="space-y-5">
          <div className="p-6 border rounded-sm space-y-5" style={{ borderColor: "#1a3a45", background: "rgba(0,234,255,0.02)" }}>
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest font-black" style={{ color: "#ffcc00" }}>
              <Shield size={13} /> Domain_Brief
            </div>
            <div className="space-y-3">
              {entry.details.map((detail, i) => (
                <div key={i} className="flex gap-3 text-[11px] leading-relaxed">
                  <span className="font-mono shrink-0 mt-0.5" style={{ color: "#00eaff" }}>
                    {String(i + 1).padStart(2, "0")}:
                  </span>
                  <span className="text-[#8899a6]">{detail}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Next actions */}
          <div className="p-5 border rounded-sm space-y-4" style={{ borderColor: "#1a3a45", background: "rgba(255,204,0,0.02)" }}>
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest font-black" style={{ color: "#ffcc00" }}>
              <Zap size={13} /> Next_Actions
            </div>
            <div className="space-y-2.5">
              {entry.details.slice(1).map((action, i) => (
                <div key={i} className="flex items-start gap-3 group">
                  <ChevronRight size={12} className="shrink-0 mt-0.5" style={{ color: "#ffcc0066" }} />
                  <p className="text-[11px] text-[#8899a6] leading-relaxed group-hover:text-[#aab8c4] transition-colors">{action}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Metrics + related files */}
        <div className="flex flex-col gap-5">

          {/* Metrics */}
          <div className="p-5 border rounded-sm space-y-4" style={{ borderColor: "#1a3a45", background: "rgba(0,234,255,0.02)" }}>
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest font-black" style={{ color: "#ffcc00" }}>
              <Activity size={13} /> Artifact_Metrics
            </div>
            <div className="space-y-2">
              {entry.metrics.map((m, i) => (
                <div key={i} className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0"
                  style={{ borderColor: "rgba(26,58,69,0.6)" }}>
                  <span className="text-[10px] uppercase font-mono opacity-50">{m.label}</span>
                  <span className="font-mono text-[10px]" style={{ color: "#00eaff" }}>{m.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Related files */}
          <div className="p-5 border rounded-sm space-y-4 flex-1" style={{ borderColor: "#1a3a45", background: "rgba(0,234,255,0.02)" }}>
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest font-black" style={{ color: "#ffcc00" }}>
              <FileText size={13} /> Related_Files
            </div>
            <div className="space-y-2">
              {entry.relatedFiles.map((f, i) => (
                <div key={i} className="text-[9px] font-mono leading-relaxed break-all"
                  style={{ color: "#8899a6" }}>
                  <span style={{ color: "#00eaff66" }}>→ </span>{f}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ── Global stats bar ──────────────────────────────────────────────────────────

function GlobalStats() {
  const counts = { STABLE: 0, ACTIVE: 0, PARTIAL: 0, AT_RISK: 0 };
  omegaDossier.forEach(d => counts[d.status]++);

  return (
    <div className="flex items-center gap-5 text-[10px] font-mono">
      {(Object.entries(counts) as [ArtifactStatus, number][]).map(([status, n]) => {
        const s = STATUS_CONFIG[status];
        return (
          <div key={status} className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.dot }} />
            <span style={{ color: s.color }}>{s.label}</span>
            <span className="opacity-40">{n}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function VaultPage() {
  const [selected, setSelected] = useState<DossierEntry>(omegaDossier[0]);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState<ArtifactCategory | null>(null);

  const filtered = omegaDossier.filter(d => {
    const q = search.toLowerCase();
    const matchQ = !q || d.title.toLowerCase().includes(q) || d.summary.toLowerCase().includes(q) || d.tags.some(t => t.includes(q));
    const matchC = !filterCat || d.category === filterCat;
    return matchQ && matchC;
  });

  return (
    <div
      className="min-h-full -m-6 md:-m-10 flex flex-col"
      style={{ background: "#05070a", color: "#e2e8f0" }}
    >
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div
        className="sticky top-0 z-40 px-6 py-4 border-b flex flex-col gap-3"
        style={{ background: "rgba(5,7,10,0.96)", borderColor: "#1a3a45", backdropFilter: "blur(16px)" }}
      >
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Bookmark size={14} style={{ color: "#ffcc00" }} />
              <span className="text-[11px] font-black uppercase tracking-[0.3em] font-mono">Codex_Vault_Explorer</span>
            </div>
            <p className="text-[10px] font-mono opacity-30 uppercase tracking-widest">
              System-backed artifact index for kernels, lattice law, simulation, and operator surfaces.
            </p>
          </div>
          <GlobalStats />
        </div>

        {/* System thesis */}
        <div className="flex items-center gap-3 p-3 rounded-sm border text-[10px] font-mono"
          style={{ borderColor: "#1a3a45", background: "rgba(0,234,255,0.03)" }}>
          <span className="text-[#00eaff66]">THESIS:</span>
          <span className="opacity-50 leading-relaxed">{systemArtifact.thesis}</span>
        </div>
      </div>

      {/* ── Body ───────────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden" style={{ height: "calc(100vh - 160px)" }}>

        {/* Sidebar */}
        <div className="w-80 shrink-0 border-r overflow-y-auto p-4 space-y-2 flex flex-col"
          style={{ borderColor: "#1a3a45", overflowY: "auto" }}>

          {/* Search */}
          <div className="relative mb-3">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-30" />
            <input
              type="text"
              placeholder="Search Codex..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2 rounded-sm border text-[11px] font-mono outline-none focus:border-[#00eaff44] transition-colors"
              style={{ background: "#0c0f14", borderColor: "#1a3a45", color: "#e2e8f0" }}
            />
          </div>

          {/* Category filters */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            {([null, "PROTOCOL", "INTEL", "OPERATIONS"] as (ArtifactCategory | null)[]).map(cat => (
              <button
                key={cat ?? "ALL"}
                onClick={() => setFilterCat(cat)}
                className="text-[9px] font-mono uppercase px-2 py-0.5 rounded-sm border transition-all"
                style={{
                  borderColor: filterCat === cat ? (cat ? CATEGORY_COLOR[cat] : "#00eaff") + "66" : "#1a3a45",
                  color:       filterCat === cat ? (cat ? CATEGORY_COLOR[cat] : "#00eaff") : "#4a5568",
                  background:  filterCat === cat ? (cat ? CATEGORY_COLOR[cat] : "#00eaff") + "11" : "transparent",
                }}
              >
                {cat ?? "ALL"}
              </button>
            ))}
          </div>

          {/* Entries */}
          <div className="space-y-2 flex-1">
            {filtered.length === 0 ? (
              <div className="text-center py-10 text-[10px] font-mono opacity-20 uppercase tracking-widest">
                No_Entries_Found
              </div>
            ) : filtered.map(entry => (
              <DossierCard
                key={entry.id}
                entry={entry}
                isSelected={selected?.id === entry.id}
                onClick={() => setSelected(entry)}
              />
            ))}
          </div>
        </div>

        {/* Detail area */}
        <div
          className="flex-1 overflow-y-auto p-8 md:p-10"
          style={{ background: "radial-gradient(circle at 50% 0%, rgba(0,234,255,0.04) 0%, transparent 65%)" }}
        >
          <AnimatePresence mode="wait">
            {selected ? (
              <DetailPanel key={selected.id} entry={selected} />
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="h-full flex items-center justify-center text-[10px] font-mono opacity-20 uppercase tracking-[0.5em] italic"
              >
                Select_Codex_Segment_To_Decrypt...
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
