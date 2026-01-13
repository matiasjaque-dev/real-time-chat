import { Schema, model } from "mongoose";

const MessageSchema = new Schema(
  {
    userId: {
      type: String,
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    room: {
      type: String,
      default: "global",
    },
  },
  {
    timestamps: true,
  }
);

export const MessageModel = model("Message", MessageSchema);
