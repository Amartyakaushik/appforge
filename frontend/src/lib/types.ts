export interface FieldDef {
  type: string;
  required?: boolean;
  label?: string;
  default?: unknown;
  enum?: string[];
  min?: number;
  max?: number;
}

export interface EntityDef {
  fields: Record<string, FieldDef>;
}

export interface AuthField {
  name: string;
  type: string;
  required?: boolean;
  enum?: string[];
  default?: unknown;
}

export interface AuthConfig {
  enabled: boolean;
  fields: AuthField[];
  methods: string[];
}

export interface Widget {
  type: string;
  label: string;
  entity: string;
  field?: string;
  operation: "count" | "avg" | "sum" | "min" | "max";
}

export interface PageConfig {
  name: string;
  type: string;
  entity?: string;
  columns?: string[];
  actions?: string[];
  widgets?: Widget[];
}

export interface NotificationConfig {
  onCreate: string;
  onUpdate: string;
  onDelete: string;
}

export interface AppConfig {
  appName: string;
  auth: AuthConfig;
  entities: Record<string, EntityDef>;
  pages: PageConfig[];
  notifications: NotificationConfig;
}

export interface AppInfo {
  id: string;
  name: string;
  config: AppConfig;
  createdAt: string;
  updatedAt: string;
}

export interface EntityRecord {
  id: string;
  appId: string;
  entityName: string;
  data: Record<string, unknown>;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  totalPages: number;
}

export interface AuthUser {
  id: string;
  email: string;
  profile: Record<string, unknown>;
}
