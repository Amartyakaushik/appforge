"use client";

import { useEffect, useState } from "react";
import type { RendererProps } from "./registry";
import { getStats } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart3, TrendingUp, Hash } from "lucide-react";

const iconMap: Record<string, React.ElementType> = {
  count: Hash,
  avg: TrendingUp,
  sum: BarChart3,
  min: TrendingUp,
  max: TrendingUp,
};

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
        // Group widgets by entity to minimize API calls
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
      <Card>
        <CardContent className="p-6 text-gray-500">
          No widgets configured for this dashboard.
        </CardContent>
      </Card>
    );
  }

  const getStatValue = (entity: string, operation: string, field?: string): string => {
    const entityStats = stats[entity];
    if (!entityStats) return "-";

    if (operation === "count") {
      return entityStats.count != null ? String(entityStats.count) : "0";
    }
    const key = `${operation}_${field}`;
    const val = entityStats[key];
    return val != null ? val.toLocaleString() : "-";
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">{page.name}</h2>
      {error && (
        <div className="rounded-md bg-red-50 p-4 text-red-700">{error}</div>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {widgets.map((widget, idx) => {
          const Icon = iconMap[widget.operation] || Hash;
          return (
            <Card key={idx}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">
                  {widget.label}
                </CardTitle>
                <Icon className="h-4 w-4 text-gray-400" />
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-8 w-24" />
                ) : (
                  <p className="text-2xl font-bold">
                    {getStatValue(widget.entity, widget.operation, widget.field)}
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
