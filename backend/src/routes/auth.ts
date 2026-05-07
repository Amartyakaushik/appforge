import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";
import { parseConfig } from "../lib/config-parser";
import { generateToken } from "../middleware/auth";

export const authRouter = Router();

// POST /api/apps/:id/auth/register
authRouter.post("/:id/auth/register", async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;

    const app = await prisma.app.findUnique({ where: { id } });
    if (!app) {
      res.status(404).json({ error: "App not found" });
      return;
    }

    const config = parseConfig(app.config);
    if (!config.auth.enabled) {
      res.status(400).json({ error: "Authentication is not enabled for this app" });
      return;
    }

    const { email, password, ...extraFields } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: "Email and password are required" });
      return;
    }

    // Check if user already exists
    const existing = await prisma.appUser.findUnique({
      where: { appId_email: { appId: id, email } },
    });
    if (existing) {
      res.status(409).json({ error: "User already exists with this email" });
      return;
    }

    // Hash password and create user
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.appUser.create({
      data: {
        appId: id,
        email,
        passwordHash,
        profile: extraFields || {},
      },
    });

    const token = generateToken({ userId: user.id, appId: id, email });

    res.status(201).json({
      token,
      user: { id: user.id, email: user.email, profile: user.profile },
    });
  } catch (err: any) {
    res.status(500).json({ error: "Registration failed", message: err.message });
  }
});

// POST /api/apps/:id/auth/login
authRouter.post("/:id/auth/login", async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;

    const app = await prisma.app.findUnique({ where: { id } });
    if (!app) {
      res.status(404).json({ error: "App not found" });
      return;
    }

    const config = parseConfig(app.config);
    if (!config.auth.enabled) {
      res.status(400).json({ error: "Authentication is not enabled for this app" });
      return;
    }

    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: "Email and password are required" });
      return;
    }

    const user = await prisma.appUser.findUnique({
      where: { appId_email: { appId: id, email } },
    });
    if (!user) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    const token = generateToken({ userId: user.id, appId: id, email });

    res.json({
      token,
      user: { id: user.id, email: user.email, profile: user.profile },
    });
  } catch (err: any) {
    res.status(500).json({ error: "Login failed", message: err.message });
  }
});
