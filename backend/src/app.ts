import express from "express";
import cors from "cors";
import { login } from "./modules/auth/auth.controller";

export const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// Auth
app.post("/api/login", login);
