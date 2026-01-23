# 📈 Guía de Escalabilidad

## Introducción

Este documento describe estrategias y arquitecturas para escalar la aplicación de chat desde una instancia única a un sistema distribuido de producción capaz de manejar millones de usuarios concurrentes.

## 📊 Fases de Escalabilidad

### Fase 1: Desarrollo Local (Actual)

**Usuarios: 1-10**

- Single backend instance (Node.js)
- MongoDB local
- Redis local
- ✅ Suficiente para desarrollo y testing

### Fase 2: Staging/Pre-Producción

**Usuarios: 100-1000**

- Backend con mejor separación de concerns
- Autoscaling preparado
- Monitoreo básico
- Backups automatizados

### Fase 3: Producción Pequeña

**Usuarios: 1K-50K**

- 2-3 instancias backend con load balancer
- MongoDB replica set
- Redis standalone optimizado
- CDN para assets
- Logging centralizado

### Fase 4: Producción Media

**Usuarios: 50K-500K**

- 5-10 instancias backend
- Kubernetes para orquestación
- Redis Cluster (sharding)
- MongoDB replica set con sharding
- Message queue (RabbitMQ/Kafka)
- Rate limiting distribuido

### Fase 5: Producción Grande

**Usuarios: 500K+**

- 20+ instancias backend (autoscaling)
- Kubernetes con HPA
- MongoDB sharded cluster
- Redis Cluster multi-región
- Geo-replicación
- Multi-region deployment

---

## 🚀 Estrategias de Escalabilidad

### 1️⃣ Escalabilidad Horizontal - Backend

#### Problema Actual

```
1 Backend Instance = Máximo ~5K usuarios concurrentes
(Limitado por: memoria RAM, CPU cores, conexiones abiertas)
```

#### Solución: Múltiples Instancias con Load Balancer

**Arquitectura**

```
          Frontend (Next.js)
               ↓ HTTP(S)
        ┌──────────────────┐
        │  Load Balancer   │
        │   (nginx/HAProxy)│
        └──┬───┬───────┬───┘
           ↓   ↓       ↓
        ┌──────────────────────┐
        │  Backend Instances   │
        ├─────────┬─────┬─────┤
        │ Node 1  │Node 2│Node3│
        │ :4000   │:4001 │:4002│
        └─────────┼─────┼─────┘
           ↓      ↓     ↓
        ┌──────────────────────┐
        │   Redis Adapter      │
        │  (Socket.io relay)   │
        └──────────┬───────────┘
                   ↓
        ┌──────────────────────┐
        │    Redis Instance    │
        │   (Pub/Sub & Cache)  │
        └──────────────────────┘
```

**Configuración Nginx Load Balancer**

```nginx
# /etc/nginx/sites-available/chat-app

upstream backend {
    least_conn;
    server localhost:4000 weight=1 max_fails=3 fail_timeout=30s;
    server localhost:4001 weight=1 max_fails=3 fail_timeout=30s;
    server localhost:4002 weight=1 max_fails=3 fail_timeout=30s;

    # Health check
    server localhost:4003 backup;
}

server {
    listen 80;
    server_name api.chat-app.com;

    # HTTP → HTTPS redirect
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.chat-app.com;

    ssl_certificate /etc/ssl/certs/cert.pem;
    ssl_certificate_key /etc/ssl/private/key.pem;

    # WebSocket support
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "Upgrade";

    # Buffering
    proxy_buffering off;
    proxy_request_buffering off;

    location / {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 7d;
        proxy_send_timeout 7d;
        proxy_read_timeout 7d;
    }

    # Health check endpoint
    location /health {
        access_log off;
        return 200 "OK\n";
    }
}
```

**Iniciar múltiples instancias**

```bash
# Terminal 1
PORT=4000 npm run dev

# Terminal 2
PORT=4001 npm run dev

# Terminal 3
PORT=4002 npm run dev

# Terminal 4 - Nginx
sudo nginx
```

**Con Docker Compose (Recomendado)**

```yaml
version: "3.8"

services:
  backend-1:
    build: ./backend
    ports:
      - "4000:4000"
    environment:
      PORT: 4000
      REDIS_URL: redis://redis:6379
      MONGODB_URI: mongodb://mongo:27017/chat-db
    depends_on:
      - redis
      - mongo

  backend-2:
    build: ./backend
    ports:
      - "4001:4000"
    environment:
      PORT: 4001
      REDIS_URL: redis://redis:6379
      MONGODB_URI: mongodb://mongo:27017/chat-db
    depends_on:
      - redis
      - mongo

  backend-3:
    build: ./backend
    ports:
      - "4002:4000"
    environment:
      PORT: 4002
      REDIS_URL: redis://redis:6379
      MONGODB_URI: mongodb://mongo:27017/chat-db
    depends_on:
      - redis
      - mongo

  nginx:
    image: nginx:latest
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./certs:/etc/ssl/certs:ro
    depends_on:
      - backend-1
      - backend-2
      - backend-3

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes

  mongo:
    image: mongo:7
    ports:
      - "27017:27017"
    volumes:
      - mongo_data:/data/db

volumes:
  redis_data:
  mongo_data:
```

**Capacidad con Multiple Backends**

```
1 Backend  = ~5K users
3 Backends = ~15K users
10 Backends = ~50K users
```

---

### 2️⃣ Escalabilidad de Redis

#### Problema

```
Redis single instance:
- Máximo: ~100K ops/sec
- Máximo: ~16GB RAM (límite práctico)
- SPOF (Single Point of Failure)
```

#### Solución A: Redis Replication (Alta Disponibilidad)

**Arquitectura Master-Slave**

```
┌──────────────────┐
│  Redis Master    │
│  :6379 (write)   │
└────────┬─────────┘
         │ Replication
         ↓
    ┌─────────────────┐
    │ Redis Slave 1   │ (read-only)
    │ :6380           │
    └─────────────────┘

    ┌─────────────────┐
    │ Redis Slave 2   │ (read-only)
    │ :6381           │
    └─────────────────┘
```

**Configuración Master (redis.conf)**

```conf
# Master configuration
port 6379
bind 0.0.0.0
requirepass your-strong-password
maxmemory 8gb
maxmemory-policy allkeys-lru

# Persistence
save 900 1
save 300 10
save 60 10000
appendonly yes
appendfsync everysec

# Replication
repl-diskless-sync no
repl-diskless-sync-delay 5
```

**Configuración Slaves (redis.conf)**

```conf
# Slave configuration
port 6380
bind 0.0.0.0
requirepass your-strong-password
masterauth your-strong-password
slaveof master-ip 6379
maxmemory 8gb
maxmemory-policy allkeys-lru

# Persistence
save 900 1
save 300 10
save 60 10000
appendonly yes
appendfsync everysec

# Read-only
slave-read-only yes
```

**Failover con Sentinel**

```conf
# sentinel.conf
port 26379
daemonize yes
logfile /var/log/redis/sentinel.log

sentinel monitor mymaster 127.0.0.1 6379 2
sentinel auth-pass mymaster your-strong-password
sentinel down-after-milliseconds mymaster 30000
sentinel parallel-syncs mymaster 1
sentinel failover-timeout mymaster 180000

sentinel deny-scripts-reconfig yes
```

#### Solución B: Redis Cluster (Sharding)

**Arquitectura Cluster**

```
┌─────────────────────────────────────────────────┐
│            Redis Cluster (3 masters, 3 replicas)│
├─────────┬──────────┬──────────┬────────┬───────┤
│Master 1 │Master 2  │Master 3  │Replica1│Rep 2,3│
│:6379    │:6380     │:6381     │        │       │
│Slots:   │Slots:    │Slots:    │        │       │
│0-5460   │5461-10922│10923-16383        │       │
└─────────┴──────────┴──────────┴────────┴───────┘
```

**Docker Compose - Redis Cluster**

```yaml
version: "3.8"

services:
  redis-1:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    command: redis-server --port 6379 --cluster-enabled yes --cluster-config-file nodes-1.conf

  redis-2:
    image: redis:7-alpine
    ports:
      - "6380:6380"
    command: redis-server --port 6380 --cluster-enabled yes --cluster-config-file nodes-2.conf

  redis-3:
    image: redis:7-alpine
    ports:
      - "6381:6381"
    command: redis-server --port 6381 --cluster-enabled yes --cluster-config-file nodes-3.conf

  redis-4:
    image: redis:7-alpine
    ports:
      - "6382:6382"
    command: redis-server --port 6382 --cluster-enabled yes --cluster-config-file nodes-4.conf

  redis-5:
    image: redis:7-alpine
    ports:
      - "6383:6383"
    command: redis-server --port 6383 --cluster-enabled yes --cluster-config-file nodes-5.conf

  redis-6:
    image: redis:7-alpine
    ports:
      - "6384:6384"
    command: redis-server --port 6384 --cluster-enabled yes --cluster-config-file nodes-6.conf
```

**Crear cluster**

```bash
redis-cli --cluster create \
  127.0.0.1:6379 127.0.0.1:6380 127.0.0.1:6381 \
  127.0.0.1:6382 127.0.0.1:6383 127.0.0.1:6384 \
  --cluster-replicas 1
```

**Actualizar Socket.io para Cluster**

```typescript
// backend/src/config/socket.ts
import { createAdapter } from "@socket.io/redis-adapter";
import { createClusterClient } from "redis";

export function setupSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: { origin: FRONTEND_ORIGIN },
  });

  // Redis Cluster client
  const pubClient = createClusterClient({
    rootNodes: [
      { host: "127.0.0.1", port: 6379 },
      { host: "127.0.0.1", port: 6380 },
      { host: "127.0.0.1", port: 6381 },
    ],
  });

  const subClient = pubClient.duplicate();

  Promise.all([pubClient.connect(), subClient.connect()])
    .then(() => {
      io.adapter(createAdapter(pubClient, subClient));
      console.log("✅ Socket.io Redis Cluster adapter connected");
    })
    .catch((error) => console.error("❌ Cluster error:", error));

  // ... resto de configuración
}
```

**Capacidad con Redis Cluster**

```
3 Nodes = ~300K ops/sec
6 Nodes = ~600K ops/sec
9+ Nodes = 1M+ ops/sec
```

---

### 3️⃣ Escalabilidad de MongoDB

#### Problema

```
MongoDB single instance:
- Máximo: ~500K docs/sec
- Storage limitado a un servidor
- Sin distribución geográfica
```

#### Solución A: Replica Set (Alta Disponibilidad)

**Arquitectura**

```
┌──────────────────────────────────────────┐
│     MongoDB Replica Set (3 nodes)        │
├──────────┬────────────┬────────────┤
│ Primary  │ Secondary1 │ Secondary2 │
│ :27017   │ :27018     │ :27019     │
│(write)   │(read-only) │(read-only) │
└──────────┴────────────┴────────────┘
     ↓ Oplog replication
  Automatical failover if primary dies
```

**Docker Compose - MongoDB Replica Set**

```yaml
version: "3.8"

services:
  mongo-1:
    image: mongo:7
    ports:
      - "27017:27017"
    command: mongod --replSet rs0 --bind_ip_all
    volumes:
      - mongo-1-data:/data/db

  mongo-2:
    image: mongo:7
    ports:
      - "27018:27017"
    command: mongod --replSet rs0 --bind_ip_all
    volumes:
      - mongo-2-data:/data/db

  mongo-3:
    image: mongo:7
    ports:
      - "27019:27017"
    command: mongod --replSet rs0 --bind_ip_all
    volumes:
      - mongo-3-data:/data/db

  mongo-init:
    image: mongo:7
    depends_on:
      - mongo-1
      - mongo-2
      - mongo-3
    entrypoint: |
      mongosh --host mongo-1:27017 --eval '
        rs.initiate({
          _id: "rs0",
          members: [
            {_id: 0, host: "mongo-1:27017"},
            {_id: 1, host: "mongo-2:27017"},
            {_id: 2, host: "mongo-3:27017"}
          ]
        })
      '

volumes:
  mongo-1-data:
  mongo-2-data:
  mongo-3-data:
```

**Actualizar conexión en Backend**

```typescript
// backend/src/config/mongo.ts
const mongoUri =
  process.env.MONGODB_URI ||
  "mongodb://mongo-1:27017,mongo-2:27017,mongo-3:27017/chat-db?replicaSet=rs0";

export async function connectMongo() {
  await mongoose.connect(mongoUri, {
    retryWrites: true,
    w: "majority", // Write concern
  });
}
```

#### Solución B: Sharded Cluster (Escala Horizontal)

**Arquitectura**

```
┌────────────────────────────────────────┐
│      MongoDB Sharded Cluster           │
├────────────────────────────────────────┤
│  Config Servers (Replica Set x3)      │
├────────────────────────────────────────┤
│          Shards                        │
├──────────┬──────────┬──────────┤
│Shard 1   │Shard 2   │Shard 3   │
│(RS x3)   │(RS x3)   │(RS x3)   │
└──────────┴──────────┴──────────┘
     ↑
  Mongos Routers (x3)
```

**Estrategia de Sharding**

```typescript
// Shard key: userId para distribuir uniformemente
// Usuarios repartidos entre shards

db.users.createIndex({ _id: "hashed" });
sh.shardCollection("chat-db.users", { _id: "hashed" });

// Messages sharded por userId para localidad
db.messages.createIndex({ userId: "hashed" });
sh.shardCollection("chat-db.messages", { userId: "hashed" });
```

**Capacidad con Sharding**

```
1 Shard = 500K docs/sec
3 Shards = 1.5M docs/sec
5+ Shards = 2.5M+ docs/sec
```

---

### 4️⃣ Asincronismo con Message Queue

#### Problema

```
Operaciones pesadas bloquean WebSocket:
- Procesamiento de imágenes
- Envío de emails
- Búsqueda full-text
- Análisis de datos
```

#### Solución: RabbitMQ / Apache Kafka

**Arquitectura**

```
WebSocket Event
     ↓
Backend procesa
     ↓
Publica a Queue
     ↓
Worker procesa (async)
     ↓
BD actualiza
     ↓
Notifica a cliente
```

**Instalación con Docker**

```yaml
services:
  rabbitmq:
    image: rabbitmq:3-management-alpine
    ports:
      - "5672:5672"
      - "15672:15672"
    environment:
      RABBITMQ_DEFAULT_USER: guest
      RABBITMQ_DEFAULT_PASS: guest
```

**Ejemplo: Procesamiento de imagen asincrónico**

```typescript
// En Socket.io handler
socket.on("image:upload", async (data) => {
  // Guardar metadata
  const message = await Message.create({
    content: "Image",
    imageUrl: null, // Por llenar
    status: "processing",
  });

  // Publicar a queue
  await amqp.channel.assertQueue("image-processing");
  await amqp.channel.sendToQueue(
    "image-processing",
    Buffer.from(
      JSON.stringify({
        messageId: message._id,
        imageData: data,
      }),
    ),
  );

  // Responder inmediatamente al cliente
  socket.emit("image:ack", { messageId: message._id });
});

// Worker separado escucha queue
amqp.channel.consume("image-processing", async (msg) => {
  const { messageId, imageData } = JSON.parse(msg.content);

  // Procesar imagen
  const optimized = await sharp(imageData).compress().toBuffer();
  const url = await uploadToS3(optimized);

  // Actualizar BD
  await Message.updateOne(
    { _id: messageId },
    { imageUrl: url, status: "done" },
  );

  // Notificar a clientes
  io.emit("image:ready", { messageId, url });
});
```

---

### 5️⃣ CDN para Assets Estáticos

#### Problema

```
Servir imágenes/archivos desde backend:
- Ancho de banda costoso
- Latencia alta para usuarios lejanos
- Carga innecesaria en servidores
```

#### Solución: AWS CloudFront / Cloudflare

**Configuración**

```
Frontend    ↘
            → CDN Edge Locations
Backend     ↗ (Cacheado por región)
             ↓
           S3 Bucket (Origin)
```

**Frontend Update**

```typescript
// Usar CDN para imágenes
const imageUrl = new URL(imagePath, process.env.NEXT_PUBLIC_CDN_URL).href;
// https://cdn.chat-app.com/messages/image-123.jpg
```

**Backend Upload**

```typescript
import { S3Client } from "@aws-sdk/client-s3";

const s3 = new S3Client({ region: "us-east-1" });

socket.on("file:upload", async (buffer) => {
  const key = `messages/${Date.now()}-${crypto.randomUUID()}`;

  await s3.send(
    new PutObjectCommand({
      Bucket: "chat-app-uploads",
      Key: key,
      Body: buffer,
      ContentType: "image/jpeg",
    }),
  );

  const cdnUrl = `https://cdn.chat-app.com/${key}`;

  // Guardar mensaje con CDN URL
  await Message.create({
    content: "Image",
    imageUrl: cdnUrl,
  });
});
```

---

### 6️⃣ Kubernetes Deployment

#### Problema

```
Scaling manual:
- No automático
- Deploying lento
- Difícil gestionar recursos
```

#### Solución: Kubernetes + Helm

**Docker Image**

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY backend/package*.json ./
RUN npm ci --only=production

COPY backend/dist ./dist

EXPOSE 4000

CMD ["node", "dist/index.js"]
```

**Kubernetes Deployment**

```yaml
# backend-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: chat-backend
  labels:
    app: chat-backend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: chat-backend
  template:
    metadata:
      labels:
        app: chat-backend
    spec:
      containers:
        - name: backend
          image: your-registry/chat-backend:latest
          ports:
            - containerPort: 4000
          env:
            - name: REDIS_URL
              value: "redis://redis-service:6379"
            - name: MONGODB_URI
              value: "mongodb://mongo-service:27017/chat-db?replicaSet=rs0"
          resources:
            requests:
              memory: "256Mi"
              cpu: "250m"
            limits:
              memory: "512Mi"
              cpu: "500m"
          livenessProbe:
            httpGet:
              path: /health
              port: 4000
            initialDelaySeconds: 30
            periodSeconds: 10
---
apiVersion: v1
kind: Service
metadata:
  name: chat-backend-service
spec:
  selector:
    app: chat-backend
  ports:
    - protocol: TCP
      port: 80
      targetPort: 4000
  type: LoadBalancer
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: chat-backend-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: chat-backend
  minReplicas: 3
  maxReplicas: 20
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
```

**Desplegar**

```bash
kubectl apply -f backend-deployment.yaml
kubectl apply -f redis-deployment.yaml
kubectl apply -f mongo-deployment.yaml

# Ver estado
kubectl get pods
kubectl logs deployment/chat-backend
kubectl describe svc chat-backend-service
```

---

## 🔍 Monitoreo y Observabilidad

### Prometheus + Grafana

**Docker Compose**

```yaml
prometheus:
  image: prom/prometheus
  ports:
    - "9090:9090"
  volumes:
    - ./prometheus.yml:/etc/prometheus/prometheus.yml

grafana:
  image: grafana/grafana
  ports:
    - "3000:3000"
  environment:
    GF_SECURITY_ADMIN_PASSWORD: admin
```

**Métricas importantes**

```
- Backend CPU usage
- Backend memory usage
- Redis memory usage
- MongoDB operation latency
- WebSocket connection count
- Message throughput (msgs/sec)
- User count online
- Error rate
```

---

## 💰 Estimación de Costos

### Fase 3: 10K usuarios concurrentes

```
AWS:
- 3x t3.medium (backend):      ~$150/mes
- RDS MongoDB (db.t3.large):   ~$200/mes
- ElastiCache Redis:           ~$100/mes
- CloudFront (1TB/mes):        ~$100/mes
- RDS Backup + Storage:        ~$50/mes
                    Total: ~$600/mes
```

### Fase 4: 100K usuarios concurrentes

```
AWS:
- 10x c5.large (backend):      ~$600/mes
- RDS MongoDB (db.r5.xlarge):  ~$800/mes
- ElastiCache Redis Cluster:   ~$300/mes
- CloudFront (10TB/mes):       ~$800/mes
- RDS Backup + Storage:        ~$200/mes
- ALB Load Balancer:           ~$20/mes
                    Total: ~$2.7K/mes
```

---

## 🎯 Resumen: Roadmap de Escalabilidad

| Fase        | Usuarios | Backend | BD                   | Redis   | DevOps            |
| ----------- | -------- | ------- | -------------------- | ------- | ----------------- |
| **Dev**     | 1-10     | 1       | Single               | Single  | Local             |
| **Staging** | 100-1K   | 1       | Single               | Single  | Docker            |
| **Prod S**  | 1K-50K   | 3-5     | Replica Set          | Single  | Nginx + Docker    |
| **Prod M**  | 50K-500K | 10+     | Sharded              | Cluster | Kubernetes        |
| **Prod L**  | 500K+    | 20+     | Sharded Multi-region | Cluster | Kubernetes Global |

---

**Próximos pasos:**

1. Implementar health checks
2. Agregar logging centralizado (ELK)
3. Automatizar deployments (CI/CD)
4. Performance testing
5. Security audit
