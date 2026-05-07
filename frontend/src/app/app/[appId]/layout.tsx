"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getApp } from "@/lib/api";
import type { AppInfo } from "@/lib/types";
import { AuthProvider } from "@/components/auth/AuthContext";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  LayoutDashboard,
  Table,
  FormInput,
  Settings,
  ArrowLeft,
  Menu,
  X,
} from "lucide-react";

const iconMap: Record<string, React.ElementType> = {
  table: Table,
  form: FormInput,
  dashboard: LayoutDashboard,
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const router = useRouter();
  const appId = params.appId as string;

  const [app, setApp] = useState<AppInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activePage, setActivePage] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const fetchApp = async () => {
      try {
        const data = await getApp(appId);
        setApp(data);
      } catch (err: any) {
        setError(err.response?.status === 404 ? "App not found" : "Failed to load app");
      } finally {
        setLoading(false);
      }
    };
    fetchApp();
  }, [appId]);

  if (loading) {
    return (
      <div className="flex min-h-screen">
        <div className="w-56 border-r bg-white p-4">
          <Skeleton className="mb-4 h-8 w-full" />
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="mb-2 h-8 w-full" />
          ))}
        </div>
        <div className="flex-1 p-6">
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (error || !app) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-medium text-red-600">{error || "App not found"}</p>
          <Button className="mt-4" variant="outline" onClick={() => router.push("/")}>
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  const pages = app.config.pages || [];

  return (
    <AuthProvider>
      <div className="flex min-h-screen bg-gray-50">
        {/* Mobile menu toggle */}
        <button
          className="fixed left-4 top-4 z-50 rounded-md bg-white p-2 shadow-md md:hidden"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>

        {/* Sidebar */}
        <aside
          className={`fixed inset-y-0 left-0 z-40 w-56 transform border-r bg-white transition-transform md:relative md:translate-x-0 ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex h-full flex-col">
            <div className="border-b p-4">
              <Link href="/" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700">
                <ArrowLeft className="h-3.5 w-3.5" />
                Back
              </Link>
              <h2 className="mt-2 truncate text-lg font-semibold">
                {app.config.appName || app.name}
              </h2>
            </div>

            <nav className="flex-1 space-y-1 p-3">
              {pages.map((page, idx) => {
                const Icon = iconMap[page.type] || LayoutDashboard;
                return (
                  <button
                    key={idx}
                    onClick={() => {
                      setActivePage(idx);
                      setSidebarOpen(false);
                    }}
                    className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${
                      activePage === idx
                        ? "bg-primary text-primary-foreground"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {page.name}
                  </button>
                );
              })}
            </nav>

            <div className="border-t p-3">
              <Link href={`/config/${appId}`}>
                <Button variant="outline" size="sm" className="w-full">
                  <Settings className="mr-1.5 h-3.5 w-3.5" />
                  Edit Config
                </Button>
              </Link>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-4 md:p-6">
          {pages.length === 0 ? (
            <div className="rounded-lg border bg-white p-12 text-center">
              <p className="text-lg font-medium text-gray-700">No pages defined</p>
              <p className="mt-1 text-gray-500">
                Add pages to your config to see them here.
              </p>
              <Link href={`/config/${appId}`}>
                <Button className="mt-4" variant="outline">
                  <Settings className="mr-1.5 h-4 w-4" />
                  Edit Config
                </Button>
              </Link>
            </div>
          ) : (
            <PageRenderer appId={appId} app={app} pageIndex={activePage} />
          )}
        </main>
      </div>
    </AuthProvider>
  );
}

function PageRenderer({
  appId,
  app,
  pageIndex,
}: {
  appId: string;
  app: AppInfo;
  pageIndex: number;
}) {
  // Lazy import to avoid SSR issues with component registry
  const [Component, setComponent] = useState<React.ComponentType<any> | null>(null);
  const page = app.config.pages[pageIndex];

  useEffect(() => {
    // Dynamic import of registry to keep it client-only
    import("@/components/runtime/registry").then(({ getComponent }) => {
      setComponent(() => getComponent(page?.type || "unknown"));
    });
  }, [page?.type]);

  if (!page) return <div className="text-gray-500">Page not found</div>;
  if (!Component) return <Skeleton className="h-96 w-full" />;

  return <Component page={page} config={app.config} appId={appId} />;
}
