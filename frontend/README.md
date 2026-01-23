# 💻 Frontend - Real-Time Chat

Aplicación Next.js 16 para chat en tiempo real con comunicación instantánea vía WebSocket.

## 📋 Tabla de Contenidos

- [Setup Rápido](#setup-rápido)
- [Estructura de Carpetas](#estructura-de-carpetas)
- [Variables de Entorno](#variables-de-entorno)
- [Características](#características)
- [Socket.io Client](#socketio-client)
- [Componentes Principales](#componentes-principales)
- [Desarrollo](#desarrollo)
- [Deployment](#deployment)

## ⚡ Setup Rápido

### Requisitos

- Node.js 18+
- npm o yarn
- Backend corriendo en http://localhost:4000

### Instalación

```bash
cd frontend
npm install
```

### Variables de Entorno

```bash
cp .env.example .env.local
```

Editar `.env.local`:

```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:4000
```

### Iniciar Development Server

```bash
npm run dev
```

✅ Frontend corriendo en `http://localhost:3000`

---

## 📁 Estructura de Carpetas

```
frontend/
├── app/
│   ├── layout.tsx               # Root layout
│   ├── page.tsx                 # Página principal del chat
│   ├── globals.css              # Estilos globales
│   └── favicon.ico
│
├── src/
│   ├── lib/
│   │   ├── socket.ts            # Socket.io client singleton
│   │   ├── types.ts             # TypeScript types
│   │   └── constants.ts         # Constantes
│   │
│   ├── components/              # Componentes React
│   │   ├── Chat/
│   │   │   ├── ChatWindow.tsx
│   │   │   ├── MessageList.tsx
│   │   │   └── MessageInput.tsx
│   │   ├── Users/
│   │   │   ├── UserList.tsx
│   │   │   └── UserCard.tsx
│   │   ├── Auth/
│   │   │   ├── LoginForm.tsx
│   │   │   └── RegisterForm.tsx
│   │   └── common/
│   │       ├── Header.tsx
│   │       └── Loading.tsx
│   │
│   ├── hooks/                   # Custom hooks
│   │   ├── useAuth.ts
│   │   ├── useChat.ts
│   │   └── useSocket.ts
│   │
│   ├── context/                 # React Context
│   │   ├── AuthContext.tsx
│   │   └── ChatContext.tsx
│   │
│   └── styles/                  # Módulos CSS
│       ├── Chat.module.css
│       └── Users.module.css
│
├── public/
│   └── assets/                  # Imágenes, íconos
│
├── .env.local                   # Variables de entorno locales
├── .env.example
├── next.config.ts
├── tsconfig.json
├── tailwind.config.ts
└── package.json
```

---

## 🔧 Variables de Entorno

### Requeridas

```env
NEXT_PUBLIC_BACKEND_URL    # URL del backend (http://localhost:4000)
```

### Opcionales

```env
NEXT_PUBLIC_LOG_LEVEL      # debug|info|warn|error
NEXT_PUBLIC_MAX_RECONNECT_ATTEMPTS # Intentos reconexión (default: 5)
NEXT_PUBLIC_RECONNECT_DELAY        # Delay reconexión en ms (default: 1000)
```

### Notas de Seguridad

- Variables con `NEXT_PUBLIC_` se exponen en el navegador
- Nunca guardes secrets en variables públicas
- Variables privadas se manejan en servidor (API routes)

---

## ✨ Características

- ✅ **Chat en Tiempo Real** - Mensajes instantáneos vía WebSocket
- ✅ **Autenticación** - Login/Register con JWT
- ✅ **Presencia en Vivo** - Ver quién está online
- ✅ **Indicador de Escritura** - Ver cuando otros escriben
- ✅ **Historial de Mensajes** - Cargar mensajes anteriores
- ✅ **Responsive Design** - Mobile-first con Tailwind
- ✅ **Manejo de Errores** - Reconexión automática
- ✅ **Type Safety** - TypeScript en todo

---

## 🔌 Socket.io Client

### Inicialización (`src/lib/socket.ts`)

```typescript
import io, { Socket } from "socket.io-client";

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(process.env.NEXT_PUBLIC_BACKEND_URL, {
      auth: {
        token: localStorage.getItem("token"),
      },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    // Event listeners
    socket.on("connect", () => {
      console.log("✅ Connected to server");
    });

    socket.on("disconnect", () => {
      console.log("❌ Disconnected from server");
    });

    socket.on("connect_error", (error) => {
      console.error("Connection error:", error);
    });
  }

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
```

### Uso en Componentes

```typescript
'use client';

import { useEffect, useState } from 'react';
import { getSocket } from '@/lib/socket';

export default function ChatWindow() {
  const [messages, setMessages] = useState<Message[]>([]);
  const socket = getSocket();

  useEffect(() => {
    // Escuchar mensajes nuevos
    socket.on('message:new', (data) => {
      setMessages(prev => [...prev, data]);
    });

    // Cleanup
    return () => {
      socket.off('message:new');
    };
  }, [socket]);

  const sendMessage = (content: string) => {
    socket.emit('message:send', {
      roomId: 'general',
      content,
      timestamp: Date.now(),
    });
  };

  return (
    <div className="chat-window">
      {/* Componentes */}
    </div>
  );
}
```

---

## 🧩 Componentes Principales

### ChatWindow.tsx

```typescript
interface ChatWindowProps {
  roomId: string;
  userId: string;
}

export default function ChatWindow({ roomId, userId }: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const socket = getSocket();

  useEffect(() => {
    // Cargar mensajes iniciales
    fetchMessages(roomId);

    // Escuchar nuevos mensajes
    socket.on('message:new', handleNewMessage);

    return () => {
      socket.off('message:new');
    };
  }, [roomId, socket]);

  return (
    <div className="flex flex-col h-full">
      <MessageList messages={messages} />
      <MessageInput onSend={handleSend} />
    </div>
  );
}
```

### MessageInput.tsx

```typescript
export default function MessageInput({ onSend }: { onSend: (text: string) => void }) {
  const [text, setText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const socket = getSocket();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setText(e.target.value);

    // Notificar que está escribiendo
    if (!isTyping) {
      setIsTyping(true);
      socket.emit('typing:start', { roomId: 'general' });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim()) {
      onSend(text);
      setText('');
      setIsTyping(false);
      socket.emit('typing:stop', { roomId: 'general' });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 p-4">
      <input
        type="text"
        value={text}
        onChange={handleChange}
        placeholder="Escribe un mensaje..."
        className="flex-1 px-4 py-2 border rounded-lg"
      />
      <button
        type="submit"
        className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
      >
        Enviar
      </button>
    </form>
  );
}
```

### UserList.tsx

```typescript
export default function UserList() {
  const [users, setUsers] = useState<User[]>([]);
  const socket = getSocket();

  useEffect(() => {
    socket.on('users:online', (onlineUsers) => {
      setUsers(onlineUsers);
    });

    socket.on('presence:update', (data) => {
      setUsers(prev =>
        prev.map(user =>
          user._id === data.userId
            ? { ...user, status: data.status }
            : user
        )
      );
    });

    return () => {
      socket.off('users:online');
      socket.off('presence:update');
    };
  }, [socket]);

  return (
    <div className="w-64 bg-gray-100 p-4">
      <h2 className="text-lg font-bold mb-4">Usuarios Online</h2>
      <div className="space-y-2">
        {users.map(user => (
          <UserCard key={user._id} user={user} />
        ))}
      </div>
    </div>
  );
}
```

---

## 🎨 Estilos con Tailwind CSS

### Configuración Base

```typescript
// tailwind.config.ts
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./src/components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#3B82F6",
        secondary: "#10B981",
      },
    },
  },
  plugins: [],
};

export default config;
```

### Componente Stylo

```typescript
export default function MessageBubble({ message, isOwn }: Props) {
  return (
    <div
      className={`flex mb-4 ${isOwn ? 'justify-end' : 'justify-start'}`}
    >
      <div
        className={`max-w-xs px-4 py-2 rounded-lg ${
          isOwn
            ? 'bg-blue-500 text-white'
            : 'bg-gray-200 text-gray-900'
        }`}
      >
        <p>{message.content}</p>
        <time className="text-xs opacity-70">
          {new Date(message.createdAt).toLocaleTimeString()}
        </time>
      </div>
    </div>
  );
}
```

---

## 🪝 Custom Hooks

### useAuth.ts

```typescript
export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      // Verificar token con backend
      fetch("/api/auth/verify", {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((data) => setUser(data.user))
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    localStorage.setItem("token", data.token);
    setUser(data.user);
  };

  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
  };

  return { user, isLoading, login, logout };
}
```

### useSocket.ts

```typescript
export function useSocket(roomId: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  const socket = getSocket();

  useEffect(() => {
    setIsConnected(socket.connected);

    socket.on("connect", () => setIsConnected(true));
    socket.on("disconnect", () => setIsConnected(false));
    socket.on("message:new", (msg) => setMessages((prev) => [...prev, msg]));
    socket.on("users:online", (online) => setUsers(online));

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("message:new");
      socket.off("users:online");
    };
  }, [socket, roomId]);

  return { messages, users, isConnected };
}
```

---

## 👨‍💻 Desarrollo

### Scripts

```bash
# Desarrollo con hot-reload
npm run dev

# Compilar para producción
npm run build

# Correr versión de producción
npm run start

# Linting
npm run lint

# Type checking
npm run type-check
```

### Mejores Prácticas

1. **Use 'use client' en Client Components**

   ```typescript
   "use client";
   import { useState } from "react";
   ```

2. **Fetch data en Server Components cuando sea posible**

   ```typescript
   export default async function Page() {
     const data = await fetch('...');
     return <div>{/* ... */}</div>;
   }
   ```

3. **Manejar errores en conexión**

   ```typescript
   socket.on("connect_error", (error) => {
     console.error("Connection failed:", error);
     // Mostrar toast al usuario
   });
   ```

4. **Limpiar listeners en useEffect**
   ```typescript
   useEffect(() => {
     socket.on("event", handler);
     return () => socket.off("event", handler);
   }, [socket]);
   ```

---

## 🚀 Deployment

### Vercel (Recomendado para Next.js)

1. **Conectar repositorio**
   - Ir a [vercel.com](https://vercel.com)
   - Importar proyecto desde GitHub/GitLab

2. **Configurar variables de entorno**

   ```
   NEXT_PUBLIC_BACKEND_URL = https://api.chat-app.com
   ```

3. **Deploy automático**
   - Cada push a main dispara un nuevo deploy
   - Previewers automáticos para PRs

### Docker

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package*.json ./
RUN npm ci --only=production
EXPOSE 3000

CMD ["npm", "start"]
```

```bash
docker build -t chat-frontend .
docker run -p 3000:3000 \
  -e NEXT_PUBLIC_BACKEND_URL=http://backend:4000 \
  chat-frontend
```

### Nginx Reverse Proxy

```nginx
upstream nextjs {
  server localhost:3000;
}

server {
  listen 80;
  server_name chat-app.com;

  location / {
    proxy_pass http://nextjs;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
  }

  # Cache static files
  location /_next/static {
    proxy_cache_valid 60m;
    proxy_pass http://nextjs;
  }
}
```

---

## 🔒 Seguridad

### Token Management

```typescript
// Guardar token de forma segura
localStorage.setItem("token", token);

// Enviar con cada request
const headers = {
  Authorization: `Bearer ${localStorage.getItem("token")}`,
};

// Limpiar al logout
localStorage.removeItem("token");
```

### CSRF Protection

```typescript
// Next.js maneja CSRF automáticamente
// Usar cookie segura para tokens sensibles
```

### XSS Prevention

```typescript
// React escapa HTML por defecto
<div>{userInput}</div> // Seguro ✅

// Sanizar HTML si es necesario
import DOMPurify from 'dompurify';
<div dangerouslySetInnerHTML={{
  __html: DOMPurify.sanitize(htmlContent)
}} />
```

---

## 🐛 Troubleshooting

| Problema                       | Solución                                                |
| ------------------------------ | ------------------------------------------------------- |
| `ENOTFOUND localhost:4000`     | Backend no está corriendo. `cd backend && npm run dev`  |
| `CORS error`                   | Verificar `NEXT_PUBLIC_BACKEND_URL` es correcto         |
| `WebSocket connection refused` | Asegurar backend está escuchando en puerto 4000         |
| `Token expired`                | Limpiar localStorage y re-autenticar                    |
| `Messages no actualizan`       | Verificar Socket.io está conectado (`socket.connected`) |

---

## 📚 Recursos

- [Next.js Documentation](https://nextjs.org/)
- [React Documentation](https://react.dev/)
- [Socket.io Client](https://socket.io/docs/v4/client-api/)
- [Tailwind CSS](https://tailwindcss.com/)
- [TypeScript Handbook](https://www.typescriptlang.org/)

---

**¿Preguntas?** Revisa [README.md](../README.md) o [ARCHITECTURE.md](../ARCHITECTURE.md)
