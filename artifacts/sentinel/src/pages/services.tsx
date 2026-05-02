import React, { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Server,
  Database,
  HardDrive,
  Globe,
  Smartphone,
  RefreshCw,
  Wifi,
  WifiOff,
  AlertTriangle,
  Clock,
  Cpu,
  Activity,
  UploadCloud,
  CheckCircle2,
} from "lucide-react";

const C = {
  bg: "#09090f",
  bgCard: "#0d1117",
  border: "#1a2533",
  cyan: "#0dd4f0",
  purple: "#7e47eb",
  green: "#00ff88",
  yellow: "#ffcc00",
  red: "#ff4466",
  muted: "#4a5568",
  text: "#e2e8f0",
  textDim: "#718096",
};

interface ServiceInfo {
  id: string;
  name: string;
  description: string;
  status: "online" | "degraded" | "offline" | "unconfigured";
  latencyMs: number;
  version: string;
  tags: string[];
  bucketId?: string | null;
}

interface ServicesMeta {
  nodeVersion: string;
  uptime: number;
  env: string;
}

interface ServicesData {
  timestamp: string;
  services: ServiceInfo[];
  meta: ServicesMeta;
}

const SERVICE_ICONS: Record<string, React.FC<{ size?: number; color?: string }>> = {
  "api-server": Server,
  database: Database,
  "object-storage": HardDrive,
  "web-client": Globe,
  "mobile-client": Smartphone,
};

const STATUS_CONFIG = {
  online: { color: C.green, label: "ONLINE", icon: CheckCircle2 },
  degraded: { color: C.yellow, label: "DEGRADED", icon: AlertTriangle },
  offline: { color: C.red, label: "OFFLINE", icon: WifiOff },
  unconfigured: { color: C.muted, label: "UNCONFIGURED", icon: AlertTriangle },
};

function formatUptime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function PulseRing({ color }: { color: string }) {
  return (
    <span className="relative flex h-3 w-3">
      <span
        className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60"
        style={{ backgroundColor: color }}
      />
      <span
        className="relative inline-flex rounded-full h-3 w-3"
        style={{ backgroundColor: color }}
      />
    </span>
  );
}

function ServiceCard({ svc, index }: { svc: ServiceInfo; index: number }) {
  const cfg = STATUS_CONFIG[svc.status];
  const Icon = SERVICE_ICONS[svc.id] ?? Server;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07, duration: 0.35 }}
      style={{
        background: C.bgCard,
        border: `1px solid ${C.border}`,
        borderLeft: `3px solid ${cfg.color}`,
      }}
      className="rounded-sm p-5 flex flex-col gap-3 relative overflow-hidden"
    >
      <div
        className="absolute top-0 left-0 w-full h-full opacity-[0.03] pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at top left, ${cfg.color}, transparent 70%)`,
        }}
      />

      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded flex items-center justify-center flex-shrink-0"
            style={{ background: `${cfg.color}15`, border: `1px solid ${cfg.color}30` }}
          >
            <Icon size={18} color={cfg.color} />
          </div>
          <div>
            <div className="font-mono font-bold text-sm uppercase tracking-widest" style={{ color: C.text }}>
              {svc.name}
            </div>
            <div className="text-[10px] font-mono mt-0.5" style={{ color: C.textDim }}>
              {svc.version}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <PulseRing color={cfg.color} />
          <span className="text-[10px] font-mono uppercase font-bold tracking-widest" style={{ color: cfg.color }}>
            {cfg.label}
          </span>
        </div>
      </div>

      <p className="text-[11px] font-mono leading-relaxed" style={{ color: C.textDim }}>
        {svc.description}
      </p>

      {svc.latencyMs > 0 && (
        <div className="flex items-center gap-2">
          <Clock size={11} color={C.muted} />
          <span className="text-[10px] font-mono" style={{ color: C.muted }}>
            {svc.latencyMs}ms latency
          </span>
        </div>
      )}

      {svc.bucketId && (
        <div
          className="text-[9px] font-mono px-2 py-1 rounded-sm truncate"
          style={{ background: "#00ff8810", border: `1px solid ${C.green}20`, color: C.green }}
        >
          BUCKET: {svc.bucketId}
        </div>
      )}

      <div className="flex flex-wrap gap-1.5 mt-1">
        {svc.tags.map((tag) => (
          <span
            key={tag}
            className="text-[9px] font-mono uppercase px-2 py-0.5 rounded-sm"
            style={{ background: "#ffffff08", border: `1px solid ${C.border}`, color: C.textDim }}
          >
            {tag}
          </span>
        ))}
      </div>
    </motion.div>
  );
}

function UploadPanel() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "requesting" | "uploading" | "done" | "error">("idle");
  const [objectPath, setObjectPath] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = async () => {
    if (!file) return;
    setStatus("requesting");
    setError(null);
    try {
      const res = await fetch("/api/storage/uploads/request-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
      });
      if (!res.ok) throw new Error(`Failed to get upload URL: ${res.status}`);
      const { uploadURL, objectPath: path } = await res.json();

      setStatus("uploading");
      const putRes = await fetch(uploadURL, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!putRes.ok) throw new Error(`Upload failed: ${putRes.status}`);

      setObjectPath(path);
      setStatus("done");
      setFile(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Upload failed");
      setStatus("error");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderTop: `3px solid ${C.purple}` }}
      className="rounded-sm p-5 col-span-full"
    >
      <div className="flex items-center gap-2 mb-4">
        <UploadCloud size={16} color={C.purple} />
        <span className="font-mono font-bold text-sm uppercase tracking-widest" style={{ color: C.text }}>
          Object Storage — File Upload
        </span>
        <span
          className="ml-2 text-[9px] font-mono uppercase px-2 py-0.5 rounded-sm"
          style={{ background: `${C.purple}15`, border: `1px solid ${C.purple}30`, color: C.purple }}
        >
          GCS-backed
        </span>
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        <label
          className="flex items-center gap-2 px-4 py-2 rounded-sm cursor-pointer text-xs font-mono uppercase tracking-wider transition-colors"
          style={{ background: "#ffffff0a", border: `1px solid ${C.border}`, color: C.text }}
        >
          <HardDrive size={13} />
          {file ? file.name : "Select file"}
          <input
            type="file"
            className="hidden"
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null);
              setStatus("idle");
              setObjectPath(null);
              setError(null);
            }}
          />
        </label>

        {file && (
          <button
            onClick={handleUpload}
            disabled={status === "requesting" || status === "uploading"}
            className="flex items-center gap-2 px-4 py-2 rounded-sm text-xs font-mono uppercase tracking-wider transition-all disabled:opacity-50"
            style={{
              background: `${C.purple}20`,
              border: `1px solid ${C.purple}50`,
              color: C.purple,
            }}
          >
            {status === "requesting" || status === "uploading" ? (
              <>
                <RefreshCw size={12} className="animate-spin" />
                {status === "requesting" ? "Requesting URL..." : "Uploading..."}
              </>
            ) : (
              <>
                <UploadCloud size={12} />
                Upload to Storage
              </>
            )}
          </button>
        )}
      </div>

      <AnimatePresence>
        {status === "done" && objectPath && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3"
          >
            <div
              className="text-[10px] font-mono px-3 py-2 rounded-sm flex items-center gap-2"
              style={{ background: `${C.green}10`, border: `1px solid ${C.green}30`, color: C.green }}
            >
              <CheckCircle2 size={12} />
              Upload complete — Object path: {objectPath}
            </div>
          </motion.div>
        )}
        {status === "error" && error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3"
          >
            <div
              className="text-[10px] font-mono px-3 py-2 rounded-sm flex items-center gap-2"
              style={{ background: `${C.red}10`, border: `1px solid ${C.red}30`, color: C.red }}
            >
              <AlertTriangle size={12} />
              {error}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function Services() {
  const [data, setData] = useState<ServicesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStatus = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    try {
      const res = await fetch("/api/services/status");
      if (!res.ok) throw new Error("Failed to fetch services status");
      const json: ServicesData = await res.json();
      setData(json);
      setLastRefresh(new Date());
    } catch {
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(() => fetchStatus(), 15000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  const onlineCount = data?.services.filter((s) => s.status === "online").length ?? 0;
  const totalCount = data?.services.length ?? 0;

  return (
    <div
      className="min-h-screen p-6 font-mono"
      style={{ background: C.bg, color: C.text }}
    >
      <div className="max-w-5xl mx-auto space-y-6">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start justify-between gap-4 flex-wrap"
        >
          <div>
            <div className="flex items-center gap-3 mb-1">
              <Activity size={18} color={C.cyan} />
              <h1
                className="text-xl font-black uppercase tracking-[0.25em]"
                style={{ color: C.cyan, textShadow: `0 0 20px ${C.cyan}60` }}
              >
                Sentinel_Services
              </h1>
            </div>
            <p className="text-[11px] uppercase tracking-widest opacity-40">
              Real-time service health and infrastructure status
            </p>
          </div>

          <div className="flex items-center gap-4">
            {lastRefresh && (
              <span className="text-[10px] opacity-40 flex items-center gap-1.5">
                <Clock size={10} />
                {lastRefresh.toLocaleTimeString()}
              </span>
            )}

            {!loading && (
              <div
                className="px-3 py-1.5 rounded-sm text-[11px] font-bold uppercase tracking-widest"
                style={{
                  background: onlineCount === totalCount ? `${C.green}15` : `${C.yellow}15`,
                  border: `1px solid ${onlineCount === totalCount ? C.green : C.yellow}40`,
                  color: onlineCount === totalCount ? C.green : C.yellow,
                }}
              >
                {onlineCount}/{totalCount} ONLINE
              </div>
            )}

            <button
              onClick={() => fetchStatus(true)}
              disabled={refreshing}
              className="flex items-center gap-2 px-3 py-1.5 rounded-sm text-[11px] uppercase tracking-wider transition-all disabled:opacity-50"
              style={{
                background: `${C.cyan}10`,
                border: `1px solid ${C.cyan}30`,
                color: C.cyan,
              }}
            >
              <RefreshCw size={11} className={refreshing ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>
        </motion.div>

        {data?.meta && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-3 gap-3"
          >
            {[
              { label: "Node Version", value: data.meta.nodeVersion, icon: Cpu },
              { label: "API Uptime", value: formatUptime(data.meta.uptime), icon: Clock },
              { label: "Environment", value: data.meta.env.toUpperCase(), icon: Wifi },
            ].map(({ label, value, icon: Icon }) => (
              <div
                key={label}
                className="px-4 py-3 rounded-sm flex items-center gap-3"
                style={{ background: C.bgCard, border: `1px solid ${C.border}` }}
              >
                <Icon size={14} color={C.cyan} />
                <div>
                  <div className="text-[9px] uppercase tracking-widest opacity-40">{label}</div>
                  <div className="text-sm font-bold mt-0.5" style={{ color: C.cyan }}>
                    {value}
                  </div>
                </div>
              </div>
            ))}
          </motion.div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="h-40 rounded-sm animate-pulse"
                style={{ background: C.bgCard, border: `1px solid ${C.border}` }}
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {data?.services.map((svc, i) => (
              <ServiceCard key={svc.id} svc={svc} index={i} />
            ))}
            <UploadPanel />
          </div>
        )}
      </div>
    </div>
  );
}
