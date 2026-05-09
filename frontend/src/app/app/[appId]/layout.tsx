"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getApp } from "@/lib/api";
import type { AppInfo } from "@/lib/types";
import { AuthProvider, useAuth } from "@/components/auth/AuthContext";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  TooltipProvider,
} from "@/components/ui/tooltip";
import {
  Sheet,
  SheetContent,
} from "@/components/ui/sheet";
import {
  LayoutDashboard,
  Table,
  FormInput,
  Settings,
  ArrowLeft,
  Menu,
  LogOut,
  User,
  Zap,
  ChevronRight,
} from "lucide-react";

const iconMap: Record<string, React.ElementType> = {
  table: Table,
  form: FormInput,
  dashboard: LayoutDashboard,
};

function SidebarContent({
  app,
  appId,
  activePage,
  setActivePage,
  onClose,
}: {
  app: AppInfo;
  appId: string;
  activePage: number;
  setActivePage: (idx: number) => void;
  onClose?: () => void;
}) {
  const pages = app.config.pages || [];

  return (
    <div className="flex h-full flex-col">
      <div className="p-4 pb-3">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-3"
        >
          <ArrowLeft className="h-3 w-3" />
          All Apps
        </Link>
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <Zap className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold">
              {app.config.appName || app.name}
            </h2>
            <p className="text-xs text-muted-foreground">
              {Object.keys(app.config.entities || {}).length} entities
            </p>
          </div>
        </div>
      </div>

      <Separator />

      <ScrollArea className="flex-1 px-3 py-2">
        <div className="space-y-0.5">
          {pages.map((page, idx) => {
            const Icon = iconMap[page.type] || LayoutDashboard;
            const isActive = activePage === idx;
            return (
              <button
                key={idx}
                onClick={() => {
                  setActivePage(idx);
                  onClose?.();
                }}
                className={`group flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-all ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                }`}
              >
                <Icon className={`h-4 w-4 shrink-0 ${isActive ? "" : "text-muted-foreground/70"}`} />
                <span className="truncate">{page.name}</span>
                {!isActive && (
                  <ChevronRight className="ml-auto h-3.5 w-3.5 opacity-0 group-hover:opacity-50 transition-opacity" />
                )}
              </button>
            );
          })}
        </div>
        {pages.length === 0 && (
          <p className="px-3 py-6 text-center text-xs text-muted-foreground">
            No pages defined
          </p>
        )}
      </ScrollArea>

      <Separator />

      <div className="p-3 space-y-2">
        {app.config.auth?.enabled && <AuthStatus appId={appId} />}
        <Link href={`/config/${appId}`} className="block">
          <Button variant="outline" size="sm" className="w-full justify-start text-xs">
            <Settings className="mr-2 h-3.5 w-3.5" />
            Edit Config
          </Button>
        </Link>
      </div>
    </div>
  );
}

function AuthStatus({ appId }: { appId: string }) {
  const { user, isAuthenticated, logout } = useAuth();

  if (!isAuthenticated) {
    return (
      <Link href={`/app/${appId}/auth/login`} className="block">
        <Button variant="secondary" size="sm" className="w-full justify-start text-xs">
          <User className="mr-2 h-3.5 w-3.5" />
          Login
        </Button>
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-2 rounded-lg bg-accent/50 px-3 py-2">
      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
        {(user?.email || "U")[0].toUpperCase()}
      </div>
      <span className="flex-1 truncate text-xs">{user?.email}</span>
      <button onClick={logout} className="text-muted-foreground hover:text-foreground transition-colors" title="Logout">
        <LogOut className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const router = useRouter();
  const appId = params.appId as string;

  const [app, setApp] = useState<AppInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activePage, setActivePage] = useState(0);
  const [sheetOpen, setSheetOpen] = useState(false);

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
        <div className="hidden md:block w-60 border-r bg-card p-4 space-y-3">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-10 w-full" />
          <Separator />
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </div>
        <div className="flex-1 p-6 space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-[400px] w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (error || !app) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <span className="text-2xl">404</span>
          </div>
          <p className="text-lg font-medium text-destructive">{error || "App not found"}</p>
          <Button variant="outline" onClick={() => router.push("/")}>
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
      <TooltipProvider>
        <div className="flex min-h-screen bg-muted/30">
          {/* Desktop Sidebar */}
          <aside className="hidden md:flex w-60 flex-col border-r bg-card">
            <SidebarContent
              app={app}
              appId={appId}
              activePage={activePage}
              setActivePage={setActivePage}
            />
          </aside>

          {/* Mobile Sheet Sidebar */}
          <div className="md:hidden fixed top-0 left-0 z-50 p-3">
            <Button variant="outline" size="icon" className="h-9 w-9 bg-card shadow-sm" onClick={() => setSheetOpen(true)}>
              <Menu className="h-4 w-4" />
            </Button>
            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
              <SheetContent side="left" className="w-60 p-0">
                <SidebarContent
                  app={app}
                  appId={appId}
                  activePage={activePage}
                  setActivePage={setActivePage}
                  onClose={() => setSheetOpen(false)}
                />
              </SheetContent>
            </Sheet>
          </div>

          {/* Main Content */}
          <main className="flex-1 p-4 pt-14 md:pt-4 md:p-6">
            {pages.length === 0 ? (
              <div className="rounded-xl border border-dashed bg-card p-12 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                  <Zap className="h-7 w-7 text-primary" />
                </div>
                <p className="text-lg font-semibold">No pages could be generated</p>
                {Object.keys(app.config.entities || {}).length === 0 ? (
                  <>
                    <p className="mt-2 text-muted-foreground">
                      Your config has no <code className="rounded bg-muted px-1.5 py-0.5 text-sm font-mono">entities</code> defined.
                    </p>
                    <pre className="mx-auto mt-3 max-w-md rounded-lg bg-muted p-4 text-left text-xs text-muted-foreground overflow-x-auto">
{`"entities": {
  "contacts": {
    "fields": {
      "name": { "type": "string", "required": true },
      "email": { "type": "email" }
    }
  }
}`}
                    </pre>
                  </>
                ) : (
                  <p className="mt-2 text-muted-foreground">
                    Add pages to your config to see them here.
                  </p>
                )}
                <Link href={`/config/${appId}`}>
                  <Button className="mt-5 shadow-sm" variant="outline">
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
      </TooltipProvider>
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
  const [Component, setComponent] = useState<React.ComponentType<any> | null>(null);
  const page = app.config.pages[pageIndex];

  useEffect(() => {
    import("@/components/runtime/registry").then(({ getComponent }) => {
      setComponent(() => getComponent(page?.type || "unknown"));
    });
  }, [page?.type]);

  if (!page) return <div className="text-muted-foreground">Page not found</div>;
  if (!Component) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[400px] w-full rounded-xl" />
      </div>
    );
  }

  return <Component page={page} config={app.config} appId={appId} />;
}
