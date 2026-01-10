"use client";

import { useEffect, useState } from "react";
import { getSocket } from "../src/lib/socket";

type ChatMessage = { user: string; text: string; at: number };

export default function Home() {
  // Avoid Math.random during SSR
  const [user, setUser] = useState<string>("");
  const [text, setText] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  useEffect(() => {
    // Set a stable client-only default user
    setUser((prev) => prev || `user-${Math.floor(Math.random() * 1000)}`);

    const socket = getSocket();

    const onConnect = () => {
      console.log("🟢 Connected to socket");
      socket.emit("ping");
    };
    const onPong = () => {
      console.log("🏓 Pong received");
    };
    const onChat = (msg: ChatMessage) => {
      setMessages((prev) => [...prev, msg]);
    };

    socket.on("connect", onConnect);
    socket.on("pong", onPong);
    socket.on("chat:message", onChat);

    return () => {
      socket.off("connect", onConnect);
      socket.off("pong", onPong);
      socket.off("chat:message", onChat);
      socket.disconnect();
    };
  }, []);

  const send = () => {
    const socket = getSocket();
    if (!text.trim() || !user.trim()) return;
    socket.emit("chat:message", { user, text });
    setText("");
  };

  return (
    <main style={{ padding: 24 }}>
      <h1>Socket.io Test</h1>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
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
