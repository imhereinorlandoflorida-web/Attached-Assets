import { useListSessions, getListSessionsQueryKey } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Database, Search, ArrowRight, Play, Pause, CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { motion } from "framer-motion";

export default function SessionsList() {
  const { data: sessions, isLoading } = useListSessions({ query: { queryKey: getListSessionsQueryKey() } });
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  const filteredSessions = sessions?.filter(s => {
    if (filter !== "all" && s.status !== filter) return false;
    if (search && !s.name.toLowerCase().includes(search.toLowerCase()) && !s.description?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold font-mono uppercase tracking-tight flex items-center gap-3">
            <Database className="w-8 h-8 text-primary" />
            Sessions
          </h1>
          <p className="text-muted-foreground font-mono text-sm">Manage neural adaptation sessions.</p>
        </div>
        <Link href="/sessions/new" className="px-4 py-2.5 bg-primary/10 text-primary border border-primary/30 font-mono text-sm font-medium uppercase tracking-wider rounded-md hover:bg-primary hover:text-primary-foreground transition-all duration-300 flex items-center justify-center gap-2">
          Initialize Session <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Search sessions..." 
            className="pl-9 bg-card/40 border-border/50 font-mono text-sm focus-visible:ring-primary/50 w-full"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex bg-card/40 border border-border/50 rounded-md p-1 font-mono text-xs uppercase tracking-wider w-full sm:w-auto">
          {["all", "active", "paused", "completed"].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`flex-1 sm:flex-none px-4 py-1.5 rounded transition-all ${filter === status ? "bg-primary/20 text-primary font-bold shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]" : "text-muted-foreground hover:text-foreground hover:bg-white/5"}`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-48 bg-card/40 rounded-lg" />)
        ) : (
          filteredSessions?.map((session, i) => (
            <motion.div key={session.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Link href={`/sessions/${session.id}`}>
                <Card className="bg-card/40 backdrop-blur border-border/50 hover:border-primary/50 transition-all cursor-pointer h-full group relative overflow-hidden flex flex-col">
                  <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-primary to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <CardContent className="p-5 flex flex-col h-full flex-1">
                    <div className="flex justify-between items-start mb-3 gap-2">
                      <h3 className="font-mono font-bold text-lg text-foreground group-hover:text-primary transition-colors line-clamp-1">{session.name}</h3>
                      <Badge variant="outline" className={`shrink-0 font-mono text-[10px] uppercase border ${
                        session.status === 'active' ? 'text-primary border-primary/50 bg-primary/10' :
                        session.status === 'completed' ? 'text-cyan-400 border-cyan-400/50 bg-cyan-400/10' :
                        'text-muted-foreground border-muted-foreground/30 bg-background/50'
                      }`}>
                        {session.status === 'active' && <Play className="w-2.5 h-2.5 mr-1 inline" />}
                        {session.status === 'completed' && <CheckCircle2 className="w-2.5 h-2.5 mr-1 inline" />}
                        {session.status === 'paused' && <Pause className="w-2.5 h-2.5 mr-1 inline" />}
                        {session.status}
                      </Badge>
                    </div>
                    
                    <p className="text-sm text-muted-foreground mb-6 line-clamp-2 flex-1 font-sans">
                      {session.description || "No context provided."}
                    </p>
                    
                    <div className="grid grid-cols-3 gap-2 border-t border-border/50 pt-4 mt-auto">
                      <div>
                        <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-1">Signals</div>
                        <div className="font-mono text-foreground text-sm">{session.signalCount}</div>
                      </div>
                      <div>
                        <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-1">Paths</div>
                        <div className="font-mono text-foreground text-sm">{session.pathCount}</div>
                      </div>
                      <div>
                        <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-1">Score</div>
                        <div className="font-mono text-primary font-bold text-sm">
                          {(session.adaptationScore * 100).toFixed(0)}%
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          ))
        )}
        
        {!isLoading && filteredSessions?.length === 0 && (
          <div className="col-span-full py-16 flex flex-col items-center justify-center border border-dashed border-border/50 rounded-lg bg-card/20 backdrop-blur">
            <Database className="w-12 h-12 text-muted-foreground/20 mb-4" />
            <h3 className="font-mono text-lg text-muted-foreground">No sessions found</h3>
            <p className="text-sm text-muted-foreground/50 mb-6 font-mono">Adjust filters or initialize a new session.</p>
            <Link href="/sessions/new" className="px-6 py-2 border border-primary/40 text-primary hover:bg-primary hover:text-primary-foreground font-mono text-sm uppercase tracking-wider rounded transition-all">
              Initialize Session
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
