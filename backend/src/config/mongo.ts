import mongoose from "mongoose";

// Prefer explicit MONGODB_URI environment variable for production
const MONGODB_URI =
  process.env.MONGODB_URI ??
  (process.env.NODE_ENV === "production"
    ? null
    : "mongodb://localhost:27017/chat-app");

/**
 * Establish connection to MongoDB database
 * Database stores: chat messages, user profiles, session data
 */
export const connectMongo = async () => {
  if (!MONGODB_URI) {
    console.error(
      "❌ MONGODB_URI is not set. Set MONGODB_URI in your environment variables (required in production).",
    );
    process.exit(1);
  }

  try {
    await mongoose.connect(MONGODB_URI);
    console.log("✅ MongoDB connected successfully");
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error);
    process.exit(1);
  }
};
