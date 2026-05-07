import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { parseConfig } from "../lib/config-parser";
import { z } from "zod";

export const appsRouter = Router();

const createAppSchema = z.object({
  name: z.string().min(1, "App name is required"),
  config: z.record(z.unknown()).default({}),
});

// POST /api/apps - Create new app
appsRouter.post("/", async (req: Request, res: Response) => {
  try {
    const parsed = createAppSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid input", details: parsed.error.issues });
      return;
    }

    const config = parseConfig(parsed.data.config);

    const app = await prisma.app.create({
      data: {
        name: parsed.data.name,
        config: config as any,
      },
    });

    res.status(201).json(app);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to create app", message: err.message });
  }
});

// GET /api/apps - List all apps
appsRouter.get("/", async (_req: Request, res: Response) => {
  try {
    const apps = await prisma.app.findMany({
      select: { id: true, name: true, createdAt: true, updatedAt: true },
      orderBy: { createdAt: "desc" },
    });
    res.json(apps);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to list apps", message: err.message });
  }
});

// GET /api/apps/:id - Get app with full config
appsRouter.get("/:id", async (req: Request, res: Response) => {
  try {
    const app = await prisma.app.findUnique({ where: { id: req.params.id as string } });
    if (!app) {
      res.status(404).json({ error: "App not found" });
      return;
    }

    // Re-parse config to ensure defaults are applied
    const config = parseConfig(app.config);
    res.json({ ...app, config });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to get app", message: err.message });
  }
});

// PUT /api/apps/:id - Update app config
appsRouter.put("/:id", async (req: Request, res: Response) => {
  try {
    const app = await prisma.app.findUnique({ where: { id: req.params.id as string } });
    if (!app) {
      res.status(404).json({ error: "App not found" });
      return;
    }

    const updateData: any = {};
    if (req.body.name) updateData.name = req.body.name;
    if (req.body.config) updateData.config = parseConfig(req.body.config) as any;

    const updated = await prisma.app.update({
      where: { id: req.params.id as string },
      data: updateData,
    });

    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to update app", message: err.message });
  }
});

// DELETE /api/apps/:id - Delete app and all its data
appsRouter.delete("/:id", async (req: Request, res: Response) => {
  try {
    const app = await prisma.app.findUnique({ where: { id: req.params.id as string } });
    if (!app) {
      res.status(404).json({ error: "App not found" });
      return;
    }

    await prisma.app.delete({ where: { id: req.params.id as string } });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to delete app", message: err.message });
  }
});
