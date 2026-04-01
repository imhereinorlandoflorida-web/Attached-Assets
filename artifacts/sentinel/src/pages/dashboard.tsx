import { useGetDashboardSummary, useGetRecentActivity, useGetSignalWeights, getGetDashboardSummaryQueryKey, getGetRecentActivityQueryKey, getGetSignalWeightsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity, ActivityIcon, BrainCircuit, Database, GitMerge, Cpu } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell } from "recharts";
import { format } from "date-fns";
import { motion } from "framer-motion";

export default function Dashboard() {
  const { data: summary, isLoading: loadingSummary } = useGetDashboardSummary({ query: { queryKey: getGetDashboardSummaryQueryKey() } });
  const { data: activity, isLoading: loadingActivity } = useGetRecentActivity({ query: { queryKey: getGetRecentActivityQueryKey() } });
  const { data: weights, isLoading: loadingWeights } = useGetSignalWeights({ query: { queryKey: getGetSignalWeightsQueryKey() } });

  const stats = [
    { label: "Total Sessions", value: summary?.totalSessions ?? 0, icon: Database, color: "text-blue-400" },
    { label: "Active Sessions", value: summary?.activeSessions ?? 0, icon: ActivityIcon, color: "text-primary" },
    { label: "Total Signals", value: summary?.totalSignals ?? 0, icon: BrainCircuit, color: "text-violet-400" },
    { label: "Total Paths", value: summary?.totalPaths ?? 0, icon: GitMerge, color: "text-cyan-400" },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold font-mono uppercase tracking-tight flex items-center gap-3">
          <Cpu className="w-8 h-8 text-primary" />
          Mission Control
        </h1>
        <p className="text-muted-foreground font-mono text-sm">System intelligence overview and real-time metrics.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {loadingSummary ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 bg-card/50" />)
        ) : (
          stats.map((stat, i) => (
            <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
              <Card className="bg-card/40 backdrop-blur border-border/50 relative overflow-hidden group hover:border-primary/30 transition-colors h-full">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                <CardContent className="p-6">
                  <div className="flex justify-between items-start">
                    <div className="space-y-2">
                      <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">{stat.label}</p>
                      <p className="text-4xl font-light font-mono text-foreground">{stat.value}</p>
                    </div>
                    <div className={`p-2.5 rounded bg-background/50 border border-border/50 ${stat.color} shadow-inner`}>
                      <stat.icon className="w-5 h-5" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card className="col-span-1 xl:col-span-2 bg-card/40 backdrop-blur border-border/50">
          <CardHeader className="border-b border-border/50 pb-4">
            <CardTitle className="font-mono text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              Signal Weight Distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {loadingWeights ? (
              <Skeleton className="h-[300px] w-full bg-card/50" />
            ) : (
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weights ?? []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="category" stroke="hsl(var(--muted-foreground))" fontSize={10} fontFamily="monospace" tickLine={false} axisLine={false} tickFormatter={(val) => val.toUpperCase()} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} fontFamily="monospace" tickLine={false} axisLine={false} />
                    <RechartsTooltip 
                      cursor={{ fill: 'hsl(var(--muted)/0.3)' }}
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '4px', fontFamily: 'monospace', fontSize: '12px' }}
                      itemStyle={{ color: 'hsl(var(--primary))' }}
                    />
                    <Bar dataKey="avgWeight" radius={[4, 4, 0, 0]} maxBarSize={60}>
                      {weights?.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={index % 2 === 0 ? "hsl(var(--primary))" : "hsl(var(--secondary))"} fillOpacity={0.8} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-1 bg-card/40 backdrop-blur border-border/50 flex flex-col">
          <CardHeader className="border-b border-border/50 pb-4">
            <CardTitle className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-auto p-0">
            {loadingActivity ? (
              <div className="p-4 space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full bg-card/50" />
                ))}
              </div>
            ) : (
              <div className="divide-y divide-border/30">
                {activity?.map((item, i) => (
                  <motion.div 
                    initial={{ opacity: 0, x: 10 }} 
                    animate={{ opacity: 1, x: 0 }} 
                    transition={{ delay: i * 0.05 }}
                    key={item.id} 
                    className="p-4 flex gap-3 text-sm group hover:bg-background/40 transition-colors"
                  >
                    <div className="mt-1">
                      <div className={`w-2 h-2 rounded-full ${
                        item.type === 'signal' ? 'bg-primary shadow-[0_0_8px_hsl(var(--primary))]' :
                        item.type === 'path' ? 'bg-cyan-400' :
                        item.type === 'feedback' ? 'bg-violet-500' : 'bg-muted-foreground'
                      }`} />
                    </div>
                    <div className="flex-1">
                      <p className="text-foreground text-sm leading-snug">{item.description}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-[10px] font-mono text-muted-foreground uppercase">{item.sessionName}</span>
                        <span className="text-[10px] text-muted-foreground/30">•</span>
                        <span className="text-[10px] font-mono text-muted-foreground/60">{format(new Date(item.createdAt), 'HH:mm:ss')}</span>
                      </div>
                    </div>
                  </motion.div>
                ))}
                {activity?.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground font-mono text-sm">
                    No recent activity.
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
