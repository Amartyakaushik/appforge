import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import { appsRouter } from "./routes/apps";
import { entitiesRouter } from "./routes/entities";
import { authRouter } from "./routes/auth";
import { statsRouter } from "./routes/stats";
import { csvRouter } from "./routes/csv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json({ limit: "10mb" }));

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Routes
app.use("/api/apps", appsRouter);
app.use("/api/apps", entitiesRouter);
app.use("/api/apps", authRouter);
app.use("/api/apps", statsRouter);
app.use("/api/apps", csvRouter);

// Global error handler
app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error("Unhandled error:", err.message);
    res.status(500).json({ error: "Internal server error", message: err.message });
  }
);

app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});

export default app;
