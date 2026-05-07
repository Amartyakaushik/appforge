import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { parseConfig } from "../lib/config-parser";

export const statsRouter = Router();

// GET /api/apps/:id/stats/:entityName - Get stats for an entity
statsRouter.get("/:id/stats/:entityName", async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const entityName = req.params.entityName as string;

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

    // Get all records for this entity
    const records = await prisma.entityData.findMany({
      where: { appId: id, entityName },
    });

    const count = records.length;

    // Parse operations from query: ?operations=count,avg:price,sum:price
    const operationsStr = (req.query.operations as string) || "count";
    const operations = operationsStr.split(",");

    const stats: Record<string, number | null> = {};

    for (const op of operations) {
      if (op === "count") {
        stats.count = count;
        continue;
      }

      const [operation, field] = op.split(":");
      if (!field) {
        stats[op] = count; // fallback to count
        continue;
      }

      // Extract numeric values for the field
      const values = records
        .map((r) => {
          const val = (r.data as Record<string, unknown>)[field];
          return typeof val === "number" ? val : parseFloat(String(val));
        })
        .filter((v) => !isNaN(v));

      if (values.length === 0) {
        stats[`${operation}_${field}`] = null;
        continue;
      }

      switch (operation) {
        case "avg":
          stats[`avg_${field}`] = Math.round(
            (values.reduce((a, b) => a + b, 0) / values.length) * 100
          ) / 100;
          break;
        case "sum":
          stats[`sum_${field}`] = values.reduce((a, b) => a + b, 0);
          break;
        case "min":
          stats[`min_${field}`] = Math.min(...values);
          break;
        case "max":
          stats[`max_${field}`] = Math.max(...values);
          break;
        default:
          stats[op] = null;
      }
    }

    // Always include count
    if (!stats.count) stats.count = count;

    res.json(stats);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to get stats", message: err.message });
  }
});
