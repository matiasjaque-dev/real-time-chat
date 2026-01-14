import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("chat:token") ?? ""
        : "";
    socket = io("http://localhost:3001", {
      transports: ["websocket"],
      auth: { token }, // enviar JWT
    });

    // Loguea errores de handshake (JWT inválido o ausente)
    socket.on("connect_error", (err) => {
      console.error("❌ socket connect_error:", err.message);
    });
  }
  return socket;
}

// Si cambias el token (login/logout), destruye el socket para reconectar con el nuevo token:
export function resetSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
