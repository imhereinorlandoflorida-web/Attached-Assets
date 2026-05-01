import { Link, useLocation } from "wouter";
import { Activity, LayoutDashboard, Database, Plus, CircleDot, Crosshair } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/sessions", label: "Sessions", icon: Database },
  { href: "/codex", label: "Codex 96", icon: CircleDot },
  { href: "/nexus", label: "Nexus Oracle", icon: Crosshair },
];

export function Sidebar() {
  const [location] = useLocation();

  return (
    <div className="w-64 border-r border-border bg-card/40 backdrop-blur-xl flex flex-col h-full z-20">
      <div className="p-6 flex items-center gap-4 border-b border-border/50">
        <div className="relative flex items-center justify-center w-10 h-10 rounded bg-primary/10 border border-primary/30">
          <Activity className="w-5 h-5 text-primary" />
          <div className="absolute inset-0 rounded bg-primary/20 animate-pulse" />
        </div>
        <div>
          <h1 className="font-mono font-bold tracking-tight text-foreground uppercase text-base">Sentinel</h1>
          <div className="text-[10px] uppercase font-mono text-primary tracking-widest mt-0.5 opacity-80">Sys.Active</div>
        </div>
      </div>

      <div className="flex-1 py-8 px-4 space-y-8 overflow-y-auto">
        <div>
          <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-4 px-2">Core Routines</div>
          <nav className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
              return (
                <Link key={item.href} href={item.href} className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-200 group relative font-mono",
                  isActive 
                    ? "text-primary bg-primary/10" 
                    : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                )}>
                  {isActive && (
                    <div className="absolute left-0 w-1 h-1/2 bg-primary rounded-r-md top-1/2 -translate-y-1/2 shadow-[0_0_8px_hsl(var(--primary))]" />
                  )}
                  <item.icon className={cn("w-4 h-4", isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div>
          <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-4 px-2">Operations</div>
          <Link href="/sessions/new" className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all duration-200 group font-mono">
            <Plus className="w-4 h-4 text-muted-foreground group-hover:text-foreground" />
            Initialize Session
          </Link>
        </div>
      </div>
      
      <div className="p-5 border-t border-border/50 text-[10px] font-mono text-muted-foreground/60 bg-background/30">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_5px_hsl(var(--primary))] animate-pulse" />
          Neural Link: Secure
        </div>
        <div className="opacity-50">v0.9.4.build.8821</div>
      </div>
    </div>
  );
}
