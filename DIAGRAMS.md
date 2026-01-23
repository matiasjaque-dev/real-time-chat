# 📊 Diagrama de Arquitectura - Versión Detallada

## 1. Arquitectura General del Sistema

```mermaid
graph TB
    subgraph Clients["🖥️ Clientes (Next.js)"]
        WEB["Web Browser"]
        MOBILE["Mobile App"]
    end

    subgraph CDN["🌍 CDN Layer"]
        CF["CloudFront/Cloudflare"]
    end

    subgraph LB["⚖️ Load Balancer"]
        NGINX["Nginx/HAProxy"]
    end

    subgraph Backend["🚀 Backend Cluster (Node.js)"]
        B1["Backend 1:4000"]
        B2["Backend 2:4001"]
        B3["Backend 3:4002"]
    end

    subgraph Cache["💾 Cache & Messaging"]
        RC["Redis Cluster<br/>6379,6380,6381"]
        RA["Socket.io<br/>Redis Adapter"]
    end

    subgraph Database["🗄️ Persistencia"]
        MRS["MongoDB<br/>Replica Set"]
        BU["Backup Cloud"]
    end

    subgraph Monitor["📊 Monitoreo"]
        PROM["Prometheus"]
        GRAF["Grafana"]
        ELK["ELK Stack"]
    end

    Clients -->|HTTPS| CDN
    CDN -->|Assets| CF
    CF -->|API Calls| LB

    LB -->|distribute| B1
    LB -->|distribute| B2
    LB -->|distribute| B3

    B1 -->|pub/sub| RA
    B2 -->|pub/sub| RA
    B3 -->|pub/sub| RA

    RA -->|Redis| RC
    RC -->|data| MRS

    B1 -->|metrics| PROM
    B2 -->|metrics| PROM
    B3 -->|metrics| PROM

    PROM -->|display| GRAF
    B1 -->|logs| ELK
    B2 -->|logs| ELK
    B3 -->|logs| ELK

    MRS -->|backup| BU

    style Clients fill:#61dafb,stroke:#333,stroke-width:2px,color:#000
    style Backend fill:#68a063,stroke:#333,stroke-width:2px,color:#fff
    style Cache fill:#ff6b6b,stroke:#333,stroke-width:2px,color:#fff
    style Database fill:#13aa52,stroke:#333,stroke-width:2px,color:#fff
    style Monitor fill:#ffd43b,stroke:#333,stroke-width:2px,color:#000
```

---

## 2. Flujo WebSocket (Real-Time)

```mermaid
sequenceDiagram
    autonumber
    participant User as 👤 Usuario A
    participant Frontend as 💻 Frontend
    participant WS as 📡 WebSocket<br/>Socket.io
    participant Backend as 🚀 Backend
    participant Redis as 🔴 Redis
    participant MongoDB as 🍃 MongoDB
    participant Other as 👥 Otros Usuarios

    User->>Frontend: Escribe mensaje
    Frontend->>WS: emit('message:send')
    WS->>Backend: Handshake JWT
    Backend->>Backend: Validar JWT + Rate Limit
    Backend->>MongoDB: Guardar mensaje
    MongoDB-->>Backend: ✓ Guardado
    Backend->>Redis: Publicar evento
    Redis->>WS: Distribuir por adapter
    WS->>Frontend: emit('message:ack')
    WS->>Other: emit('message:new')
    Other-->>User: ✓ Mensaje entregado
```

---

## 3. Ciclo de Vida de Conexión

```mermaid
stateDiagram-v2
    [*] --> Disconnected

    Disconnected --> Connecting: socket.connect()

    Connecting --> Authenticating: TCP connection
    Authenticating --> Connected: JWT válido
    Authenticating --> AuthError: Token inválido
    AuthError --> Disconnected: Reconectar

    Connected --> Idle: Esperar evento
    Idle --> Message: Usuario envía msg
    Message --> Idle: Mensaje procesado

    Idle --> Typing: Usuario escribe
    Typing --> Idle: Deja de escribir

    Idle --> Disconnecting: Usuario cierra app<br/>o se desconecta
    Disconnecting --> Disconnected: Socket cerrado

    Idle --> ReconnectDelay: Error temporal
    ReconnectDelay --> Connecting: Reintento (backoff)

    note right of Connected
        Estado activo:
        - Escuchando eventos
        - Emitiendo eventos
        - Redis conectado
        - Presente en DB
    end

    note right of Disconnected
        Estado inactivo:
        - Token NO guardado en memoria
        - Sesión limpiada
        - Conexión cerrada
    end
```

---

## 4. Estructura de Datos - MongoDB Collections

```mermaid
graph LR
    subgraph Users["👥 users"]
        U["_id<br/>email: indexed<br/>username: indexed<br/>passwordHash<br/>status<br/>lastSeen<br/>avatar<br/>createdAt"]
    end

    subgraph Messages["💬 messages"]
        M["_id<br/>roomId: indexed<br/>senderId: indexed<br/>content<br/>attachments<br/>reactions<br/>createdAt: indexed<br/>updatedAt"]
    end

    subgraph Rooms["🏠 rooms"]
        R["_id<br/>name<br/>type: direct|group<br/>participants: [userId]<br/>admin<br/>settings<br/>createdAt"]
    end

    Users -->|many| Messages
    Users -->|many| Rooms
    Rooms -->|many| Messages

    style Users fill:#74b9ff,stroke:#333,stroke-width:2px
    style Messages fill:#a29bfe,stroke:#333,stroke-width:2px
    style Rooms fill:#fab1a0,stroke:#333,stroke-width:2px
```

---

## 5. Redis Key Structure

```
┌─ Sesiones ─────────────────┐
│ user:{userId}:token        │  → JWT token (TTL: 24h)
│ user:{userId}:socket_id    │  → ID de conexión actual
│ user:{userId}:online       │  → true | false
│ user:{userId}:last_seen    │  → timestamp
└────────────────────────────┘

┌─ Presencia ─────────────────┐
│ online_users               │  → Set[userId]
│ presence:{userId}          │  → { status, timestamp }
└────────────────────────────┘

┌─ Rate Limiting ─────────────┐
│ ratelimit:{userId}         │  → count (TTL: 60s)
│ ratelimit:{ipAddress}      │  → count (TTL: 60s)
└────────────────────────────┘

┌─ Caché ─────────────────────┐
│ messages:{roomId}:recent   │  → [msg] (TTL: 1h)
│ user:{userId}:data         │  → { name, avatar } (TTL: 30m)
└────────────────────────────┘

┌─ Pub/Sub Channels ──────────┐
│ room:{roomId}:messages     │  → Nueva publicación
│ user:{userId}:notify       │  → Notificaciones
│ presence:updates           │  → Cambios online/offline
└────────────────────────────┘
```

---

## 6. Request/Response Cycle (REST)

```mermaid
graph LR
    Client["Client<br/>Frontend"]

    Client -->|POST /auth/login| BE1["Backend<br/>Express"]
    BE1 -->|Validate| DB["MongoDB<br/>Find User"]
    DB -->|User data| BE1
    BE1 -->|Hash verify| BE1
    BE1 -->|Generate JWT| BE1
    BE1 -->|200 OK| Client
    Client -->|Token| Storage["localStorage"]

    Client -->|GET /messages?roomId=...| BE2["Backend<br/>Express"]
    BE2 -->|Validate JWT| BE2
    BE2 -->|Check cache| Redis["Redis<br/>Cache"]
    Redis -->|Hit/Miss| BE2
    BE2 -->|Find messages| DB
    DB -->|Return docs| BE2
    BE2 -->|Cache result| Redis
    BE2 -->|200 OK| Client

    style Client fill:#61dafb,stroke:#333,stroke-width:2px,color:#000
    style BE1 fill:#68a063,stroke:#333,stroke-width:2px,color:#fff
    style BE2 fill:#68a063,stroke:#333,stroke-width:2px,color:#fff
    style Redis fill:#ff6b6b,stroke:#333,stroke-width:2px,color:#fff
    style DB fill:#13aa52,stroke:#333,stroke-width:2px,color:#fff
    style Storage fill:#ffd43b,stroke:#333,stroke-width:2px,color:#000
```

---

## 7. Escalabilidad - Distribución de Carga

```mermaid
graph TB
    DNS["🌐 DNS<br/>chat-app.com"]

    LB["⚖️ Load Balancer<br/>Nginx Round Robin"]

    subgraph Zone1["🏢 Zona 1 (us-east-1)"]
        B1["Backend 1<br/>:4000"]
        B2["Backend 2<br/>:4001"]
    end

    subgraph Zone2["🏢 Zona 2 (eu-west-1)"]
        B3["Backend 3<br/>:4000"]
        B4["Backend 4<br/>:4000"]
    end

    subgraph Shared["📊 Compartido"]
        Redis["Redis Cluster<br/>3 masters + 3 replicas"]
        Mongo["MongoDB Cluster<br/>Shard 1, 2, 3"]
    end

    DNS -->|api.chat-app.com| LB
    LB -->|sticky session| B1
    LB -->|sticky session| B2
    LB -->|sticky session| B3
    LB -->|sticky session| B4

    B1 -->|pub/sub| Redis
    B2 -->|pub/sub| Redis
    B3 -->|pub/sub| Redis
    B4 -->|pub/sub| Redis

    B1 -->|read/write| Mongo
    B2 -->|read/write| Mongo
    B3 -->|read/write| Mongo
    B4 -->|read/write| Mongo

    style DNS fill:#61dafb,stroke:#333,stroke-width:2px,color:#000
    style LB fill:#fd79a8,stroke:#333,stroke-width:2px,color:#fff
    style Zone1 fill:#74b9ff,stroke:#333,stroke-width:2px,color:#000
    style Zone2 fill:#74b9ff,stroke:#333,stroke-width:2px,color:#000
    style Shared fill:#55efc4,stroke:#333,stroke-width:2px,color:#000
```

---

## 8. Arquitectura Kubernetes

```mermaid
graph TB
    subgraph K8S["Kubernetes Cluster"]
        subgraph NS["Namespace: chat"]
            subgraph Pods["🐳 Pods"]
                P1["Backend Pod 1"]
                P2["Backend Pod 2"]
                P3["Backend Pod 3"]
            end

            subgraph Services["🔌 Services"]
                SVC["chat-backend-svc<br/>LoadBalancer"]
                ING["Ingress<br/>chat-app.com"]
            end

            subgraph ConfigMaps["⚙️ Configuración"]
                ENV["app-config"]
                REDIS["redis-config"]
            end
        end

        subgraph Infra["🛠️ Infraestructura"]
            PV["PersistentVolumes"]
            ETCD["etcd<br/>State Store"]
            KUBELET["Kubelet<br/>Node Manager"]
        end
    end

    User["👤 Usuario"]
    DNS["🌐 DNS"]

    User -->|https| DNS
    DNS -->|resolves| ING
    ING -->|routes| SVC
    SVC -->|load-balance| P1
    SVC -->|load-balance| P2
    SVC -->|load-balance| P3

    P1 -->|config| ENV
    P2 -->|config| ENV
    P3 -->|config| ENV

    P1 -->|redis config| REDIS
    P2 -->|redis config| REDIS
    P3 -->|redis config| REDIS

    ETCD -->|manages| Pods
    KUBELET -->|creates| Pods
    PV -->|storage| Pods

    style K8S fill:#326ce5,stroke:#333,stroke-width:3px,color:#fff
    style Pods fill:#74b9ff,stroke:#333,stroke-width:2px,color:#000
    style Services fill:#a29bfe,stroke:#333,stroke-width:2px,color:#000
    style Infra fill:#55efc4,stroke:#333,stroke-width:2px,color:#000
```

---

## 9. CI/CD Pipeline

```mermaid
graph LR
    DEV["👨‍💻 Developer<br/>Commit Code"]
    GIT["📦 Git<br/>Repository"]
    CI["🔄 CI/CD<br/>GitHub Actions"]

    TEST["✅ Tests<br/>Unit & E2E"]
    BUILD["🔨 Build<br/>Docker Image"]
    PUSH["📤 Push<br/>Registry"]

    STAGE["🎭 Staging<br/>Deploy"]
    PROD["🚀 Production<br/>Deploy"]

    MONITOR["📊 Monitor<br/>Prometheus/Grafana"]

    DEV -->|git push| GIT
    GIT -->|webhook| CI
    CI -->|run tests| TEST
    TEST -->|success| BUILD
    BUILD -->|docker build| PUSH
    PUSH -->|image ready| STAGE
    STAGE -->|manual approve| PROD
    PROD -->|running| MONITOR

    style DEV fill:#61dafb,stroke:#333,stroke-width:2px,color:#000
    style GIT fill:#fd79a8,stroke:#333,stroke-width:2px,color:#fff
    style CI fill:#fdcb6e,stroke:#333,stroke-width:2px,color:#000
    style TEST fill:#00b894,stroke:#333,stroke-width:2px,color:#fff
    style BUILD fill:#0984e3,stroke:#333,stroke-width:2px,color:#fff
    style PUSH fill:#6c5ce7,stroke:#333,stroke-width:2px,color:#fff
    style STAGE fill:#fdcb6e,stroke:#333,stroke-width:2px,color:#000
    style PROD fill:#d63031,stroke:#333,stroke-width:2px,color:#fff
    style MONITOR fill:#00b894,stroke:#333,stroke-width:2px,color:#fff
```

---

## 10. Matriz de Tecnologías

| Capa              | Tecnología        | Función                 | Alternativas                    |
| ----------------- | ----------------- | ----------------------- | ------------------------------- |
| **Frontend**      | Next.js 16        | UI Framework            | React, Vue, Svelte              |
| **Frontend**      | Tailwind CSS      | Styling                 | Bootstrap, Material-UI          |
| **Frontend**      | Socket.io Client  | WebSocket Client        | ws, reconnecting-websocket      |
| **Backend**       | Node.js + Express | HTTP Server             | Python/FastAPI, Go, Java/Spring |
| **Backend**       | TypeScript        | Type Safety             | JavaScript, Go                  |
| **Backend**       | Socket.io         | WebSocket Server        | ws, Fastify-websocket           |
| **Auth**          | JWT               | Token Auth              | OAuth2, Session-based           |
| **Auth**          | bcrypt            | Password Hashing        | argon2, scrypt                  |
| **Cache**         | Redis             | Cache/PubSub            | Memcached, RabbitMQ             |
| **Database**      | MongoDB           | NoSQL DB                | PostgreSQL, MySQL, Cassandra    |
| **Queue**         | RabbitMQ          | Message Queue           | Kafka, AWS SQS                  |
| **Container**     | Docker            | Containerization        | Podman, containerd              |
| **Orchestration** | Kubernetes        | Container Orchestration | Docker Swarm, Nomad             |
| **CI/CD**         | GitHub Actions    | Automation              | GitLab CI, Jenkins              |
| **Monitoring**    | Prometheus        | Metrics                 | Datadog, New Relic              |
| **Logging**       | ELK Stack         | Logs                    | Splunk, Cloudwatch              |

---

## 11. Roadmap de Desarrollo

```mermaid
timeline
    title Roadmap - Real-Time Chat

    section Mes 1: MVP
        Semana 1: Auth básica
        Semana 2: Chat en tiempo real
        Semana 3: Presencia online
        Semana 4: Deploy inicial

    section Mes 2: Features
        Semana 5: Historial mensajes
        Semana 6: Múltiples salas
        Semana 7: Notificaciones
        Semana 8: Mobile responsive

    section Mes 3: Escalabilidad
        Semana 9: Redis Cluster
        Semana 10: Kubernetes deployment
        Semana 11: CDN setup
        Semana 12: Load testing

    section Mes 4: Production
        Semana 13: Monitoreo
        Semana 14: Seguridad audit
        Semana 15: Performance tuning
        Semana 16: Launch!
```

---

## 📌 Resumen

**Características Clave:**

- ✅ Real-time WebSocket communication
- ✅ Escalabilidad horizontal
- ✅ High availability con replicación
- ✅ Caching distribuido
- ✅ Message queue para async tasks
- ✅ Kubernetes-ready
- ✅ CI/CD automated
- ✅ Monitoreo completo

**Capacidad:**

- **Fase actual**: 1-100 usuarios
- **Producción pequeña**: 1K-50K usuarios
- **Producción media**: 50K-500K usuarios
- **Producción grande**: 500K+ usuarios (con escalabilidad continua)

Ver [SCALING.md](./SCALING.md) para detalles completos de escalabilidad.
