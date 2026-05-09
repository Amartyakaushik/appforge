"use client";

import { useEffect, useState } from "react";
import type { RendererProps } from "./registry";
import { getStats } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { BarChart3, TrendingUp, Hash, ArrowUp, ArrowDown, Activity } from "lucide-react";

const iconMap: Record<string, React.ElementType> = {
  count: Hash,
  avg: TrendingUp,
  sum: BarChart3,
  min: ArrowDown,
  max: ArrowUp,
};

const colorMap = [
  "from-blue-500/10 to-blue-500/5 border-blue-200/50",
  "from-emerald-500/10 to-emerald-500/5 border-emerald-200/50",
  "from-violet-500/10 to-violet-500/5 border-violet-200/50",
  "from-amber-500/10 to-amber-500/5 border-amber-200/50",
  "from-rose-500/10 to-rose-500/5 border-rose-200/50",
  "from-cyan-500/10 to-cyan-500/5 border-cyan-200/50",
];

const iconColorMap = [
  "text-blue-600 bg-blue-100",
  "text-emerald-600 bg-emerald-100",
  "text-violet-600 bg-violet-100",
  "text-amber-600 bg-amber-100",
  "text-rose-600 bg-rose-100",
  "text-cyan-600 bg-cyan-100",
];

export function DashboardRenderer({ page, config, appId }: RendererProps) {
  const widgets = page.widgets || [];
  const [stats, setStats] = useState<Record<string, Record<string, number | null>>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAllStats = async () => {
      setLoading(true);
      setError(null);
      try {
        const byEntity: Record<string, string[]> = {};
        for (const w of widgets) {
          if (!byEntity[w.entity]) byEntity[w.entity] = [];
          const op = w.field ? `${w.operation}:${w.field}` : w.operation;
          byEntity[w.entity].push(op);
        }

        const results: Record<string, Record<string, number | null>> = {};
        for (const [entity, ops] of Object.entries(byEntity)) {
          results[entity] = await getStats(appId, entity, ops.join(","));
        }
        setStats(results);
      } catch (err: any) {
        setError(err.response?.data?.error || "Failed to load stats");
      } finally {
        setLoading(false);
      }
    };

    if (widgets.length > 0) fetchAllStats();
    else setLoading(false);
  }, [appId, widgets]);

  if (widgets.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-10 text-center">
          <Activity className="mx-auto h-8 w-8 text-muted-foreground/50 mb-3" />
          <p className="text-muted-foreground">No widgets configured for this dashboard.</p>
        </CardContent>
      </Card>
    );
  }

  const getStatValue = (entity: string, operation: string, field?: string): string => {
    const entityStats = stats[entity];
    if (!entityStats) return "-";
    if (operation === "count") {
      return entityStats.count != null ? entityStats.count.toLocaleString() : "0";
    }
    const key = `${operation}_${field}`;
    const val = entityStats[key];
    return val != null ? val.toLocaleString() : "-";
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">{page.name}</h2>
        <p className="text-sm text-muted-foreground mt-1">Overview of your application metrics</p>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-destructive text-sm">
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {widgets.map((widget, idx) => {
          const Icon = iconMap[widget.operation] || Hash;
          const color = colorMap[idx % colorMap.length];
          const iconColor = iconColorMap[idx % iconColorMap.length];

          return (
            <Card key={idx} className={`bg-gradient-to-br ${color} overflow-hidden transition-all hover:shadow-md`}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {widget.label}
                </CardTitle>
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${iconColor}`}>
                  <Icon className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-9 w-28" />
                ) : (
                  <div className="flex items-baseline gap-2">
                    <p className="text-3xl font-bold tracking-tight">
                      {getStatValue(widget.entity, widget.operation, widget.field)}
                    </p>
                    <Badge variant="secondary" className="text-[10px] font-normal">
                      {widget.entity}
                    </Badge>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
