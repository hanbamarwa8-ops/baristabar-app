import "dotenv/config";
import express from "express";
import cors from "cors";
import { pool } from "./config/database.js";
import productsRouter from "./routes/products.routes.js";
import adminProductsRouter from "./routes/admin-products.routes.js";

const app = express();
const port = Number(process.env.PORT ?? 4000);

app.use(
  cors({
    origin: ["http://localhost:3000", "http://localhost:3001"],
    allowedHeaders: ["Content-Type", "Authorization"],
    methods: ["GET", "POST", "PUT", "PATCH", "OPTIONS"],
  }),
);
app.use(express.json({ limit: "1mb" }));

// Public, read-only catalogue for the shop.
app.use("/api/products", productsRouter);

// Private catalogue management API. Every route verifies a Supabase token
// and the configured administrator email in the backend middleware.
app.use("/api/admin/products", adminProductsRouter);

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", message: "BaristaBar API is running" });
});

app.get("/api/db-health", async (_req, res) => {
  try {
    const result = await pool.query(
      "SELECT NOW() AS server_time, current_database() AS database_name",
    );

    res.json({
      status: "ok",
      message: "PostgreSQL connection successful",
      database: result.rows[0].database_name,
      serverTime: result.rows[0].server_time,
    });
  } catch (error) {
    console.error("PostgreSQL connection failed:", error);
    res.status(500).json({
      status: "error",
      message:
        "Database connection failed. Check your Supabase connection settings.",
    });
  }
});

const server = app.listen(port, () => {
  console.log(`BaristaBar API running at http://localhost:${port}`);
});

process.on("SIGINT", () => {
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
});

process.on("SIGTERM", () => {
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
});
