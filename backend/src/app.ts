import express from "express";
import cors from "cors";
import { login } from "./modules/auth/auth.controller";
import { getOnlineUsers } from "./shared/presence";

export const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// Auth
app.post("/api/login", login);

app.get("/api/online", async (_req, res) => {
  try {
    const users = await getOnlineUsers();
    res.json({ users });
  } catch (e) {
    res.status(500).json({ error: "presence list failed" });
  }
});
