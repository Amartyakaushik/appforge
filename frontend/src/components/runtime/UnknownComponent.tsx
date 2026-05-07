"use client";

import type { RendererProps } from "./registry";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";

export function UnknownComponent({ page }: RendererProps) {
  return (
    <Card className="border-dashed border-yellow-400 bg-yellow-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-yellow-700">
          <AlertTriangle className="h-5 w-5" />
          Unknown Component
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-yellow-600">
          Component type <code className="rounded bg-yellow-100 px-2 py-0.5 font-mono text-sm">&quot;{page.type}&quot;</code> is not supported yet.
        </p>
        <p className="mt-2 text-sm text-yellow-500">
          To add support, create a renderer component and register it in <code>registry.ts</code>.
        </p>
      </CardContent>
    </Card>
  );
}
