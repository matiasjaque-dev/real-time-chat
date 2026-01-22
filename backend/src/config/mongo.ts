import mongoose from "mongoose";

const MONGODB_URL = "mongodb://localhost:27017/chat-app";

/**
 * Establish connection to MongoDB database
 * Database stores: chat messages, user profiles, session data
 */
export const connectMongo = async () => {
  try {
    await mongoose.connect(MONGODB_URL);
    console.log("✅ MongoDB connected successfully");
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error);
    process.exit(1);
  }
};
