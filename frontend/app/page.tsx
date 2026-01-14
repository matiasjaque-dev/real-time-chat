"use client";

import { useEffect, useState } from "react";
import { getSocket } from "../src/lib/socket";

type ChatMessage = { user: string; text: string; at: number };

export default function Home() {
  const [user, setUser] = useState<string>("");
  const [text, setText] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [token, setToken] = useState<string>("");

  // Cargar user/token persistidos
  useEffect(() => {
    const savedUser =
      typeof window !== "undefined" ? localStorage.getItem("chat:user") : null;
    const initialUser =
      savedUser && savedUser.trim()
        ? savedUser
        : `user-${Math.floor(Math.random() * 1000)}`;
    setUser(initialUser);
    if (!savedUser) localStorage.setItem("chat:user", initialUser);

    const savedToken =
      typeof window !== "undefined"
        ? localStorage.getItem("chat:token") ?? ""
        : "";
    setToken(savedToken);
  }, []);

  // Conexión del socket sólo si hay token
  useEffect(() => {
    if (!token) return;
    const socket = getSocket(); // leerá el token desde localStorage

    const onConnect = () => {
      console.log("🟢 Connected to socket");
      socket.emit("ping");
    };
    const onPong = () => console.log("🏓 Pong received");
    const onChat = (msg: ChatMessage) => setMessages((prev) => [...prev, msg]);
    const onHistory = (msgs: any[]) => {
      setMessages(
        msgs.map((m: any) => ({
          user: m.userId ?? m.user,
          text: m.content ?? m.text,
          at: m.createdAt ? new Date(m.createdAt).getTime() : Date.now(),
        }))
      );
    };

    socket.on("connect", onConnect);
    socket.on("pong", onPong);
    socket.on("chat:message", onChat);
    socket.on("chat_history", onHistory);

    return () => {
      socket.off("connect", onConnect);
      socket.off("pong", onPong);
      socket.off("chat:message", onChat);
      socket.off("chat_history", onHistory);
      socket.disconnect();
    };
  }, [token]);

  // Login: pide token al backend y lo guarda
  const login = async () => {
    if (!user.trim()) return;
    const res = await fetch("http://localhost:3001/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user }),
    });
    if (!res.ok) {
      console.error("Login error", await res.text());
      return;
    }
    const data = await res.json();
    localStorage.setItem("chat:token", data.token);
    setToken(data.token);
    console.log("🔑 Token guardado");
  };

  const send = () => {
    if (!text.trim() || !user.trim()) return;
    const socket = getSocket();
    console.log("📤 Enviando mensaje:", { user, text });
    socket.emit("chat:message", { user, text });
    setText("");
  };

  return (
    <main style={{ padding: 24 }}>
      <h1>Socket.io Chat</h1>

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
        <button onClick={login}>Login</button>
        {token ? <span>✅ Auth</span> : <span>❌ No auth</span>}
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Mensaje"
          style={{ flex: 1 }}
        />
        <button onClick={send} disabled={!token}>
          Enviar
        </button>
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
