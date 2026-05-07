import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { parseConfig } from "../lib/config-parser";
import { validateEntityData } from "../lib/schema-builder";
import { optionalAuth } from "../middleware/auth";

export const csvRouter = Router();

// POST /api/apps/:id/import-csv - Import CSV data (rows sent as JSON from client)
csvRouter.post(
  "/:id/import-csv",
  optionalAuth,
  async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;
      const { entityName, rows } = req.body;

      if (!entityName || !Array.isArray(rows)) {
        res.status(400).json({
          error: "Invalid input. Requires: { entityName: string, rows: object[] }",
        });
        return;
      }

      if (rows.length === 0) {
        res.status(400).json({ error: "No rows to import" });
        return;
      }

      if (rows.length > 1000) {
        res.status(400).json({
          error: `Too many rows (${rows.length}). Maximum is 1000.`,
        });
        return;
      }

      const app = await prisma.app.findUnique({ where: { id } });
      if (!app) {
        res.status(404).json({ error: "App not found" });
        return;
      }

      const config = parseConfig(app.config);
      const entity = config.entities[entityName];
      if (!entity) {
        res.status(404).json({ error: `Entity '${entityName}' not found in config` });
        return;
      }

      const imported: any[] = [];
      const errors: { row: number; message: string }[] = [];

      for (let i = 0; i < rows.length; i++) {
        const validation = validateEntityData(entity.fields, rows[i]);
        if (validation.success) {
          imported.push({
            appId: id,
            entityName,
            data: validation.data,
            createdBy: (req as any).userId || null,
          });
        } else {
          errors.push({
            row: i + 1,
            message: validation.errors?.join(", ") || "Validation failed",
          });
        }
      }

      // Bulk insert valid rows
      if (imported.length > 0) {
        await prisma.entityData.createMany({ data: imported });
      }

      res.json({
        imported: imported.length,
        failed: errors.length,
        total: rows.length,
        errors: errors.slice(0, 20), // Limit error details to first 20
      });
    } catch (err: any) {
      res.status(500).json({ error: "CSV import failed", message: err.message });
    }
  }
);
