"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { listApps, createApp, deleteApp } from "@/lib/api";
import type { AppInfo } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Trash2, Settings, Play, Zap } from "lucide-react";

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

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <Zap className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold">AppForge</h1>
          </div>
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="mr-1.5 h-4 w-4" />
            New App
          </Button>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-12 text-center">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Config-Driven App Generator
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-gray-600">
          Define your app with JSON. Get dynamic UI, APIs, and database -- instantly.
          No hardcoding. Fully extensible.
        </p>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-16">
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-40 rounded-lg" />
            ))}
          </div>
        ) : error ? (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-red-600">{error}</p>
              <Button className="mt-4" variant="outline" onClick={fetchApps}>
                Retry
              </Button>
            </CardContent>
          </Card>
        ) : apps.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-lg font-medium text-gray-700">No apps yet</p>
              <p className="mt-1 text-gray-500">Create your first app to get started.</p>
              <Button className="mt-4" onClick={() => setShowCreate(true)}>
                <Plus className="mr-1.5 h-4 w-4" />
                Create App
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {apps.map((app) => (
              <Card key={app.id} className="group relative">
                <CardHeader>
                  <CardTitle className="text-lg">{app.name}</CardTitle>
                  <p className="text-xs text-gray-500">
                    Created {new Date(app.createdAt).toLocaleDateString()}
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    <Link href={`/app/${app.id}`} className="flex-1">
                      <Button className="w-full" size="sm">
                        <Play className="mr-1.5 h-3.5 w-3.5" />
                        Open App
                      </Button>
                    </Link>
                    <Link href={`/app/${app.id}/config`}>
                      <Button variant="outline" size="sm">
                        <Settings className="h-3.5 w-3.5" />
                      </Button>
                    </Link>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-500 hover:text-red-700"
                      onClick={() => handleDelete(app)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New App</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="App name (e.g., Inventory Manager)"
              value={newAppName}
              onChange={(e) => setNewAppName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            />
            <Button
              className="w-full"
              onClick={handleCreate}
              disabled={creating || !newAppName.trim()}
            >
              {creating ? "Creating..." : "Create App"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
