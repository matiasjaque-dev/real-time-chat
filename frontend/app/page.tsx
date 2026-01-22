"use client";

import { useEffect, useState } from "react";
import { getSocket, resetSocket } from "../src/lib/socket";

/**
 * Type definitions for chat messages
 */
type ChatMessage = {
  user: string;
  text: string;
  at: number;
};

/**
 * Main chat application component
 * Features:
 * - User authentication with JWT tokens
 * - Real-time message broadcasting via WebSocket
 * - User presence tracking
 * - Client-side rate limiting feedback
 */
export default function ChatPage() {
  const [username, setUsername] = useState<string>("");
  const [messageInput, setMessageInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [authToken, setAuthToken] = useState<string>("");
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [error, setError] = useState<string>("");

  // ===== Initialize User & Load Persisted State =====
  useEffect(() => {
    // Load saved username from localStorage or generate anonymous one
    const savedUsername =
      typeof window !== "undefined" ? localStorage.getItem("chat:user") : null;
    const initialUsername =
      savedUsername && savedUsername.trim()
        ? savedUsername
        : `user-${Math.floor(Math.random() * 1000)}`;
    setUsername(initialUsername);

    if (!savedUsername) {
      localStorage.setItem("chat:user", initialUsername);
    }

    // Load saved authentication token from localStorage
    const savedToken =
      typeof window !== "undefined"
        ? (localStorage.getItem("chat:token") ?? "")
        : "";
    setAuthToken(savedToken);
  }, []);

  // ===== Socket.io Connection & Event Handlers =====
  useEffect(() => {
    // Skip setup if no authentication token
    if (!authToken) return;

    const socket = getSocket();

    // ===== Connection Events =====
    const handleConnect = () => {
      console.log("🟢 Connected to chat server");
      setError("");
    };

    // ===== Chat Message Events =====
    const handleNewMessage = (msg: ChatMessage) => {
      setMessages((prev) => [...prev, msg]);
    };

    const handleChatHistory = (msgs: any[]) => {
      setMessages(
        msgs.map((msg: any) => ({
          user: msg.userId ?? msg.user,
          text: msg.content ?? msg.text,
          at: msg.createdAt ? new Date(msg.createdAt).getTime() : Date.now(),
        })),
      );
    };

    const handleChatError = (payload: { message: string }) => {
      setError(payload.message);
      console.error("❌ Chat error:", payload.message);
    };

    // ===== User Presence Events =====
    const handlePresenceUpdate = (payload: { onlineUsers: string[] }) => {
      setOnlineUsers(payload.onlineUsers ?? []);
    };

    const handleUserOnline = (payload: { userId: string }) => {
      setOnlineUsers((prev) =>
        prev.includes(payload.userId) ? prev : [...prev, payload.userId],
      );
    };

    const handleUserOffline = (payload: { userId: string }) => {
      setOnlineUsers((prev) => prev.filter((user) => user !== payload.userId));
    };

    // Attach event listeners
    socket.on("connect", handleConnect);
    socket.on("chat:message", handleNewMessage);
    socket.on("chat_history", handleChatHistory);
    socket.on("chat:error", handleChatError);
    socket.on("presence:update", handlePresenceUpdate);
    socket.on("user:online", handleUserOnline);
    socket.on("user:offline", handleUserOffline);

    // Cleanup: Remove event listeners on unmount or token change
    return () => {
      socket.off("connect", handleConnect);
      socket.off("chat:message", handleNewMessage);
      socket.off("chat_history", handleChatHistory);
      socket.off("chat:error", handleChatError);
      socket.off("presence:update", handlePresenceUpdate);
      socket.off("user:online", handleUserOnline);
      socket.off("user:offline", handleUserOffline);
      socket.disconnect();
    };
  }, [authToken]);

  // ===== Authentication Handler =====
  /**
   * Authenticate user and obtain JWT token
   * In production, this would validate credentials against a backend database
   */
  const handleLogin = async () => {
    if (!username.trim()) {
      setError("Username is required");
      return;
    }

    try {
      const response = await fetch("http://localhost:4000/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user: username }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Login failed:", errorText);
        setError("Login failed. Please try again.");
        return;
      }

      const data = await response.json();
      localStorage.setItem("chat:token", data.token);
      setAuthToken(data.token);
      resetSocket(); // Reconnect with new token
      setError("");
      console.log("✅ Successfully logged in");
    } catch (err) {
      console.error("Login error:", err);
      setError("Failed to connect to server");
    }
  };

  // ===== Message Handler =====
  /**
   * Send chat message to server
   * Validates message content and authentication before sending
   */
  const handleSendMessage = () => {
    if (!messageInput.trim() || !username.trim()) {
      return;
    }

    const socket = getSocket();
    console.log("📤 Sending message:", { username, messageInput });
    socket.emit("chat:message", { text: messageInput });
    setMessageInput("");
  };

  // ===== UI Component =====
  return (
    <main style={{ padding: 24, fontFamily: "sans-serif" }}>
      <h1>💬 Real-time Chat</h1>

      {/* ===== Authentication Section ===== */}
      <div
        style={{
          display: "flex",
          gap: 8,
          marginBottom: 16,
          padding: "12px",
          backgroundColor: "#f0f0f0",
          borderRadius: "8px",
        }}
      >
        <input
          value={username}
          onChange={(e) => {
            const value = e.target.value;
            setUsername(value);
            localStorage.setItem("chat:user", value);
          }}
          placeholder="Enter your username"
          style={{
            padding: "8px",
            borderRadius: "4px",
            border: "1px solid #ccc",
          }}
          disabled={!!authToken}
        />
        <button
          onClick={handleLogin}
          disabled={!!authToken || !username.trim()}
          style={{
            padding: "8px 16px",
            backgroundColor: authToken ? "#ccc" : "#007bff",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: authToken ? "default" : "pointer",
          }}
        >
          {authToken ? "✅ Logged In" : "Login"}
        </button>
      </div>

      {/* ===== Error Display ===== */}
      {error && (
        <div
          style={{
            padding: "12px",
            marginBottom: "12px",
            backgroundColor: "#f8d7da",
            color: "#721c24",
            borderRadius: "4px",
            border: "1px solid #f5c6cb",
          }}
        >
          {error}
        </div>
      )}

      {/* ===== Message Input Section ===== */}
      <div
        style={{
          display: "flex",
          gap: 8,
          marginBottom: 16,
          padding: "12px",
          backgroundColor: "#f0f0f0",
          borderRadius: "8px",
        }}
      >
        <input
          value={messageInput}
          onChange={(e) => setMessageInput(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
          placeholder="Type a message..."
          disabled={!authToken}
          style={{
            flex: 1,
            padding: "8px",
            borderRadius: "4px",
            border: "1px solid #ccc",
            opacity: authToken ? 1 : 0.6,
          }}
        />
        <button
          onClick={handleSendMessage}
          disabled={!authToken || !messageInput.trim()}
          style={{
            padding: "8px 16px",
            backgroundColor:
              authToken && messageInput.trim() ? "#28a745" : "#ccc",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: authToken && messageInput.trim() ? "pointer" : "default",
          }}
        >
          Send
        </button>
      </div>

      {/* ===== Online Users Section ===== */}
      <div
        style={{
          padding: "12px",
          marginBottom: "16px",
          backgroundColor: "#e7f3ff",
          borderRadius: "8px",
          border: "1px solid #b3d9ff",
        }}
      >
        <h3>👥 Online Users ({onlineUsers.length})</h3>
        <ul style={{ margin: 0, paddingLeft: "20px" }}>
          {onlineUsers.map((user) => (
            <li key={user}>{user}</li>
          ))}
        </ul>
      </div>

      {/* ===== Chat Messages Section ===== */}
      <div
        style={{
          padding: "12px",
          backgroundColor: "#fff",
          borderRadius: "8px",
          border: "1px solid #ddd",
          maxHeight: "400px",
          overflowY: "auto",
        }}
      >
        <h3>Messages</h3>
        <ul style={{ margin: 0, paddingLeft: "20px", listStyle: "none" }}>
          {messages.length === 0 ? (
            <li style={{ color: "#999" }}>No messages yet. Start chatting!</li>
          ) : (
            messages.map((msg, index) => (
              <li
                key={index}
                style={{
                  marginBottom: "8px",
                  paddingBottom: "8px",
                  borderBottom: "1px solid #eee",
                }}
              >
                <strong>{msg.user}:</strong> {msg.text}
                <span
                  style={{
                    fontSize: "0.8em",
                    color: "#999",
                    marginLeft: "8px",
                  }}
                >
                  {new Date(msg.at).toLocaleTimeString()}
                </span>
              </li>
            ))
          )}
        </ul>
      </div>
    </main>
  );
}
