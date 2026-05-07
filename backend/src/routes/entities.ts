import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { parseConfig } from "../lib/config-parser";
import { validateEntityData } from "../lib/schema-builder";
import { optionalAuth } from "../middleware/auth";

export const entitiesRouter = Router();

// Helper: get app config and validate entity exists
async function getAppAndEntity(appId: string, entityName: string): Promise<
  | { error: string; status: number }
  | { app: any; config: any; entity: any }
> {
  const app = await prisma.app.findUnique({ where: { id: appId } });
  if (!app) return { error: "App not found", status: 404 };

  const config = parseConfig(app.config);
  const entity = config.entities[entityName];
  if (!entity) return { error: `Entity '${entityName}' not found in config`, status: 404 };

  return { app, config, entity };
}

// GET /api/apps/:id/entities/:entityName - List entity data
entitiesRouter.get(
  "/:id/entities/:entityName",
  optionalAuth,
  async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;
      const entityName = req.params.entityName as string;
      const result = await getAppAndEntity(id, entityName);
      if ("error" in result) {
        res.status(result.status).json({ error: result.error });
        return;
      }

      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
      const sort = (req.query.sort as string) || "createdAt";
      const order = (req.query.order as string) === "desc" ? "desc" : "asc";
      const skip = (page - 1) * limit;

      // Build where clause
      const where: any = { appId: id, entityName };

      // User-scoped data when auth is enabled
      if (result.config.auth.enabled && (req as any).userId) {
        where.createdBy = (req as any).userId;
      }

      // Apply filters from query params (filter[field]=value)
      const filters: Record<string, string> = {};
      for (const [key, value] of Object.entries(req.query)) {
        const match = key.match(/^filter\[(.+)\]$/);
        if (match && typeof value === "string") {
          filters[match[1]] = value;
        }
      }

      const [data, total] = await Promise.all([
        prisma.entityData.findMany({
          where,
          skip,
          take: limit,
          orderBy: sort === "createdAt" ? { createdAt: order } : { createdAt: order },
        }),
        prisma.entityData.count({ where }),
      ]);

      // Apply JSONB filters in-memory (Prisma doesn't support JSONB filtering well)
      let filtered = data;
      if (Object.keys(filters).length > 0) {
        filtered = data.filter((row: any) => {
          const d = row.data as Record<string, unknown>;
          return Object.entries(filters).every(
            ([key, value]) => String(d[key] ?? "").toLowerCase() === value.toLowerCase()
          );
        });
      }

      // Sort by JSONB field if not createdAt
      if (sort !== "createdAt") {
        filtered.sort((a: any, b: any) => {
          const aVal = (a.data as any)[sort];
          const bVal = (b.data as any)[sort];
          if (aVal == null) return 1;
          if (bVal == null) return -1;
          if (typeof aVal === "number" && typeof bVal === "number") {
            return order === "asc" ? aVal - bVal : bVal - aVal;
          }
          return order === "asc"
            ? String(aVal).localeCompare(String(bVal))
            : String(bVal).localeCompare(String(aVal));
        });
      }

      res.json({
        data: filtered,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to list entities", message: err.message });
    }
  }
);

// POST /api/apps/:id/entities/:entityName - Create entity record
entitiesRouter.post(
  "/:id/entities/:entityName",
  optionalAuth,
  async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;
      const entityName = req.params.entityName as string;
      const result = await getAppAndEntity(id, entityName);
      if ("error" in result) {
        res.status(result.status).json({ error: result.error });
        return;
      }

      // Validate data against entity fields
      const validation = validateEntityData(result.entity.fields, req.body.data);
      if (!validation.success) {
        res.status(400).json({ error: "Validation failed", details: validation.errors });
        return;
      }

      const record = await prisma.entityData.create({
        data: {
          appId: id,
          entityName,
          data: validation.data as any,
          createdBy: (req as any).userId || null,
        },
      });

      res.status(201).json({
        ...record,
        event: "onCreate",
        entity: entityName,
      });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to create record", message: err.message });
    }
  }
);

// PUT /api/apps/:id/entities/:entityName/:entityId - Update record
entitiesRouter.put(
  "/:id/entities/:entityName/:entityId",
  optionalAuth,
  async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;
      const entityName = req.params.entityName as string;
      const entityId = req.params.entityId as string;
      const result = await getAppAndEntity(id, entityName);
      if ("error" in result) {
        res.status(result.status).json({ error: result.error });
        return;
      }

      const existing = await prisma.entityData.findFirst({
        where: { id: entityId, appId: id, entityName },
      });
      if (!existing) {
        res.status(404).json({ error: "Record not found" });
        return;
      }

      // Validate partial data
      const validation = validateEntityData(result.entity.fields, req.body.data, true);
      if (!validation.success) {
        res.status(400).json({ error: "Validation failed", details: validation.errors });
        return;
      }

      // Merge with existing data
      const mergedData = { ...(existing.data as any), ...validation.data };

      const updated = await prisma.entityData.update({
        where: { id: entityId },
        data: { data: mergedData },
      });

      res.json({
        ...updated,
        event: "onUpdate",
        entity: entityName,
      });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to update record", message: err.message });
    }
  }
);

// DELETE /api/apps/:id/entities/:entityName/:entityId - Delete record
entitiesRouter.delete(
  "/:id/entities/:entityName/:entityId",
  optionalAuth,
  async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;
      const entityName = req.params.entityName as string;
      const entityId = req.params.entityId as string;

      const existing = await prisma.entityData.findFirst({
        where: { id: entityId, appId: id, entityName },
      });
      if (!existing) {
        res.status(404).json({ error: "Record not found" });
        return;
      }

      await prisma.entityData.delete({ where: { id: entityId } });

      res.json({
        success: true,
        event: "onDelete",
        entity: entityName,
      });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to delete record", message: err.message });
    }
  }
);
