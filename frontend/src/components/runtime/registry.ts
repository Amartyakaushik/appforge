import type { ComponentType } from "react";
import type { PageConfig, AppConfig } from "@/lib/types";
import { TableRenderer } from "./TableRenderer";
import { FormRenderer } from "./FormRenderer";
import { DashboardRenderer } from "./DashboardRenderer";
import { UnknownComponent } from "./UnknownComponent";

export interface RendererProps {
  page: PageConfig;
  config: AppConfig;
  appId: string;
}

const componentRegistry: Record<string, ComponentType<RendererProps>> = {
  table: TableRenderer,
  form: FormRenderer,
  dashboard: DashboardRenderer,
};

export function getComponent(type: string): ComponentType<RendererProps> {
  return componentRegistry[type] || UnknownComponent;
}
