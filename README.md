# 💬 Real-Time Chat Application

Una aplicación moderna de chat en tiempo real construida con **Next.js** y **Node.js/Express**, utilizando **WebSocket** para comunicación instantánea, **MongoDB** para persistencia de datos y **Redis** para escalabilidad.

## 🎯 Características Principales

- ✅ **Chat en Tiempo Real** - Comunicación instantánea vía WebSocket (Socket.io)
- ✅ **Autenticación Segura** - JWT tokens con validación en handshake
- ✅ **Persistencia de Mensajes** - MongoDB para almacenamiento permanente
- ✅ **Caché Distribuido** - Redis para sesiones y pub/sub
- ✅ **Escalabilidad Horizontal** - Redis adapter para múltiples instancias
- ✅ **Rate Limiting** - Protección contra abuso
- ✅ **Presencia en Vivo** - Estado de conexión de usuarios
- ✅ **Responsive UI** - Interfaz moderna con Tailwind CSS

## 📋 Stack Tecnológico

### Backend
- **Node.js + Express** - Servidor HTTP
- **TypeScript** - Type safety
- **Socket.io** - WebSocket real-time
- **MongoDB + Mongoose** - Base de datos
- **Redis** - Cache y pub/sub
- **JWT** - Autenticación

### Frontend
- **Next.js 16** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Estilos
- **Socket.io Client** - Cliente WebSocket

### DevOps
- **Docker & Docker Compose** - Containerización

## 🚀 Inicio Rápido

### Requisitos Previos
- Node.js 18+
- Docker y Docker Compose
- npm o yarn

### Instalación

1. **Clonar repositorio**
```bash
git clone <repo-url>
cd real-time-chat
```

2. **Instalar dependencias**
```bash
# Backend
cd backend
npm install

# Frontend (en otra terminal)
cd frontend
npm install
```

3. **Configurar variables de entorno**

**Backend** - `.env`
```env
PORT=4000
NODE_ENV=development
JWT_SECRET=your-secret-key-here
MONGODB_URI=mongodb://localhost:27017/chat-db
REDIS_URL=redis://localhost:6379
FRONTEND_ORIGIN=http://localhost:3000
```

**Frontend** - `.env.local`
```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:4000
```

4. **Levantar servicios con Docker**
```bash
docker-compose up -d
```

5. **Iniciar aplicaciones**

**Terminal 1 - Backend**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend**
```bash
cd frontend
npm run dev
```

6. **Acceder a la aplicación**
- Frontend: http://localhost:3000
- Backend API: http://localhost:4000

## 🏗️ Arquitectura

### Flujo de Comunicación

```
┌─────────────────────────────────────────────────────────────┐
│                       Cliente (Next.js)                     │
│  ┌───────────────────────────────────────────────────────┐ │
│  │  React Components + Socket.io Client                 │ │
│  │  - Autenticación                                     │ │
│  │  - Envío/Recepción de Mensajes                      │ │
│  │  - Lista de Usuarios Conectados                     │ │
│  └───────────────┬───────────────────────────────────────┘ │
└──────────────────┼──────────────────────────────────────────┘
                   │ WebSocket (Socket.io)
                   │
┌──────────────────┼──────────────────────────────────────────┐
│    Backend (Express + Socket.io)    ┌─────────────────┐    │
│  ┌──────────────▼─────────────────┐ │  Redis Adapter  │    │
│  │  Socket.io Server              │ │ (Multi-instance)│    │
│  │  ├─ Chat Gateway               │ └─────────────────┘    │
│  │  ├─ Auth Middleware (JWT)      │                        │
│  │  ├─ Presence Service           │  ┌──────────────────┐  │
│  │  └─ Message Broadcasting       │  │  Redis Cache     │  │
│  └──────────────┬──────────────────┘  │  ├─ Sessions     │  │
│                 │                      │  ├─ Presence     │  │
│  ┌──────────────▼──────────────────┐  │  └─ Pub/Sub      │  │
│  │  Express REST API                │  └──────────────────┘  │
│  │  ├─ Auth Routes                  │                        │
│  │  ├─ User Routes                  │  ┌──────────────────┐  │
│  │  └─ Message History Routes       │  │  MongoDB         │  │
│  └───────────────────────────────────┘  │  ├─ Users        │  │
│                                          │  ├─ Messages     │  │
│                                          │  └─ Rooms        │  │
│                                          └──────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Componentes Clave

#### Backend Modules

**`/src/modules/auth`**
- Autenticación de usuarios
- Generación y validación de JWT

**`/src/modules/chat`**
- Chat Gateway - Manejo de eventos WebSocket
- Broadcast de mensajes
- Gestión de salas/rooms

**`/src/modules/messages`**
- Modelo de datos de mensajes
- Persistencia en MongoDB
- Historial de chat

**`/src/config`**
- `mongo.ts` - Conexión a MongoDB
- `redis.ts` - Conexión a Redis y cliente
- `socket.ts` - Configuración de Socket.io con JWT y Redis adapter

**`/src/shared`**
- `presence.ts` - Sistema de presencia en vivo
- `rate-limit.ts` - Limitación de velocidad

#### Frontend Components

**`/app`**
- `layout.tsx` - Layout principal
- `page.tsx` - Página principal del chat

**`/lib`**
- `socket.ts` - Cliente Socket.io configurado

## 🔄 Flujo de Datos

### 1. Autenticación
```
Usuario → Login → Backend JWT Generator → Token → LocalStorage
Token → Socket Connection → JWT Verification → Conexión Establecida
```

### 2. Envío de Mensaje
```
Usuario escribe → Envía evento "message" → Backend recibe
Backend valida usuario → Guarda en MongoDB → 
Publica evento en Redis → Redis adapter distribuye a todos
Todos los clientes reciben evento "message:new" → UI se actualiza
```

### 3. Presencia (Online/Offline)
```
User conecta → "user:online" event → Redis cache actualiza
User desconecta → "user:offline" event → Redis cache actualiza
Otros usuarios reciben actualización de presencia en tiempo real
```

## 📊 Estructura de Carpetas Detallada

```
real-time-chat/
├── docker-compose.yml          # Servicios Docker (MongoDB, Redis)
├── README.md                   # Este archivo
├── ARCHITECTURE.md             # Documentación de arquitectura detallada
├── SCALING.md                  # Guía de escalabilidad
│
├── backend/
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env.example
│   ├── dist/                   # Código compilado (generado)
│   │
│   └── src/
│       ├── index.ts            # Entry point
│       ├── server.ts           # Bootstrap del servidor
│       ├── app.ts              # Express app
│       │
│       ├── config/
│       │   ├── mongo.ts        # Conexión MongoDB
│       │   ├── redis.ts        # Cliente Redis
│       │   └── socket.ts       # Configuración Socket.io
│       │
│       ├── modules/
│       │   ├── auth/
│       │   │   └── auth.controller.ts
│       │   ├── chat/
│       │   │   └── chat.gateway.ts    # Eventos WebSocket
│       │   └── messages/
│       │       └── message.model.ts
│       │
│       └── shared/
│           ├── presence.ts     # Presencia en vivo
│           └── rate-limit.ts   # Rate limiting
│
└── frontend/
    ├── package.json
    ├── tsconfig.json
    ├── next.config.ts
    ├── .env.example
    │
    └── app/
        ├── layout.tsx
        └── page.tsx
    
    └── src/
        └── lib/
            └── socket.ts       # Cliente Socket.io
```

## 🛠️ Scripts de Desarrollo

### Backend
```bash
npm run dev      # Desarrollo con hot-reload
npm run build    # Compilar TypeScript
npm start        # Correr producción
```

### Frontend
```bash
npm run dev      # Desarrollo en http://localhost:3000
npm run build    # Compilar para producción
npm run start    # Servidor de producción
npm run lint     # Validar código
```

## 📡 Eventos WebSocket Principales

### Cliente → Servidor
- `message:send` - Enviar mensaje
- `typing:start` - Indicador de escritura
- `typing:stop` - Detener indicador
- `user:online` - Usuario conectado
- `user:offline` - Usuario desconectado

### Servidor → Cliente
- `message:new` - Nuevo mensaje recibido
- `users:online` - Lista de usuarios conectados
- `user:typing` - Indicador de escritura
- `presence:update` - Cambio de presencia

## 🔐 Seguridad

- **JWT Authentication** - Validación en Socket.io handshake
- **Rate Limiting** - Prevención de abuso
- **CORS** - Validación de origen
- **Input Validation** - Validación de datos de entrada
- **Environment Variables** - Secretos no hardcodeados

## 📈 Escalabilidad

### Configuración Actual
- ✅ Redis adapter para horizontal scaling
- ✅ Pub/Sub para comunicación entre instancias
- ✅ MongoDB para persistencia
- ✅ Stateless backend

### Para Escalar a Producción

**1. Múltiples Instancias Backend**
```bash
# Con load balancer (nginx, HAProxy)
Backend 1 (4000) \
Backend 2 (4001) ---> Load Balancer ---> Redis Adapter
Backend 3 (4002) /
```

**2. Redis Cluster**
```bash
redis-1:6379
redis-2:6379
redis-3:6379 (con replicación)
```

**3. MongoDB Replica Set**
```bash
mongo-1:27017
mongo-2:27017
mongo-3:27017
```

**4. CDN para Assets**
- Servir archivos estáticos via CloudFront/Cloudflare

**5. Monitoreo y Logging**
- ELK Stack o Datadog
- Prometheus + Grafana para métricas

**6. Container Orchestration**
- Kubernetes para orquestación automática
- Helm charts para deployments

Ver [SCALING.md](./SCALING.md) para una guía completa.

## 🐛 Troubleshooting

### Redis no conecta
```bash
# Verificar si Redis está corriendo
docker ps | grep redis

# Reiniciar servicio
docker-compose restart redis
```

### MongoDB no conecta
```bash
# Verificar logs
docker-compose logs mongo

# Reiniciar servicio
docker-compose restart mongo
```

### WebSocket connection refused
- Verificar que backend está corriendo en puerto 4000
- Verificar CORS en `socket.ts` - debe permitir origin del frontend
- Revisar token JWT está siendo enviado correctamente

### Mensajes no sincronizados entre pestañas
- Asegurar Redis adapter está habilitado
- Verificar Redis está conectado (logs del backend)

## 📚 Documentación Adicional

- [Backend README](./backend/README.md) - Guía específica del backend
- [Frontend README](./frontend/README.md) - Guía específica del frontend
- [SCALING.md](./SCALING.md) - Estrategias de escalabilidad
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Documentación técnica detallada

## 👨‍💻 Desarrollo

### Crear una rama para nuevas features
```bash
git checkout -b feature/nombre-feature
```

### Commit messages
```
feat: Agregar nueva funcionalidad
fix: Corregir bug
docs: Actualizar documentación
refactor: Refactorizar código
```

## � Despliegue (Deployment)

### Producción Rápida

**Frontend (Vercel)**
```bash
npm i -g vercel
cd frontend && vercel --prod
```

**Backend (Heroku)**
```bash
heroku login
heroku create chat-app-prod
git push heroku master
```

### Despliegue Detallado

Para instrucciones completas de despliegue en todos los platforms:
- ✅ Vercel (Frontend)
- ✅ Heroku (Backend)
- ✅ AWS (EC2/ECS/Lambda)
- ✅ GCP (Cloud Run)
- ✅ DigitalOcean
- ✅ Docker Registry
- ✅ Kubernetes

👉 **[Ver DEPLOY.md](DEPLOY.md)** para el paso a paso completo.

## 📊 Release Notes

Última versión: **v1.0.0** (Production Ready)

Cambios principales:
- ✅ Aplicación completa lista para producción
- ✅ 13+ documentos de guía
- ✅ 11+ diagramas de arquitectura
- ✅ Checklist de seguridad (40+ items)
- ✅ Guías de deployment (7+ plataformas)
- ✅ Estrategias de escalabilidad

👉 **[Ver RELEASE_NOTES.md](RELEASE_NOTES.md)** para detalles completos.

## 📄 Licencia

MIT

## 🤝 Contribuciones

Las contribuciones son bienvenidas. Por favor:
1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

👉 **[Ver CONTRIBUTING.md](CONTRIBUTING.md)** para las guías completas de contribución.

---

**¿Preguntas?** Abre un issue en el repositorio o consulta [DOCUMENTATION.md](DOCUMENTATION.md) para más información.
