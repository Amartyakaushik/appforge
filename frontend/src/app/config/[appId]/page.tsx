"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { getApp, updateApp } from "@/lib/api";
import type { AppInfo } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { ArrowLeft, Save, Loader2, Play } from "lucide-react";
import Link from "next/link";

// Monaco doesn't work with SSR
const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => <Skeleton className="h-[600px] w-full" />,
});

export default function ConfigPage() {
  const params = useParams();
  const router = useRouter();
  const appId = params.appId as string;

  const [app, setApp] = useState<AppInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [configText, setConfigText] = useState("");
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const fetchApp = async () => {
      try {
        const data = await getApp(appId);
        setApp(data);
        setConfigText(JSON.stringify(data.config, null, 2));
      } catch {
        toast.error("Failed to load app");
        router.push("/");
      } finally {
        setLoading(false);
      }
    };
    fetchApp();
  }, [appId, router]);

  const handleSave = async () => {
    // Validate JSON
    let parsed;
    try {
      parsed = JSON.parse(configText);
    } catch {
      toast.error("Invalid JSON. Fix errors before saving.");
      return;
    }

    setSaving(true);
    try {
      const updated = await updateApp(appId, { config: parsed });
      setApp(updated);
      setConfigText(JSON.stringify(updated.config, null, 2));
      toast.success("Config saved! Defaults have been applied.");
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to save config");
    } finally {
      setSaving(false);
    }
  };

  const handleEditorValidation = (markers: any[]) => {
    setHasError(markers.some((m: any) => m.severity > 4));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="mt-4 h-[600px] w-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Toolbar */}
      <div className="sticky top-0 z-10 border-b bg-white px-6 py-3">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href={`/app/${appId}`}>
              <Button variant="ghost" size="sm">
                <ArrowLeft className="mr-1.5 h-4 w-4" />
                Back to App
              </Button>
            </Link>
            <h1 className="text-lg font-semibold">
              {app?.name} - Config Editor
            </h1>
          </div>
          <div className="flex gap-2">
            <Link href={`/app/${appId}`}>
              <Button variant="outline" size="sm">
                <Play className="mr-1.5 h-3.5 w-3.5" />
                Preview
              </Button>
            </Link>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={saving || hasError}
            >
              {saving ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="mr-1.5 h-3.5 w-3.5" />
              )}
              Save Config
            </Button>
          </div>
        </div>
      </div>

      {/* Editor */}
      <div className="mx-auto max-w-7xl p-6">
        <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
          <MonacoEditor
            height="70vh"
            language="json"
            value={configText}
            onChange={(value) => setConfigText(value || "")}
            onValidate={handleEditorValidation}
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              wordWrap: "on",
              formatOnPaste: true,
              tabSize: 2,
              scrollBeyondLastLine: false,
            }}
          />
        </div>
        <p className="mt-2 text-xs text-gray-500">
          Edit the JSON config above and click Save. The system will apply defaults for any missing fields.
          Unknown component types will render a fallback instead of crashing.
        </p>
      </div>
    </div>
  );
}
