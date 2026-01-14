import { Request, Response } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET: string = process.env.JWT_SECRET ?? "super-secret-key"; // mover a .env en producción

export const login = (req: Request, res: Response): Response => {
  const { user } = req.body as { user?: string };

  if (!user || !user.trim()) {
    return res.status(400).json({ error: "User required" });
  }

  const token = jwt.sign({ userId: user }, JWT_SECRET, { expiresIn: "1h" });

  return res.json({ token });
};
