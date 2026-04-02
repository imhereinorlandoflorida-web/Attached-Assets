export interface PathDesignation {
  id: string;
  label: string;
  description: string;
  inputVector: string;
  outputType: string;
  scoringAxes: Array<"behavioral" | "semantic" | "temporal" | "contextual">;
  color: string;
}

export const PATH_DESIGNATIONS: PathDesignation[] = [
  {
    id: "01",
    label: "Conversion",
    description: "Leads and inbound DMs routed toward a closed transaction.",
    inputVector: "Lead / DM",
    outputType: "Status Change: Signal → Paid Session",
    scoringAxes: ["semantic"],
    color: "#0dd4f0",
  },
  {
    id: "02",
    label: "Synthesis",
    description: "Raw data and chaos structured into a deployable artifact.",
    inputVector: "Raw Data / Chaos",
    outputType: "Artifact: 1-Page Roadmap / Action Map",
    scoringAxes: ["semantic"],
    color: "#7e47eb",
  },
  {
    id: "03",
    label: "Aesthetic",
    description: "Visual inputs classified for identity and creative direction.",
    inputVector: "Image / Visual",
    outputType: "Selection: Needle vs Base Visual Identity",
    scoringAxes: ["behavioral"],
    color: "#0080ff",
  },
  {
    id: "04",
    label: "Risk/Sentinel",
    description: "Anomalies and delays surfaced before they become failures.",
    inputVector: "Anomaly / Delay",
    outputType: "Alert: Deadline Breach / Decision Fatigue",
    scoringAxes: ["temporal"],
    color: "#f59e0b",
  },
  {
    id: "05",
    label: "Scale",
    description: "Conversion path automated through integration triggers.",
    inputVector: "Automation Trigger",
    outputType: "Workflow: Zapier/Make integration",
    scoringAxes: ["semantic", "behavioral"],
    color: "#10b981",
  },
  {
    id: "06",
    label: "Memory",
    description: "Signals archived and surfaced through recursive retrieval.",
    inputVector: "Historical Signal",
    outputType: "Vault: Archival + Retrieval",
    scoringAxes: ["behavioral", "contextual"],
    color: "#8b5cf6",
  },
  {
    id: "07",
    label: "Refinement",
    description: "Current state mirrored against target to compute the delta.",
    inputVector: "State Snapshot",
    outputType: "Delta: Current → Target Gap Analysis",
    scoringAxes: ["semantic", "temporal"],
    color: "#ec4899",
  },
  {
    id: "08",
    label: "Direct Outreach",
    description: "Active signal generation — the 20 DMs protocol.",
    inputVector: "Outreach Target",
    outputType: "Signal: Active DM Deployment",
    scoringAxes: ["behavioral", "temporal"],
    color: "#f97316",
  },
];

export const PATH_DESIGNATION_MAP = Object.fromEntries(
  PATH_DESIGNATIONS.map((p) => [p.id, p])
) as Record<string, PathDesignation>;

export function getDesignationById(id: string | null | undefined): PathDesignation | null {
  if (!id) return null;
  return PATH_DESIGNATION_MAP[id] ?? null;
}
