import express from "express";
import cors from "cors";
import { login } from "./modules/auth/auth.controller";
import { getOnlineUsers } from "./shared/presence";

// Initialize Express application with middleware
export const app = express();

// Configure CORS to allow requests from the frontend
app.use(cors({ origin: "http://localhost:3000", credentials: false }));

// Parse incoming JSON request bodies
app.use(express.json());

// ===== Authentication Routes =====
/**
 * POST /api/login
 * Generate JWT token for authenticated chat access
 */
app.post("/api/login", login);

// ===== Health Check =====
/**
 * GET /health
 * Simple endpoint to verify backend is running
 */
app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// ===== Presence Routes =====
/**
 * GET /api/online
 * Retrieve list of currently online users
 */
app.get("/api/online", async (_req, res) => {
  try {
    const users = await getOnlineUsers();
    res.json({ users });
  } catch (error) {
    console.error("Failed to fetch online users:", error);
    res.status(500).json({ error: "Failed to fetch presence list" });
  }
});
