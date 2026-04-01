import { 
  useGetSession, getGetSessionQueryKey,
  useListSignals, getListSignalsQueryKey,
  useListPaths, getListPathsQueryKey,
  useCreateSignal,
  useSubmitPathFeedback,
  useUpdateSession
} from "@workspace/api-client-react";
import { useParams, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft, Play, Pause, CheckCircle2, Zap, GitFork, ThumbsUp, ThumbsDown, Send,
  Brain, Cpu, Activity, RotateCcw, ChevronRight, Loader2
} from "lucide-react";
import { useState, useRef, useEffect, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

interface InferenceResult {
  phase: "idle" | "analyzing" | "scored" | "routing" | "done" | "error";
  weight?: number;
  confidence?: number;
  category?: string;
  tags?: string[];
  reasoning?: string;
  pathNodes?: string[];
  pathLabel?: string;
  adaptationDelta?: number;
  error?: string;
}

export default function SessionDetail() {
  const { id } = useParams();
  const sessionId = parseInt(id || "0", 10);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: session, isLoading: sessionLoading } = useGetSession(sessionId, { query: { enabled: !!sessionId, queryKey: getGetSessionQueryKey(sessionId) } });
  const { data: signals, isLoading: signalsLoading } = useListSignals(sessionId, { query: { enabled: !!sessionId, queryKey: getListSignalsQueryKey(sessionId) } });
  const { data: paths, isLoading: pathsLoading } = useListPaths(sessionId, { query: { enabled: !!sessionId, queryKey: getListPathsQueryKey(sessionId) } });

  const createSignal = useCreateSignal();
  const submitFeedback = useSubmitPathFeedback();
  const updateSession = useUpdateSession();

  const [newSignal, setNewSignal] = useState("");
  const [signalCategory, setSignalCategory] = useState<"behavioral" | "semantic" | "temporal" | "contextual">("semantic");
  const signalsEndRef = useRef<HTMLDivElement>(null);

  // AI Inference state
  const [inferInput, setInferInput] = useState("");
  const [inferring, setInferring] = useState(false);
  const [inferResult, setInferResult] = useState<InferenceResult>({ phase: "idle" });
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    signalsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [signals?.length]);

  const handleCreateSignal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSignal.trim()) return;
    createSignal.mutate({ id: sessionId, data: { input: newSignal, category: signalCategory } }, {
      onSuccess: () => {
        setNewSignal("");
        queryClient.invalidateQueries({ queryKey: getListSignalsQueryKey(sessionId) });
        queryClient.invalidateQueries({ queryKey: getGetSessionQueryKey(sessionId) });
        queryClient.invalidateQueries({ queryKey: getListPathsQueryKey(sessionId) });
      },
      onError: () => {
        toast({ title: "Signal Rejected", description: "Failed to ingest signal.", variant: "destructive" });
      }
    });
  };

  const handleFeedback = (pathId: number, score: number) => {
    submitFeedback.mutate({ id: sessionId, pathId, data: { score } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListPathsQueryKey(sessionId) });
        toast({ title: "Feedback Registered", description: "Path weights adjusted successfully." });
      }
    });
  };

  const handleStatusChange = (status: "active" | "paused" | "completed") => {
    updateSession.mutate({ id: sessionId, data: { status } }, {
      onSuccess: () => {
        queryClient.setQueryData(getGetSessionQueryKey(sessionId), (old: any) => old ? { ...old, status } : old);
        toast({ title: "Status Updated", description: `Session is now ${status}.` });
      }
    });
  };

  const runInference = useCallback(async () => {
    if (!inferInput.trim() || inferring) return;

    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setInferring(true);
    setInferResult({ phase: "analyzing" });

    try {
      const res = await fetch("/api/infer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: inferInput, sessionId }),
        signal: abortRef.current.signal,
      });

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buf = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });

        const lines = buf.split("\n");
        buf = lines.pop() ?? "";

        let event = "";
        for (const line of lines) {
          if (line.startsWith("event: ")) {
            event = line.slice(7).trim();
          } else if (line.startsWith("data: ")) {
            const data = JSON.parse(line.slice(6).trim());

            if (event === "status") {
              setInferResult(prev => ({ ...prev, phase: data.phase as any }));
            } else if (event === "scored") {
              setInferResult(prev => ({
                ...prev,
                phase: "scored",
                weight: data.weight,
                confidence: data.confidence,
                category: data.category,
                tags: data.tags,
                reasoning: data.reasoning,
              }));
            } else if (event === "path") {
              setInferResult(prev => ({
                ...prev,
                phase: "routing",
                pathLabel: data.label,
                pathNodes: data.nodes,
              }));
            } else if (event === "done") {
              setInferResult(prev => ({
                ...prev,
                phase: "done",
                adaptationDelta: data.adaptationDelta,
              }));
              queryClient.invalidateQueries({ queryKey: getListSignalsQueryKey(sessionId) });
              queryClient.invalidateQueries({ queryKey: getGetSessionQueryKey(sessionId) });
              queryClient.invalidateQueries({ queryKey: getListPathsQueryKey(sessionId) });
            } else if (event === "error") {
              setInferResult({ phase: "error", error: data.message });
            }
          }
        }
      }
    } catch (err: any) {
      if (err.name !== "AbortError") {
        setInferResult({ phase: "error", error: "Connection failed" });
      }
    } finally {
      setInferring(false);
    }
  }, [inferInput, inferring, sessionId, queryClient]);

  if (sessionLoading) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto p-4">
        <Skeleton className="h-32 bg-card/40 w-full rounded-lg" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-[500px] bg-card/40 rounded-lg" />
          <Skeleton className="h-[500px] bg-card/40 rounded-lg" />
        </div>
      </div>
    );
  }

  if (!session) return <div className="p-8 text-center font-mono text-destructive">Session not found.</div>;

  const categoryColor = (cat?: string) => {
    switch (cat) {
      case "behavioral": return "text-blue-400 border-blue-400/30 bg-blue-400/10";
      case "semantic": return "text-primary border-primary/30 bg-primary/10";
      case "temporal": return "text-violet-400 border-violet-400/30 bg-violet-400/10";
      case "contextual": return "text-cyan-400 border-cyan-400/30 bg-cyan-400/10";
      default: return "text-muted-foreground border-border/30 bg-background/50";
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in duration-500">
      <Link href="/sessions" className="inline-flex items-center text-xs font-mono text-muted-foreground hover:text-primary transition-colors uppercase tracking-wider">
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Sessions
      </Link>

      {/* Session Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 bg-card/40 border border-border/50 p-6 md:p-8 rounded-lg backdrop-blur relative overflow-hidden">
        <div className="absolute right-0 top-0 w-1/3 h-full bg-gradient-to-l from-primary/5 to-transparent pointer-events-none" />
        <div className="space-y-3 relative z-10">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl md:text-3xl font-bold font-mono uppercase tracking-tight text-foreground">{session.name}</h1>
            <Badge variant="outline" className={`font-mono text-[10px] uppercase border px-2 py-0.5 ${
              session.status === 'active' ? 'text-primary border-primary/50 bg-primary/10 shadow-[0_0_10px_rgba(0,255,255,0.2)]' :
              session.status === 'completed' ? 'text-cyan-400 border-cyan-400/50 bg-cyan-400/10' :
              'text-muted-foreground border-muted-foreground/30 bg-background/50'
            }`}>
              {session.status}
            </Badge>
          </div>
          <p className="text-muted-foreground font-mono text-sm max-w-2xl leading-relaxed">{session.description || "No context provided."}</p>
          <div className="flex items-center gap-8 mt-6 pt-4 border-t border-border/30">
            <div className="text-xs font-mono flex flex-col gap-1">
              <span className="text-muted-foreground uppercase tracking-widest text-[10px]">Adaptation Score</span>
              <span className="text-primary font-bold text-lg">{(session.adaptationScore * 100).toFixed(1)}%</span>
            </div>
            <div className="text-xs font-mono flex flex-col gap-1">
              <span className="text-muted-foreground uppercase tracking-widest text-[10px]">Signals</span>
              <span className="text-foreground font-bold text-lg">{session.signalCount}</span>
            </div>
            <div className="text-xs font-mono flex flex-col gap-1">
              <span className="text-muted-foreground uppercase tracking-widest text-[10px]">Paths</span>
              <span className="text-foreground font-bold text-lg">{session.pathCount}</span>
            </div>
            <div className="text-xs font-mono flex flex-col gap-1">
              <span className="text-muted-foreground uppercase tracking-widest text-[10px]">Created</span>
              <span className="text-foreground">{format(new Date(session.createdAt), 'MMM d, yyyy HH:mm')}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 relative z-10 shrink-0">
          {session.status !== 'active' && (
            <Button size="sm" variant="outline" className="font-mono text-xs uppercase tracking-wider bg-background/50 border-border/50 hover:bg-primary/10 hover:text-primary hover:border-primary/50" onClick={() => handleStatusChange('active')}>
              <Play className="w-3.5 h-3.5 mr-2 text-primary" /> Resume
            </Button>
          )}
          {session.status === 'active' && (
            <Button size="sm" variant="outline" className="font-mono text-xs uppercase tracking-wider bg-background/50 border-border/50 hover:bg-yellow-500/10 hover:text-yellow-500 hover:border-yellow-500/50" onClick={() => handleStatusChange('paused')}>
              <Pause className="w-3.5 h-3.5 mr-2 text-yellow-500" /> Pause
            </Button>
          )}
          {session.status !== 'completed' && (
            <Button size="sm" variant="outline" className="font-mono text-xs uppercase tracking-wider bg-background/50 border-border/50 hover:bg-cyan-400/10 hover:text-cyan-400 hover:border-cyan-400/50" onClick={() => handleStatusChange('completed')}>
              <CheckCircle2 className="w-3.5 h-3.5 mr-2 text-cyan-400" /> Complete
            </Button>
          )}
        </div>
      </div>

      {/* AI Inference Engine — full width */}
      <Card className="bg-card/40 backdrop-blur border border-primary/20 shadow-[0_0_30px_rgba(0,255,255,0.04)] relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-violet-500/5 pointer-events-none" />
        <CardHeader className="py-4 px-5 border-b border-border/50 bg-background/20 relative z-10">
          <CardTitle className="font-mono text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <Cpu className="w-4 h-4 text-primary" />
            AI Inference Engine
            <span className="ml-auto text-[10px] text-muted-foreground/50 font-normal normal-case tracking-normal">
              gpt-5.2 · semantic scoring · memory-aware · streams in real time
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Input side */}
            <div className="space-y-3">
              <label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Input Signal</label>
              <Textarea
                placeholder="Describe a signal, behavior, or observation to score through the AI engine..."
                className="font-mono text-sm bg-background/60 border-border/60 focus-visible:ring-primary/50 resize-none h-32"
                value={inferInput}
                onChange={(e) => setInferInput(e.target.value)}
                disabled={inferring}
                onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) runInference(); }}
                data-testid="input-infer"
              />
              <div className="flex items-center gap-2">
                <Button
                  className="font-mono text-xs uppercase tracking-wider bg-primary hover:bg-primary/90 text-primary-foreground"
                  onClick={runInference}
                  disabled={inferring || !inferInput.trim()}
                  data-testid="button-run-inference"
                >
                  {inferring ? <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" /> : <Brain className="w-3.5 h-3.5 mr-2" />}
                  {inferring ? "Processing..." : "Run Inference"}
                </Button>
                {inferResult.phase !== "idle" && !inferring && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="font-mono text-xs text-muted-foreground"
                    onClick={() => { setInferResult({ phase: "idle" }); setInferInput(""); }}
                  >
                    <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Reset
                  </Button>
                )}
                <span className="ml-auto text-[10px] font-mono text-muted-foreground/40">⌘ + Enter to run</span>
              </div>

              {/* Phase tracker */}
              <div className="flex items-center gap-2 pt-2">
                {["analyzing", "scored", "routing", "done"].map((p, i) => {
                  const phases = ["analyzing", "scored", "routing", "done"];
                  const currentIdx = phases.indexOf(inferResult.phase);
                  const isActive = inferResult.phase === p;
                  const isDone = currentIdx > i;
                  return (
                    <div key={p} className="flex items-center gap-2">
                      <div className={`flex items-center gap-1.5 text-[10px] font-mono uppercase transition-all ${
                        isActive ? "text-primary" : isDone ? "text-primary/50" : "text-muted-foreground/30"
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          isActive ? "bg-primary animate-pulse shadow-[0_0_6px_hsl(var(--primary))]" : isDone ? "bg-primary/40" : "bg-muted-foreground/20"
                        }`} />
                        {p}
                      </div>
                      {i < 3 && <span className="text-muted-foreground/20 text-[10px]">›</span>}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Result side */}
            <AnimatePresence mode="wait">
              {inferResult.phase === "idle" && (
                <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-center h-full min-h-[160px] border border-dashed border-border/30 rounded-lg">
                  <div className="text-center text-muted-foreground/40 font-mono text-xs uppercase tracking-widest">
                    <Activity className="w-6 h-6 mx-auto mb-2 opacity-30" />
                    Awaiting input
                  </div>
                </motion.div>
              )}

              {(inferResult.phase === "analyzing" || inferResult.phase === "routing") && (
                <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-center h-full min-h-[160px] border border-primary/10 rounded-lg bg-primary/5">
                  <div className="text-center font-mono text-xs space-y-3">
                    <Cpu className="w-8 h-8 mx-auto text-primary animate-pulse" />
                    <div className="text-primary/80 uppercase tracking-widest">
                      {inferResult.phase === "analyzing" ? "Analyzing semantics..." : "Computing path..."}
                    </div>
                  </div>
                </motion.div>
              )}

              {(inferResult.phase === "scored" || inferResult.phase === "done") && (
                <motion.div key="result" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                  {/* Scores */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-background/60 border border-border/50 rounded-md p-3 text-center">
                      <div className="text-[9px] font-mono text-muted-foreground uppercase tracking-widest mb-1">Weight</div>
                      <div className="text-xl font-bold font-mono text-primary">{inferResult.weight?.toFixed(2)}</div>
                      <div className="mt-1.5 h-1 bg-muted rounded-full overflow-hidden">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${(inferResult.weight ?? 0) * 100}%` }} transition={{ delay: 0.2, duration: 0.6 }} className="h-full bg-primary" />
                      </div>
                    </div>
                    <div className="bg-background/60 border border-border/50 rounded-md p-3 text-center">
                      <div className="text-[9px] font-mono text-muted-foreground uppercase tracking-widest mb-1">Confidence</div>
                      <div className="text-xl font-bold font-mono text-cyan-400">{inferResult.confidence?.toFixed(2)}</div>
                      <div className="mt-1.5 h-1 bg-muted rounded-full overflow-hidden">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${(inferResult.confidence ?? 0) * 100}%` }} transition={{ delay: 0.3, duration: 0.6 }} className="h-full bg-cyan-400" />
                      </div>
                    </div>
                    <div className="bg-background/60 border border-border/50 rounded-md p-3 text-center">
                      <div className="text-[9px] font-mono text-muted-foreground uppercase tracking-widest mb-1">Category</div>
                      <span className={`text-[10px] font-mono uppercase px-1.5 py-0.5 rounded border ${categoryColor(inferResult.category)}`}>
                        {inferResult.category}
                      </span>
                    </div>
                  </div>

                  {/* Reasoning */}
                  {inferResult.reasoning && (
                    <div className="bg-background/40 border border-border/30 rounded-md p-3">
                      <div className="text-[9px] font-mono text-muted-foreground uppercase tracking-widest mb-1.5">Reasoning</div>
                      <p className="text-xs text-foreground/80 font-mono leading-relaxed">{inferResult.reasoning}</p>
                    </div>
                  )}

                  {/* Tags */}
                  {inferResult.tags && inferResult.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {inferResult.tags.map(t => (
                        <span key={t} className="text-[10px] font-mono px-2 py-0.5 rounded border border-primary/20 bg-primary/5 text-primary/70">#{t}</span>
                      ))}
                    </div>
                  )}

                  {/* Suggested path */}
                  {inferResult.pathNodes && inferResult.pathNodes.length > 0 && (
                    <div className="bg-background/40 border border-violet-500/20 rounded-md p-3">
                      <div className="text-[9px] font-mono text-violet-400 uppercase tracking-widest mb-2">Suggested Path · {inferResult.pathLabel}</div>
                      <div className="flex flex-wrap gap-1.5 items-center">
                        {inferResult.pathNodes.map((node, i) => (
                          <div key={i} className="flex items-center gap-1.5">
                            <span className="text-[10px] font-mono px-2 py-1 rounded bg-background border border-border/50 text-foreground/80">{node}</span>
                            {i < inferResult.pathNodes!.length - 1 && <ChevronRight className="w-3 h-3 text-muted-foreground/30" />}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Done delta */}
                  {inferResult.phase === "done" && inferResult.adaptationDelta !== undefined && (
                    <div className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground">
                      <span className={inferResult.adaptationDelta >= 0 ? "text-primary" : "text-destructive"}>
                        {inferResult.adaptationDelta >= 0 ? "+" : ""}{(inferResult.adaptationDelta * 100).toFixed(1)}%
                      </span>
                      adaptation delta · signal + path persisted to session memory
                    </div>
                  )}
                </motion.div>
              )}

              {inferResult.phase === "error" && (
                <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-center h-full min-h-[160px] border border-destructive/20 rounded-lg bg-destructive/5">
                  <div className="text-center font-mono text-xs text-destructive space-y-2">
                    <div className="uppercase tracking-widest">Engine Error</div>
                    <div className="text-muted-foreground text-[10px]">{inferResult.error}</div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </CardContent>
      </Card>

      {/* Signals + Paths */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" style={{ minHeight: "560px" }}>
        {/* Signals */}
        <div className="lg:col-span-5 h-full">
          <Card className="bg-card/40 backdrop-blur border-border/50 h-full flex flex-col" style={{ minHeight: "560px" }}>
            <CardHeader className="py-4 px-5 border-b border-border/50 shrink-0 bg-background/20">
              <CardTitle className="font-mono text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <Zap className="w-4 h-4 text-primary" /> Signal Ingestion Stream
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 flex flex-col flex-1 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {signalsLoading ? (
                  Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 w-full bg-card/60" />)
                ) : signals?.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-muted-foreground font-mono text-sm opacity-50 py-12">
                    <Zap className="w-8 h-8 mb-2" /> Waiting for signal ingestion...
                  </div>
                ) : (
                  <AnimatePresence initial={false}>
                    {signals?.map((signal) => (
                      <motion.div
                        key={signal.id}
                        initial={{ opacity: 0, x: -20, scale: 0.95 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        className="p-3 rounded-md bg-background/60 border border-border/40 hover:border-primary/30 transition-colors flex flex-col gap-2 relative group"
                      >
                        <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-primary/30 rounded-l-md group-hover:bg-primary transition-colors" />
                        <div className="flex justify-between items-center pl-1">
                          <span className={`font-mono text-[9px] uppercase px-1.5 py-0.5 rounded border ${categoryColor(signal.category)}`}>{signal.category}</span>
                          <span className="font-mono text-[10px] text-muted-foreground/50">{format(new Date(signal.createdAt), 'HH:mm:ss')}</span>
                        </div>
                        <div className="font-mono text-sm text-foreground pl-1 leading-relaxed">{signal.input}</div>
                        <div className="flex items-center gap-4 mt-2 pl-1">
                          <div className="flex items-center gap-2 flex-1">
                            <span className="text-[9px] font-mono text-muted-foreground uppercase w-8">W</span>
                            <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden"><div className="h-full bg-primary" style={{ width: `${signal.weight * 100}%` }} /></div>
                            <span className="text-[9px] font-mono text-muted-foreground">{signal.weight.toFixed(2)}</span>
                          </div>
                          <div className="flex items-center gap-2 flex-1">
                            <span className="text-[9px] font-mono text-muted-foreground uppercase w-8">C</span>
                            <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden"><div className="h-full bg-cyan-400" style={{ width: `${signal.confidence * 100}%` }} /></div>
                            <span className="text-[9px] font-mono text-muted-foreground">{signal.confidence.toFixed(2)}</span>
                          </div>
                        </div>
                        {signal.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 pl-1">
                            {signal.tags.slice(0, 4).map(t => (
                              <span key={t} className="text-[9px] font-mono px-1.5 py-0.5 rounded border border-border/30 text-muted-foreground/60">#{t}</span>
                            ))}
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </AnimatePresence>
                )}
                <div ref={signalsEndRef} />
              </div>
              <div className="p-4 border-t border-border/50 bg-background/40 shrink-0">
                <form onSubmit={handleCreateSignal} className="flex gap-2">
                  <Select value={signalCategory} onValueChange={(val: any) => setSignalCategory(val)} disabled={session.status !== 'active'}>
                    <SelectTrigger className="w-[120px] font-mono text-xs uppercase bg-card/50 border-border/50">
                      <SelectValue placeholder="Cat" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="behavioral" className="font-mono text-xs">Behavioral</SelectItem>
                      <SelectItem value="semantic" className="font-mono text-xs">Semantic</SelectItem>
                      <SelectItem value="temporal" className="font-mono text-xs">Temporal</SelectItem>
                      <SelectItem value="contextual" className="font-mono text-xs">Contextual</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="Input raw signal..."
                    className="font-mono text-sm bg-card/50 border-border/50 focus-visible:ring-primary/50"
                    value={newSignal}
                    onChange={(e) => setNewSignal(e.target.value)}
                    disabled={createSignal.isPending || session.status !== 'active'}
                    data-testid="input-signal"
                  />
                  <Button type="submit" size="icon" className="shrink-0 bg-primary hover:bg-primary/90 text-primary-foreground" disabled={createSignal.isPending || !newSignal.trim() || session.status !== 'active'}>
                    <Send className="w-4 h-4" />
                  </Button>
                </form>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Adaptive Paths */}
        <div className="lg:col-span-7 h-full">
          <Card className="bg-card/40 backdrop-blur border-border/50 h-full flex flex-col" style={{ minHeight: "560px" }}>
            <CardHeader className="py-4 px-5 border-b border-border/50 shrink-0 bg-background/20 flex flex-row items-center justify-between">
              <CardTitle className="font-mono text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <GitFork className="w-4 h-4 text-cyan-400" /> Adaptive Paths
              </CardTitle>
              <div className="flex items-center gap-3 text-[10px] font-mono text-muted-foreground">
                <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-primary/50" /> Reinforced</div>
                <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-destructive/50" /> Deprecated</div>
              </div>
            </CardHeader>
            <CardContent className="p-5 flex-1 overflow-y-auto space-y-4">
              {pathsLoading ? (
                Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 w-full bg-card/60" />)
              ) : paths?.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center py-12">
                  <Brain className="w-16 h-16 text-muted-foreground/20 mb-4 animate-pulse" />
                  <p className="text-muted-foreground font-mono text-sm tracking-wider uppercase">System is analyzing signals</p>
                  <p className="text-muted-foreground/40 font-mono text-xs mt-2">Run inference or submit signals to generate paths.</p>
                </div>
              ) : (
                paths?.map((path, i) => (
                  <motion.div
                    key={path.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className={`p-4 rounded-lg border transition-all ${
                      path.status === 'reinforced' ? 'bg-primary/5 border-primary/40 shadow-[inset_0_0_20px_rgba(0,255,255,0.05)]' :
                      path.status === 'deprecated' ? 'bg-destructive/5 border-destructive/20 opacity-70 grayscale-[0.5]' :
                      'bg-background/40 border-border/50 hover:border-border'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <h4 className="font-mono text-sm font-bold text-foreground flex items-center gap-2">
                        {path.label}
                        {path.status === 'reinforced' && <span className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_8px_hsl(var(--primary))]" />}
                      </h4>
                      <Badge variant="outline" className={`font-mono text-[9px] uppercase border px-1.5 py-0 ${
                        path.status === 'reinforced' ? 'text-primary border-primary/50' :
                        path.status === 'deprecated' ? 'text-destructive border-destructive/50' :
                        'text-muted-foreground border-border/50'
                      }`}>
                        {path.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground font-sans mb-4 leading-relaxed">{path.description}</p>
                    <div className="flex flex-wrap gap-1.5 mb-5 bg-card/30 p-2.5 rounded-md border border-border/30">
                      {path.nodes.map((node, j) => (
                        <div key={j} className="flex items-center text-[10px] font-mono text-foreground/90">
                          <span className="px-2 py-1 rounded bg-background border border-border/50">{node}</span>
                          {j < path.nodes.length - 1 && <span className="mx-1.5 text-muted-foreground/30">→</span>}
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center justify-between border-t border-border/30 pt-3">
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Conf</span>
                        <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className={`h-full ${path.confidence > 0.8 ? 'bg-primary' : path.confidence > 0.5 ? 'bg-cyan-400' : 'bg-muted-foreground'}`} style={{ width: `${path.confidence * 100}%` }} />
                        </div>
                        <span className="text-[10px] font-mono text-foreground">{(path.confidence * 100).toFixed(0)}%</span>
                      </div>
                      {session.status === 'active' && (
                        <div className="flex items-center gap-1">
                          <Button size="sm" variant="ghost" className="h-7 px-2 text-[10px] font-mono uppercase rounded hover:text-primary hover:bg-primary/10" onClick={() => handleFeedback(path.id, 1)}>
                            <ThumbsUp className="w-3 h-3 mr-1.5" /> Reinforce
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 px-2 text-[10px] font-mono uppercase rounded hover:text-destructive hover:bg-destructive/10" onClick={() => handleFeedback(path.id, -1)}>
                            <ThumbsDown className="w-3 h-3 mr-1.5" /> Deprecate
                          </Button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
