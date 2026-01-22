import { Schema, model } from "mongoose";

/**
 * Message Schema: Stores chat messages with timestamps
 * - userId: Identifier of the user who sent the message
 * - content: The message text content
 * - room: Chat room identifier (defaults to "global")
 * - timestamps: Automatically managed createdAt and updatedAt fields
 */
const messageSchema = new Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true, // Index for efficient queries by user
    },
    content: {
      type: String,
      required: true,
    },
    room: {
      type: String,
      default: "global",
      index: true, // Index for efficient queries by room
    },
  },
  {
    timestamps: true, // Automatically add createdAt and updatedAt fields
  }
);

export const MessageModel = model("Message", messageSchema);
