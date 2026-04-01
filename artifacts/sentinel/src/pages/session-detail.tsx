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
import { ArrowLeft, Play, Pause, CheckCircle2, Zap, GitFork, ThumbsUp, ThumbsDown, Send, Brain } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

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

  if (sessionLoading) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto p-4">
        <Skeleton className="h-32 bg-card/40 w-full rounded-lg" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-[600px] bg-card/40 rounded-lg" />
          <Skeleton className="h-[600px] bg-card/40 rounded-lg" />
        </div>
      </div>
    );
  }

  if (!session) return <div className="p-8 text-center font-mono text-destructive">Session not found.</div>;

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in duration-500">
      <Link href="/sessions" className="inline-flex items-center text-xs font-mono text-muted-foreground hover:text-primary transition-colors uppercase tracking-wider">
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Sessions
      </Link>

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

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[700px]">
        {/* Left Col: Signals (5 cols) */}
        <div className="lg:col-span-5 h-full">
          <Card className="bg-card/40 backdrop-blur border-border/50 h-full flex flex-col">
            <CardHeader className="py-4 px-5 border-b border-border/50 shrink-0 bg-background/20">
              <CardTitle className="font-mono text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <Zap className="w-4 h-4 text-primary" />
                Signal Ingestion Stream
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 flex flex-col flex-1 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                {signalsLoading ? (
                  Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 w-full bg-card/60" />)
                ) : signals?.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-muted-foreground font-mono text-sm opacity-50">
                    <Zap className="w-8 h-8 mb-2" />
                    Waiting for signal ingestion...
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
                          <span className={`font-mono text-[9px] uppercase px-1.5 py-0.5 rounded border ${
                            signal.category === 'behavioral' ? 'text-blue-400 border-blue-400/30 bg-blue-400/10' :
                            signal.category === 'semantic' ? 'text-primary border-primary/30 bg-primary/10' :
                            signal.category === 'temporal' ? 'text-violet-400 border-violet-400/30 bg-violet-400/10' :
                            'text-cyan-400 border-cyan-400/30 bg-cyan-400/10'
                          }`}>
                            {signal.category}
                          </span>
                          <span className="font-mono text-[10px] text-muted-foreground/50">{format(new Date(signal.createdAt), 'HH:mm:ss')}</span>
                        </div>
                        <div className="font-mono text-sm text-foreground pl-1 leading-relaxed">{signal.input}</div>
                        <div className="flex items-center gap-4 mt-2 pl-1">
                          <div className="flex items-center gap-2 flex-1">
                            <span className="text-[9px] font-mono text-muted-foreground uppercase w-8">W</span>
                            <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden"><div className="h-full bg-primary" style={{ width: `${signal.weight * 100}%` }} /></div>
                          </div>
                          <div className="flex items-center gap-2 flex-1">
                            <span className="text-[9px] font-mono text-muted-foreground uppercase w-8">C</span>
                            <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden"><div className="h-full bg-cyan-400" style={{ width: `${signal.confidence * 100}%` }} /></div>
                          </div>
                        </div>
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
                  />
                  <Button type="submit" size="icon" className="shrink-0 bg-primary hover:bg-primary/90 text-primary-foreground" disabled={createSignal.isPending || !newSignal.trim() || session.status !== 'active'}>
                    <Send className="w-4 h-4" />
                  </Button>
                </form>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Col: Adaptive Paths (7 cols) */}
        <div className="lg:col-span-7 h-full">
          <Card className="bg-card/40 backdrop-blur border-border/50 h-full flex flex-col">
            <CardHeader className="py-4 px-5 border-b border-border/50 shrink-0 bg-background/20 flex flex-row items-center justify-between">
              <CardTitle className="font-mono text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <GitFork className="w-4 h-4 text-cyan-400" />
                Adaptive Paths
              </CardTitle>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground">
                  <span className="w-2 h-2 rounded-full bg-primary/50" /> Reinforced
                </div>
                <div className="flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground ml-2">
                  <span className="w-2 h-2 rounded-full bg-destructive/50" /> Deprecated
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-5 flex-1 overflow-y-auto space-y-4 custom-scrollbar">
              {pathsLoading ? (
                Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 w-full bg-card/60" />)
              ) : paths?.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center">
                  <div className="relative">
                    <Brain className="w-16 h-16 text-muted-foreground/20 mb-4 animate-pulse relative z-10" />
                    <div className="absolute inset-0 bg-primary/5 blur-xl rounded-full" />
                  </div>
                  <p className="text-muted-foreground font-mono text-sm tracking-wider uppercase">System is analyzing signals</p>
                  <p className="text-muted-foreground/40 font-mono text-xs mt-2">Paths will emerge organically.</p>
                </div>
              ) : (
                paths?.map((path, i) => (
                  <motion.div 
                    key={path.id} 
                    initial={{ opacity: 0, y: 20 }} 
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
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
                      {path.nodes.map((node, i) => (
                        <div key={i} className="flex items-center text-[10px] font-mono text-foreground/90">
                          <span className="px-2 py-1 rounded bg-background border border-border/50">{node}</span>
                          {i < path.nodes.length - 1 && <span className="mx-1.5 text-muted-foreground/30">→</span>}
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
