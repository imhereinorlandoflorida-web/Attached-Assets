import { ReactNode } from "react";
import { Sidebar } from "./Sidebar";

export function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-[100dvh] bg-background text-foreground overflow-hidden font-sans selection:bg-primary/30">
      <Sidebar />
      <main className="flex-1 overflow-y-auto relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-primary/5 blur-[150px] pointer-events-none rounded-full" />
        <div className="relative z-10 p-6 md:p-10 min-h-full">
          {children}
        </div>
      </main>
    </div>
  );
}
