import axios from "axios";
import type {
  AppInfo,
  EntityRecord,
  PaginatedResponse,
} from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

const api = axios.create({
  baseURL: `${API_URL}/api`,
  timeout: 30000, // 30s timeout for Render cold starts
});

// Attach auth token to every request if available
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("auth_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// --- App APIs ---

export async function createApp(name: string, config: object): Promise<AppInfo> {
  const { data } = await api.post("/apps", { name, config });
  return data;
}

export async function listApps(): Promise<AppInfo[]> {
  const { data } = await api.get("/apps");
  return data;
}

export async function getApp(appId: string): Promise<AppInfo> {
  const { data } = await api.get(`/apps/${appId}`);
  return data;
}

export async function updateApp(
  appId: string,
  updates: { name?: string; config?: object }
): Promise<AppInfo> {
  const { data } = await api.put(`/apps/${appId}`, updates);
  return data;
}

export async function deleteApp(appId: string): Promise<void> {
  await api.delete(`/apps/${appId}`);
}

// --- Entity APIs ---

export async function listEntities(
  appId: string,
  entityName: string,
  params?: { page?: number; limit?: number; sort?: string; order?: string }
): Promise<PaginatedResponse<EntityRecord>> {
  const { data } = await api.get(`/apps/${appId}/entities/${entityName}`, {
    params,
  });
  return data;
}

export async function createEntity(
  appId: string,
  entityName: string,
  entityData: Record<string, unknown>
): Promise<EntityRecord & { event: string; entity: string }> {
  const { data } = await api.post(`/apps/${appId}/entities/${entityName}`, {
    data: entityData,
  });
  return data;
}

export async function updateEntity(
  appId: string,
  entityName: string,
  entityId: string,
  entityData: Record<string, unknown>
): Promise<EntityRecord & { event: string; entity: string }> {
  const { data } = await api.put(
    `/apps/${appId}/entities/${entityName}/${entityId}`,
    { data: entityData }
  );
  return data;
}

export async function deleteEntity(
  appId: string,
  entityName: string,
  entityId: string
): Promise<{ success: boolean; event: string; entity: string }> {
  const { data } = await api.delete(
    `/apps/${appId}/entities/${entityName}/${entityId}`
  );
  return data;
}

// --- Stats API ---

export async function getStats(
  appId: string,
  entityName: string,
  operations: string
): Promise<Record<string, number | null>> {
  const { data } = await api.get(`/apps/${appId}/stats/${entityName}`, {
    params: { operations },
  });
  return data;
}

// --- CSV Import API ---

export async function importCsv(
  appId: string,
  entityName: string,
  rows: Record<string, unknown>[]
): Promise<{ imported: number; failed: number; total: number; errors: { row: number; message: string }[] }> {
  const { data } = await api.post(`/apps/${appId}/import-csv`, {
    entityName,
    rows,
  });
  return data;
}

// --- Auth APIs ---

export async function registerUser(
  appId: string,
  body: Record<string, string>
): Promise<{ token: string; user: { id: string; email: string; profile: Record<string, unknown> } }> {
  const { data } = await api.post(`/apps/${appId}/auth/register`, body);
  return data;
}

export async function loginUser(
  appId: string,
  body: { email: string; password: string }
): Promise<{ token: string; user: { id: string; email: string; profile: Record<string, unknown> } }> {
  const { data } = await api.post(`/apps/${appId}/auth/login`, body);
  return data;
}
