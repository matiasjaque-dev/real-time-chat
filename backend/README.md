# 🚀 Backend - Real-Time Chat

API y servidor WebSocket para la aplicación de chat en tiempo real.

## 📋 Tabla de Contenidos

- [Setup Rápido](#setup-rápido)
- [Estructura de Carpetas](#estructura-de-carpetas)
- [Variables de Entorno](#variables-de-entorno)
- [API REST Endpoints](#api-rest-endpoints)
- [WebSocket Events](#websocket-events)
- [Configuración](#configuración)
- [Desarrollo](#desarrollo)
- [Testing](#testing)
- [Deployment](#deployment)

## ⚡ Setup Rápido

### Requisitos

- Node.js 18+
- npm o yarn
- Docker (opcional, para servicios)

### Instalación

```bash
cd backend
npm install
```

### Iniciar Servicios

```bash
# Con Docker (recomendado)
docker-compose up -d redis mongo

# O manualmente
redis-server &
mongod &
```

### Variables de Entorno

```bash
cp .env.example .env
```

Editar `.env`:

```env
PORT=4000
NODE_ENV=development
JWT_SECRET=your-secret-key-change-this-in-prod
MONGODB_URI=mongodb://localhost:27017/chat-db
REDIS_URL=redis://localhost:6379
FRONTEND_ORIGIN=http://localhost:3000
```

### Iniciar Servidor

```bash
npm run dev
```

✅ Backend corriendo en `http://localhost:4000`

---

## 📁 Estructura de Carpetas

```
backend/
├── src/
│   ├── index.ts                 # Entry point
│   ├── server.ts                # HTTP server bootstrap
│   ├── app.ts                   # Express app
│   │
│   ├── config/                  # Configuraciones
│   │   ├── mongo.ts             # MongoDB connection
│   │   ├── redis.ts             # Redis client
│   │   └── socket.ts            # Socket.io setup
│   │
│   ├── modules/                 # Módulos de negocio
│   │   ├── auth/
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.routes.ts
│   │   │   └── auth.service.ts
│   │   ├── chat/
│   │   │   ├── chat.gateway.ts  # WebSocket handlers
│   │   │   └── chat.service.ts
│   │   ├── messages/
│   │   │   ├── message.model.ts
│   │   │   └── message.service.ts
│   │   └── users/
│   │       ├── user.model.ts
│   │       └── user.service.ts
│   │
│   └── shared/                  # Código compartido
│       ├── presence.ts          # Presencia en vivo
│       ├── rate-limit.ts        # Rate limiting
│       ├── middlewares.ts       # Express middlewares
│       └── types.ts             # TypeScript types
│
├── dist/                        # Código compilado (generado)
├── package.json
├── tsconfig.json
├── .env.example
└── docker-compose.yml
```

---

## 🔧 Variables de Entorno

### Obligatorias

```env
PORT                    # Puerto del servidor (default: 4000)
NODE_ENV               # environment: development|production
JWT_SECRET             # Secret para firmar JWT tokens
MONGODB_URI            # Conexión a MongoDB
REDIS_URL              # Conexión a Redis
FRONTEND_ORIGIN        # Origin del frontend (para CORS)
```

### Opcionales

```env
LOG_LEVEL              # debug|info|warn|error (default: info)
RATE_LIMIT_WINDOW      # Ventana de rate limit en ms (default: 60000)
RATE_LIMIT_MAX_REQUESTS # Max requests por ventana (default: 100)
JWT_EXPIRES_IN         # Expiración JWT (default: 24h)
```

---

## 📡 API REST Endpoints

### Auth

#### POST `/auth/register`

Crear nuevo usuario

```bash
curl -X POST http://localhost:4000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "username": "username",
    "password": "password123"
  }'
```

**Response (201)**

```json
{
  "token": "eyJhbGc...",
  "user": {
    "_id": "507f1f77bcf86cd799439011",
    "email": "user@example.com",
    "username": "username"
  }
}
```

#### POST `/auth/login`

Login de usuario

```bash
curl -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'
```

**Response (200)**

```json
{
  "token": "eyJhbGc...",
  "user": {
    "_id": "507f1f77bcf86cd799439011",
    "email": "user@example.com",
    "username": "username"
  }
}
```

#### POST `/auth/verify`

Verificar token JWT

```bash
curl -X POST http://localhost:4000/auth/verify \
  -H "Authorization: Bearer eyJhbGc..."
```

**Response (200)**

```json
{
  "valid": true,
  "userId": "507f1f77bcf86cd799439011"
}
```

### Users

#### GET `/users`

Listar todos los usuarios

```bash
curl http://localhost:4000/users \
  -H "Authorization: Bearer eyJhbGc..."
```

**Response (200)**

```json
{
  "users": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "username": "user1",
      "email": "user1@example.com",
      "status": "online"
    },
    {
      "_id": "507f1f77bcf86cd799439012",
      "username": "user2",
      "email": "user2@example.com",
      "status": "offline"
    }
  ]
}
```

#### GET `/users/:id`

Obtener usuario específico

```bash
curl http://localhost:4000/users/507f1f77bcf86cd799439011 \
  -H "Authorization: Bearer eyJhbGc..."
```

**Response (200)**

```json
{
  "user": {
    "_id": "507f1f77bcf86cd799439011",
    "username": "user1",
    "email": "user1@example.com",
    "status": "online",
    "lastSeen": "2024-01-22T10:30:00Z"
  }
}
```

### Messages

#### GET `/messages/:roomId`

Obtener historial de mensajes

```bash
curl "http://localhost:4000/messages/room123?limit=50&skip=0" \
  -H "Authorization: Bearer eyJhbGc..."
```

**Response (200)**

```json
{
  "messages": [
    {
      "_id": "msg1",
      "roomId": "room123",
      "senderId": "user1",
      "content": "Hello!",
      "createdAt": "2024-01-22T10:20:00Z"
    }
  ],
  "total": 150
}
```

---

## 🔌 WebSocket Events

### Cliente → Servidor

#### `message:send`

Enviar un mensaje

```javascript
socket.emit("message:send", {
  roomId: "room123",
  content: "Hello everyone!",
  timestamp: Date.now(),
});
```

#### `typing:start`

Notificar que empezó a escribir

```javascript
socket.emit("typing:start", {
  roomId: "room123",
  userId: "user1",
});
```

#### `typing:stop`

Notificar que dejó de escribir

```javascript
socket.emit("typing:stop", {
  roomId: "room123",
  userId: "user1",
});
```

#### `user:online`

Notificar que el usuario está online

```javascript
socket.emit("user:online", {
  userId: "user1",
  timestamp: Date.now(),
});
```

#### `user:offline`

Notificar que el usuario está offline

```javascript
socket.emit("user:offline", {
  userId: "user1",
});
```

### Servidor → Cliente

#### `message:new`

Nuevo mensaje recibido

```javascript
socket.on("message:new", (data) => {
  console.log("Nuevo mensaje:", data);
  // {
  //   _id: 'msg1',
  //   roomId: 'room123',
  //   senderId: 'user1',
  //   senderName: 'John',
  //   content: 'Hello!',
  //   createdAt: '2024-01-22T10:20:00Z'
  // }
});
```

#### `message:ack`

Confirmación de que el mensaje fue guardado

```javascript
socket.on("message:ack", (data) => {
  console.log("Mensaje guardado:", data._id);
});
```

#### `users:online`

Lista de usuarios online

```javascript
socket.on("users:online", (users) => {
  console.log("Usuarios online:", users);
  // ['user1', 'user2', 'user3']
});
```

#### `user:typing`

Usuario está escribiendo

```javascript
socket.on("user:typing", (data) => {
  console.log(`${data.userId} está escribiendo...`);
});
```

#### `presence:update`

Cambio de presencia (online/offline)

```javascript
socket.on("presence:update", (data) => {
  console.log(`${data.userId} está ${data.status}`);
  // { userId: 'user1', status: 'online', timestamp: ... }
});
```

#### `error`

Error en el servidor

```javascript
socket.on("error", (error) => {
  console.error("Error:", error.message);
});
```

---

## ⚙️ Configuración

### MongoDB Connection (`src/config/mongo.ts`)

```typescript
import mongoose from "mongoose";

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/chat-db";

export async function connectMongo() {
  try {
    await mongoose.connect(MONGODB_URI, {
      maxPoolSize: 10,
      minPoolSize: 2,
    });
    console.log("✅ MongoDB connected");
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error);
    throw error;
  }
}
```

### Redis Connection (`src/config/redis.ts`)

```typescript
import { createClient } from "redis";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

export const redisClient = createClient({ url: REDIS_URL });

redisClient.on("error", (err) => console.error("Redis error:", err));
redisClient.on("connect", () => console.log("✅ Redis connected"));
```

### Socket.io Setup (`src/config/socket.ts`)

```typescript
import { createAdapter } from "@socket.io/redis-adapter";
import jwt from "jsonwebtoken";

export function setupSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_ORIGIN,
      credentials: true,
    },
  });

  // Redis adapter para múltiples instancias
  const pubClient = createClient({ url: process.env.REDIS_URL });
  const subClient = pubClient.duplicate();

  Promise.all([pubClient.connect(), subClient.connect()]).then(() => {
    io.adapter(createAdapter(pubClient, subClient));
  });

  // JWT authentication
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!);
      socket.data.userId = decoded.userId;
      next();
    } catch (error) {
      next(new Error("Invalid token"));
    }
  });

  return io;
}
```

---

## 👨‍💻 Desarrollo

### Scripts

```bash
# Desarrollo con hot-reload
npm run dev

# Compilar TypeScript
npm run build

# Correr versión compilada
npm start

# Linting
npm run lint

# Testing
npm test
```

### Estructura de un módulo

```typescript
// user.model.ts
import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  email: { type: String, unique: true, required: true },
  username: { type: String, unique: true, required: true },
  passwordHash: { type: String, required: true },
  status: { type: String, enum: ["online", "offline"], default: "offline" },
  lastSeen: Date,
  createdAt: { type: Date, default: Date.now },
});

export const User = mongoose.model("User", userSchema);

// user.service.ts
export async function getUserById(id: string) {
  return User.findById(id).select("-passwordHash");
}

// user.routes.ts
import { Router } from "express";
import { authMiddleware } from "../shared/middlewares";
import * as userService from "./user.service";

const router = Router();

router.get("/", authMiddleware, async (req, res) => {
  const users = await userService.getAllUsers();
  res.json({ users });
});

export default router;
```

### Mejores Prácticas

1. **Separación de Concerns**
   - Models en `*.model.ts`
   - Lógica en `*.service.ts`
   - Rutas en `*.routes.ts`
   - Handlers en `*.controller.ts`

2. **Error Handling**

   ```typescript
   try {
     const result = await someAsyncOperation();
   } catch (error) {
     console.error("Error:", error);
     res.status(500).json({ error: "Internal server error" });
   }
   ```

3. **Input Validation**

   ```typescript
   if (!email || !password) {
     return res.status(400).json({ error: "Missing required fields" });
   }
   ```

4. **Logging**
   ```typescript
   console.log("✅ Success message");
   console.error("❌ Error message");
   console.warn("⚠️ Warning message");
   ```

---

## 🧪 Testing

```bash
npm test
```

Ejemplo con Jest:

```typescript
describe("Auth Service", () => {
  it("should login user with correct credentials", async () => {
    const result = await loginUser("user@example.com", "password123");
    expect(result.token).toBeDefined();
    expect(result.user.email).toBe("user@example.com");
  });

  it("should reject invalid credentials", async () => {
    expect(async () => {
      await loginUser("user@example.com", "wrongpassword");
    }).rejects.toThrow("Invalid credentials");
  });
});
```

---

## 🚀 Deployment

### Producción

1. **Compilar TypeScript**

   ```bash
   npm run build
   ```

2. **Crear Docker Image**

   ```dockerfile
   FROM node:20-alpine
   WORKDIR /app
   COPY package*.json ./
   RUN npm ci --only=production
   COPY dist ./dist
   EXPOSE 4000
   CMD ["node", "dist/index.js"]
   ```

3. **Variables de Entorno en Producción**

   ```env
   PORT=4000
   NODE_ENV=production
   JWT_SECRET=your-very-secure-random-key
   MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/chat-db?retryWrites=true&w=majority
   REDIS_URL=rediss://user:pass@redis-prod.example.com:6379
   FRONTEND_ORIGIN=https://chat-app.com
   ```

4. **PM2 (Node Process Manager)**

   ```bash
   npm install -g pm2
   pm2 start dist/index.js --name "chat-backend"
   pm2 save
   pm2 startup
   ```

5. **Nginx Reverse Proxy**
   ```nginx
   server {
     listen 80;
     server_name api.chat-app.com;

     location / {
       proxy_pass http://localhost:4000;
       proxy_http_version 1.1;
       proxy_set_header Upgrade $http_upgrade;
       proxy_set_header Connection "Upgrade";
     }
   }
   ```

### Kubernetes

```bash
kubectl apply -f backend-deployment.yaml
```

Ver [SCALING.md](../SCALING.md) para más detalles.

---

## 🐛 Troubleshooting

| Problema                       | Solución                                                |
| ------------------------------ | ------------------------------------------------------- |
| `ECONNREFUSED 127.0.0.1:27017` | MongoDB no está corriendo. `docker-compose up -d mongo` |
| `ECONNREFUSED 127.0.0.1:6379`  | Redis no está corriendo. `docker-compose up -d redis`   |
| `Port 4000 already in use`     | Cambiar `PORT=5000 npm run dev`                         |
| `JWT token expired`            | Token expiró. Frontend debe re-autenticar               |
| `CORS error`                   | Verificar `FRONTEND_ORIGIN` en `.env`                   |

---

## 📚 Recursos

- [Express.js Documentation](https://expressjs.com/)
- [Socket.io Documentation](https://socket.io/)
- [MongoDB Mongoose](https://mongoosejs.com/)
- [Redis Documentation](https://redis.io/)
- [JWT Authentication](https://jwt.io/)

---

**¿Preguntas?** Revisa [README.md](../README.md) o [ARCHITECTURE.md](../ARCHITECTURE.md)
