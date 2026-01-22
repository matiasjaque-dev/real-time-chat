import { io, Socket } from "socket.io-client";

const BACKEND_URL = "http://localhost:4000";
const TRANSPORT_METHOD = "websocket";

/**
 * Socket.io client singleton
 * Maintains single persistent WebSocket connection to backend
 * Handles authentication token and connection lifecycle
 */
let socketInstance: Socket | null = null;

/**
 * Get or create Socket.io client instance
 * Automatically includes JWT token from localStorage in handshake
 * @returns Socket.io client instance
 */
export function getSocket(): Socket {
  if (!socketInstance) {
    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("chat:token") ?? ""
        : "";

    socketInstance = io(BACKEND_URL, {
      transports: [TRANSPORT_METHOD],
      auth: { token }, // JWT sent during handshake
    });

    // Log authentication errors (invalid or missing JWT)
    socketInstance.on("connect_error", (error) => {
      console.error("❌ Socket connection error:", error.message);
    });
  }

  return socketInstance;
}

/**
 * Destroy Socket.io connection and force reconnection
 * Use after login/logout to establish new connection with updated token
 */
export function resetSocket(): void {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
}
