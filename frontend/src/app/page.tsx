"use client";

import { useEffect } from "react";
import { getSocket } from "@/lib/socket";

export default function Home() {
  useEffect(() => {
    const socket = getSocket();

    socket.on("connect", () => {
      console.log("🟢 Connected to socket");
      socket.emit("ping");
    });

    socket.on("pong", () => {
      console.log("🏓 Pong received");
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return (
    <main>
      <h1>Socket.io Test</h1>
      <p>Open the console</p>
    </main>
  );
}
