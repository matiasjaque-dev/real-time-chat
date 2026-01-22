import { Request, Response } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET ?? "super-secret-key";
const TOKEN_EXPIRATION = "1h";

/**
 * Handle user login and generate JWT token
 * In production, this should validate against a database
 * @param req - Express request with user field in body
 * @param res - Express response to send JWT token
 */
export const login = (req: Request, res: Response): Response => {
  const { user } = req.body as { user?: string };

  // Validate user input
  if (!user || !user.trim()) {
    return res.status(400).json({ error: "Username is required" });
  }

  // Generate JWT token with userId claim
  const token = jwt.sign({ userId: user }, JWT_SECRET, {
    expiresIn: TOKEN_EXPIRATION,
  });

  return res.json({ token });
};
