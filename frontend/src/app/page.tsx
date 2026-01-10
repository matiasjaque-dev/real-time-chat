"use client";

import { useEffect, useState } from "react";
import { getSocket } from "@/lib/socket";

export default function Home() {
  const [user, setUser] = useState<string>(
    () => `user-${Math.floor(Math.random() * 1000)}`
  );
  const [text, setText] = useState("");
  const [messages, setMessages] = useState<
    Array<{ user: string; text: string; at: number }>
  >([]);

  useEffect(() => {
    const socket = getSocket();

    socket.on("connect", () => {
      console.log("🟢 Connected to socket");
      socket.emit("ping");
    });

    socket.on("pong", () => {
      console.log("🏓 Pong received");
    });

    socket.on("chat:message", (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const send = () => {
    const socket = getSocket();
    if (!text.trim()) return;
    socket.emit("chat:message", { user, text });
    setText("");
  };

  return (
    <main style={{ padding: 24 }}>
      <h1>Socket.io Test</h1>

      <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
        <input
          value={user}
          onChange={(e) => setUser(e.target.value)}
          placeholder="Usuario"
        />
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Mensaje"
          style={{ flex: 1 }}
        />
        <button onClick={send}>Enviar</button>
      </div>

      <ul>
        {messages.map((m, i) => (
          <li key={i}>
            <strong>{m.user}:</strong> {m.text}
          </li>
        ))}
      </ul>
    </main>
  );
}
