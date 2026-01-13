"use client";

import { useEffect, useState } from "react";
import { getSocket } from "../src/lib/socket";

type ChatMessage = { user: string; text: string; at: number };

export default function Home() {
  const [user, setUser] = useState<string>("");
  const [text, setText] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  // Usuario persistente
  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("chat:user") : null;
    const initial = saved && saved.trim() ? saved : `user-${Math.floor(Math.random() * 1000)}`;
    setUser(initial);
    if (!saved) localStorage.setItem("chat:user", initial);
  }, []);

  useEffect(() => {
    const socket = getSocket();

    const onConnect = () => {
      console.log("🟢 Connected to socket");
      socket.emit("ping");
    };
    const onPong = () => console.log("🏓 Pong received");
    const onChat = (msg: ChatMessage) => setMessages((prev) => [...prev, msg]);

    socket.on("connect", onConnect);
    socket.on("pong", onPong);
    socket.on("chat:message", onChat);
    socket.on("chat_history", (msgs: any[]) => {
      // adapta a tipo local si tu backend envía {userId, content, createdAt}
      setMessages(
        msgs.map((m: any) => ({
          user: m.userId ?? m.user,
          text: m.content ?? m.text,
          at: m.createdAt ? new Date(m.createdAt).getTime() : Date.now(),
        }))
      );
    });

    return () => {
      socket.off("connect", onConnect);
      socket.off("pong", onPong);
      socket.off("chat:message", onChat);
      socket.off("chat_history");
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
          onChange={(e) => {
            const v = e.target.value;
            setUser(v);
            localStorage.setItem("chat:user", v);
          }}
          placeholder="Usuario"
        />
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Mensaje" style={{ flex: 1 }} />
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
