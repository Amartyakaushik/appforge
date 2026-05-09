"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { listApps, createApp, deleteApp } from "@/lib/api";
import type { AppInfo } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  TooltipProvider,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Plus,
  Trash2,
  Settings,
  Play,
  Zap,
  Box,
  Layers,
  Code2,
  RefreshCw,
  Loader2,
} from "lucide-react";

export default function HomePage() {
  const [apps, setApps] = useState<AppInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newAppName, setNewAppName] = useState("");
  const [creating, setCreating] = useState(false);

  const fetchApps = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listApps();
      setApps(data);
    } catch (err: any) {
      setError(
        err.code === "ERR_NETWORK"
          ? "Cannot connect to server. It may be waking up (takes ~30s on free tier). Please retry."
          : err.response?.data?.error || "Failed to load apps"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApps();
  }, []);

  const handleCreate = async () => {
    if (!newAppName.trim()) return;
    setCreating(true);
    try {
      await createApp(newAppName.trim(), {});
      toast.success("App created!");
      setShowCreate(false);
      setNewAppName("");
      fetchApps();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to create app");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (app: AppInfo) => {
    if (!confirm(`Delete "${app.name}"? This cannot be undone.`)) return;
    try {
      await deleteApp(app.id);
      toast.success("App deleted");
      fetchApps();
    } catch (err: any) {
      toast.error("Failed to delete app");
    }
  };

  const getEntityCount = (app: AppInfo) => {
    return Object.keys(app.config?.entities || {}).length;
  };

  const getPageCount = (app: AppInfo) => {
    return (app.config?.pages || []).length;
  };

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
        {/* Header */}
        <header className="sticky top-0 z-50 border-b bg-white/80 backdrop-blur-md">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <Zap className="h-4.5 w-4.5 text-primary-foreground" />
              </div>
              <h1 className="text-xl font-bold tracking-tight">AppForge</h1>
            </div>
            <Button onClick={() => setShowCreate(true)} className="shadow-sm">
              <Plus className="mr-1.5 h-4 w-4" />
              New App
            </Button>
          </div>
        </header>

        {/* Hero */}
        <section className="mx-auto max-w-6xl px-6 pt-16 pb-12 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border bg-white px-4 py-1.5 text-sm text-muted-foreground shadow-sm mb-6">
            <Code2 className="h-3.5 w-3.5" />
            Config-driven architecture
          </div>
          <h2 className="text-4xl font-bold tracking-tight sm:text-5xl bg-gradient-to-br from-gray-900 to-gray-600 bg-clip-text text-transparent">
            Build apps from JSON
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-lg text-muted-foreground">
            Define entities, pages, and auth in a JSON config.
            Get a fully working app with dynamic UI, APIs, and database.
          </p>
          <div className="mt-8 flex items-center justify-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Layers className="h-4 w-4" />
              Dynamic UI
            </div>
            <div className="h-4 w-px bg-gray-200" />
            <div className="flex items-center gap-1.5">
              <Box className="h-4 w-4" />
              Auto CRUD APIs
            </div>
            <div className="h-4 w-px bg-gray-200" />
            <div className="flex items-center gap-1.5">
              <Code2 className="h-4 w-4" />
              Extensible
            </div>
          </div>
        </section>

        {/* App List */}
        <section className="mx-auto max-w-6xl px-6 pb-20">
          <div className="mb-6 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-800">Your Apps</h3>
            <Button variant="ghost" size="icon" onClick={fetchApps} className="h-8 w-8" title="Refresh">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>

          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="overflow-hidden">
                  <CardHeader className="pb-3">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-3 w-20 mt-1" />
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2 mb-3">
                      <Skeleton className="h-5 w-16 rounded-full" />
                      <Skeleton className="h-5 w-16 rounded-full" />
                    </div>
                    <Skeleton className="h-9 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : error ? (
            <Card className="border-destructive/30 bg-destructive/5">
              <CardContent className="p-8 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                  <RefreshCw className="h-5 w-5 text-destructive" />
                </div>
                <p className="text-destructive font-medium">{error}</p>
                <Button className="mt-4" variant="outline" onClick={fetchApps}>
                  <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                  Retry
                </Button>
              </CardContent>
            </Card>
          ) : apps.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="p-14 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                  <Zap className="h-7 w-7 text-primary" />
                </div>
                <p className="text-lg font-semibold text-gray-800">No apps yet</p>
                <p className="mt-1 text-muted-foreground">
                  Create your first config-driven app to get started.
                </p>
                <Button className="mt-5 shadow-sm" onClick={() => setShowCreate(true)}>
                  <Plus className="mr-1.5 h-4 w-4" />
                  Create Your First App
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {apps.map((app) => (
                <Card
                  key={app.id}
                  className="group overflow-hidden transition-all duration-200 hover:shadow-md hover:border-primary/30"
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg group-hover:text-primary transition-colors">
                          {app.config?.appName || app.name}
                        </CardTitle>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(app.createdAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 hover:bg-red-50 transition-all"
                        onClick={() => handleDelete(app)}
                        title="Delete app"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex flex-wrap gap-1.5">
                      <Badge variant="secondary" className="text-xs font-normal">
                        {getEntityCount(app)} {getEntityCount(app) === 1 ? "entity" : "entities"}
                      </Badge>
                      <Badge variant="secondary" className="text-xs font-normal">
                        {getPageCount(app)} {getPageCount(app) === 1 ? "page" : "pages"}
                      </Badge>
                      {app.config?.auth?.enabled && (
                        <Badge variant="outline" className="text-xs font-normal text-green-600 border-green-200 bg-green-50">
                          Auth
                        </Badge>
                      )}
                    </div>
                    <div className="flex gap-2 pt-1">
                      <Link href={`/app/${app.id}`} className="flex-1">
                        <Button className="w-full shadow-sm" size="sm">
                          <Play className="mr-1.5 h-3.5 w-3.5" />
                          Open
                        </Button>
                      </Link>
                      <Link href={`/config/${app.id}`} title="Edit config">
                        <Button variant="outline" size="sm" className="shadow-sm">
                          <Settings className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* Create Dialog */}
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Create New App</DialogTitle>
              <DialogDescription>
                Give your app a name. You can configure entities and pages after creation.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <Input
                placeholder="e.g., Inventory Manager, CRM, Blog..."
                value={newAppName}
                onChange={(e) => setNewAppName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                autoFocus
              />
              <Button
                className="w-full shadow-sm"
                onClick={handleCreate}
                disabled={creating || !newAppName.trim()}
              >
                {creating ? (
                  <>
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Zap className="mr-1.5 h-4 w-4" />
                    Create App
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
