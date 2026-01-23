# 🔒 Seguridad y Mejores Prácticas

Guía de seguridad y mejores prácticas para desarrollo, deployment y operación.

## 📋 Tabla de Contenidos

- [Seguridad en Desarrollo](#seguridad-en-desarrollo)
- [Seguridad en Producción](#seguridad-en-producción)
- [Autenticación y Autorización](#autenticación-y-autorización)
- [Protección de Datos](#protección-de-datos)
- [Monitoreo y Alertas](#monitoreo-y-alertas)
- [Incidentes y Respuesta](#incidentes-y-respuesta)
- [Checklist de Deployement](#checklist-de-deployment)

---

## 🛡️ Seguridad en Desarrollo

### 1. Secrets Management

**❌ NUNCA hagas esto:**

```typescript
// ❌ DANGEROUS - Never commit secrets!
const JWT_SECRET = "my-super-secret-key";
const MONGODB_URI = "mongodb://user:password@host:27017/db";
const API_KEY = "sk_live_12345678";
```

**✅ HACER esto:**

```typescript
// ✅ CORRECT - Use environment variables
const JWT_SECRET = process.env.JWT_SECRET;
const MONGODB_URI = process.env.MONGODB_URI;
const API_KEY = process.env.API_KEY;

// Validate on startup
if (!JWT_SECRET || !MONGODB_URI) {
  throw new Error("Missing required environment variables");
}
```

### 2. Dependencies Management

**Revisar vulnerabilidades:**

```bash
# Check for vulnerabilities
npm audit

# Fix automatically
npm audit fix

# Fix interactively
npm audit fix --interactive

# Generate report
npm audit --json > audit-report.json
```

**Mantener dependencias actualizadas:**

```bash
# Check for outdated packages
npm outdated

# Update safe updates
npm update

# Update major versions (careful!)
npm install package@latest
```

**Usar pinned versions:**

```json
{
  "dependencies": {
    "express": "4.18.2", // Exact version (good for production)
    "socket.io": "^4.8.3" // Compatible versions (ok)
  },
  "devDependencies": {
    "typescript": "~5.3.0" // Patch updates only (conservative)
  }
}
```

### 3. Input Validation

**Backend - Validación obligatoria:**

```typescript
// ✅ GOOD - Validate all inputs
app.post("/auth/login", (req, res) => {
  const { email, password } = req.body;

  // Type checking
  if (typeof email !== "string" || typeof password !== "string") {
    return res.status(400).json({ error: "Invalid input types" });
  }

  // Empty check
  if (!email.trim() || !password.trim()) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  // Email format
  if (!isValidEmail(email)) {
    return res.status(400).json({ error: "Invalid email format" });
  }

  // Length limits
  if (password.length < 8 || password.length > 128) {
    return res.status(400).json({ error: "Password length invalid" });
  }

  // Process...
});

// ❌ BAD - No validation
app.post("/auth/login", (req, res) => {
  const { email, password } = req.body;
  // Process immediately
});
```

**Frontend - Sanitizar HTML:**

```typescript
// ✅ GOOD - React auto-escapes
<div>{userMessage}</div>

// ✅ GOOD - Sanitize if using dangerouslySetInnerHTML
import DOMPurify from 'dompurify';

<div dangerouslySetInnerHTML={{
  __html: DOMPurify.sanitize(htmlContent)
}} />

// ❌ BAD - XSS vulnerability
<div dangerouslySetInnerHTML={{
  __html: userInput
}} />
```

### 4. Logging Seguro

**✅ DO:**

```typescript
// ✅ Log non-sensitive information
console.log("User login attempt", { userId, timestamp });
console.error("Database connection failed", {
  host,
  port,
  error: error.message,
});

// ✅ Use structured logging
logger.info("Message sent", {
  messageId: msg._id,
  roomId: msg.roomId,
  timestamp: new Date(),
});
```

**❌ DON'T:**

```typescript
// ❌ Never log passwords
console.log("User login", { email, password }); // DANGER!

// ❌ Never log tokens
console.log("Auth token:", token); // DANGER!

// ❌ Never log sensitive data
console.log("User created", { user: userData }); // May contain secrets

// ❌ Don't expose internal errors to clients
res.status(500).json({ error: error.stack });
```

---

## 🔐 Seguridad en Producción

### 1. Environment Configuration

**Production .env checklist:**

```env
# ✅ Change defaults
PORT=4000
NODE_ENV=production

# ✅ Use strong secrets (64+ chars, mixed case, numbers, symbols)
JWT_SECRET=rSc3uVpX9wJmK2nPqLyT4aB6dE8fG0hI1jN5oR7sU9vW3xY6zC
MONGODB_URI=mongodb+srv://user:strong-pass@cluster.mongodb.net/prod

# ✅ Use secure URLs
FRONTEND_ORIGIN=https://chat-app.com
REDIS_URL=rediss://user:pass@redis.example.com:6379

# ✅ Set appropriate timeouts
JWT_EXPIRES_IN=24h
SESSION_TIMEOUT=30m

# ✅ Enable security features
ENABLE_HTTPS=true
ENABLE_CORS=true
ENABLE_HELMET=true
ENABLE_RATE_LIMITING=true
```

### 2. HTTPS/TLS

**Nginx Configuration:**

```nginx
server {
    listen 443 ssl http2;
    server_name api.chat-app.com;

    # SSL Certificates (from Let's Encrypt)
    ssl_certificate /etc/ssl/certs/cert.pem;
    ssl_certificate_key /etc/ssl/private/key.pem;

    # Strong TLS configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    location / {
        proxy_pass http://backend;
    }
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name api.chat-app.com;
    return 301 https://$server_name$request_uri;
}
```

### 3. CORS Configuration

**Express Setup:**

```typescript
import cors from "cors";

const app = express();

// ✅ GOOD - Whitelist specific origins
app.use(
  cors({
    origin: [
      "https://chat-app.com",
      "https://www.chat-app.com",
      process.env.FRONTEND_ORIGIN,
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    maxAge: 86400, // 24 hours
  }),
);

// ❌ BAD - Accept all origins
app.use(cors({ origin: "*" })); // DANGER!
```

### 4. Rate Limiting

**Implementation:**

```typescript
import rateLimit from "express-rate-limit";

// ✅ General API rate limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP",
  standardHeaders: true, // Return rate limit info in the RateLimit-* headers
  legacyHeaders: false, // Disable the X-RateLimit-* headers
  store: new RedisStore({
    client: redisClient,
    prefix: "rl:", // rate limit prefix
  }),
});

// ✅ Stricter for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // Only 5 login attempts
  skipSuccessfulRequests: true,
});

// Apply limiters
app.use("/api/", apiLimiter);
app.post("/auth/login", authLimiter, (req, res) => {
  // ...
});
```

### 5. Security Headers

**Helmet.js:**

```typescript
import helmet from "helmet";

app.use(helmet());

// Configure specific headers
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true,
    },
  }),
);
```

---

## 🔑 Autenticación y Autorización

### 1. JWT Tokens

**Generación segura:**

```typescript
import jwt from "jsonwebtoken";

// ✅ GOOD - Generate with expiration
const token = jwt.sign(
  { userId: user._id, email: user.email },
  process.env.JWT_SECRET!,
  {
    expiresIn: "24h",
    algorithm: "HS256",
    issuer: "chat-app",
    audience: "chat-app-client",
  },
);

// ❌ BAD - No expiration
const badToken = jwt.sign({ userId: user._id }, process.env.JWT_SECRET!);
```

**Validación:**

```typescript
// ✅ GOOD - Validate with options
const decoded = jwt.verify(token, process.env.JWT_SECRET!, {
  algorithms: ["HS256"],
  issuer: "chat-app",
  audience: "chat-app-client",
});

// ❌ BAD - No validation options
const decoded = jwt.verify(token, process.env.JWT_SECRET!);
```

**Refresh Tokens:**

```typescript
// ✅ Implement refresh token rotation
app.post("/auth/refresh", (req, res) => {
  const { refreshToken } = req.body;

  try {
    const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET!);

    // Generate new tokens
    const newAccessToken = generateAccessToken(decoded.userId);
    const newRefreshToken = generateRefreshToken(decoded.userId);

    // Invalidate old refresh token
    await invalidateRefreshToken(refreshToken);

    res.json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    res.status(401).json({ error: "Invalid refresh token" });
  }
});
```

### 2. Password Hashing

**❌ NEVER store plain passwords:**

```typescript
// ❌ DANGER - Plain text password
const user = await User.create({
  email: "user@example.com",
  password: password, // NEVER!
});
```

**✅ Use bcrypt:**

```typescript
import bcrypt from "bcrypt";

// Register
const hashedPassword = await bcrypt.hash(password, 12); // salt rounds
const user = await User.create({
  email: "user@example.com",
  passwordHash: hashedPassword,
});

// Login
const isValid = await bcrypt.compare(inputPassword, user.passwordHash);
if (!isValid) {
  res.status(401).json({ error: "Invalid credentials" });
}
```

### 3. Socket.io Authentication

**Handshake validation:**

```typescript
// ✅ GOOD - Validate JWT on handshake
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;

  if (!token) {
    return next(new Error("Missing authentication token"));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!);
    socket.data.userId = decoded.userId;
    next();
  } catch (error) {
    next(new Error("Invalid token"));
  }
});

// ❌ BAD - No authentication
io.on("connection", (socket) => {
  // Accept any connection
});
```

**Per-event authorization:**

```typescript
socket.on("message:send", async (data) => {
  // Verify user owns this room
  const room = await Room.findById(data.roomId);

  if (!room.participants.includes(socket.data.userId)) {
    socket.emit("error", { message: "Not authorized" });
    return;
  }

  // Process message
});
```

---

## 🛡️ Protección de Datos

### 1. Encryption at Rest

**MongoDB encryption:**

```javascript
// Enable encryption at application level
const cipher = crypto.createCipher("aes-256-cbc", process.env.ENCRYPTION_KEY);
let encrypted = cipher.update(sensitiveData, "utf8", "hex");
encrypted += cipher.final("hex");

// Or use MongoDB native encryption
// https://docs.mongodb.com/manual/core/csfle/
```

### 2. Encryption in Transit

**All communication over HTTPS:**

```env
# ✅ ALWAYS use HTTPS in production
FRONTEND_ORIGIN=https://chat-app.com
BACKEND_URL=https://api.chat-app.com
REDIS_URL=rediss://... (TLS)
MONGODB_URI=mongodb+srv://... (TLS)
```

### 3. Data Retention

**Automatic deletion policies:**

```typescript
// ✅ Delete old messages after 1 year
const thirtyDaysAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
await Message.deleteMany({
  createdAt: { $lt: thirtyDaysAgo },
  isArchived: true,
});

// ✅ Soft delete for data recovery
await Message.updateMany({ _id: messageId }, { deletedAt: new Date() });
```

### 4. PII (Personally Identifiable Information)

**Minimize collection:**

```typescript
// ✅ Only collect necessary data
const user = {
  _id: ObjectId,
  email: String,
  username: String,
  passwordHash: String,
  // DON'T collect: SSN, credit card, address, etc.
};

// ✅ Don't log PII
console.log("User login:", { userId, timestamp }); // Not email/password

// ✅ Mask in responses
const userResponse = {
  _id: user._id,
  username: user.username,
  // NOT email, NOT passwordHash
};
```

---

## 📊 Monitoreo y Alertas

### 1. Logging Centralizado

**ELK Stack Setup:**

```yaml
version: "3.8"
services:
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.0.0
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=false

  kibana:
    image: docker.elastic.co/kibana/kibana:8.0.0
    ports:
      - "5601:5601"

  filebeat:
    image: docker.elastic.co/beats/filebeat:8.0.0
    volumes:
      - ./docker-compose.log:/var/log/app
```

**Structured Logging:**

```typescript
import winston from "winston";

const logger = winston.createLogger({
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: "error.log", level: "error" }),
    new winston.transports.File({ filename: "combined.log" }),
  ],
});

// ✅ Log with context
logger.info("Message sent", {
  messageId: msg._id,
  userId: msg.senderId,
  roomId: msg.roomId,
  timestamp: new Date(),
  duration: endTime - startTime,
});
```

### 2. Alertas

**Prometheus + AlertManager:**

```yaml
# prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: "backend"
    static_configs:
      - targets: ["localhost:4000"]

# alert_rules.yml
groups:
  - name: chat_app
    rules:
      - alert: HighErrorRate
        expr: rate(errors_total[5m]) > 0.05
        annotations:
          summary: "High error rate detected"

      - alert: DatabaseDown
        expr: up{job="mongodb"} == 0
        annotations:
          summary: "MongoDB is down!"

      - alert: HighCPU
        expr: node_cpu_usage > 80
        annotations:
          summary: "High CPU usage"
```

### 3. Métricas Importantes

**Backend:**

```
- http_requests_total
- http_request_duration_seconds
- database_query_duration_seconds
- redis_connection_errors
- websocket_connections_active
- message_queue_size
- authentication_failures
- rate_limit_exceeded
```

**Frontend:**

```
- page_load_time
- socket_connection_time
- api_response_time
- js_errors
- network_errors
- memory_usage
```

---

## 🚨 Incidentes y Respuesta

### 1. Incident Response Plan

**Escalation:**

```
Level 1: Warning (Automated alerts)
  └─> Level 2: On-call engineer
      └─> Level 3: Team lead
          └─> Level 4: CTO
```

**Communication:**

```
1. Detect → 2. Alert → 3. Investigate → 4. Mitigate
              ↓
         Notify stakeholders
              ↓
         Implement fix
              ↓
         Deploy fix
              ↓
         Monitor
              ↓
         Post-mortem
```

### 2. Security Breach Protocol

```
1. ISOLATE - Stop the attack
   - Block malicious IPs
   - Disable compromised accounts
   - Rollback changes

2. INVESTIGATE - Understand the breach
   - Check logs
   - Identify affected data
   - Determine root cause

3. NOTIFY - Tell affected users
   - Email notification
   - In-app notification
   - Public statement

4. FIX - Resolve the issue
   - Patch vulnerability
   - Update security
   - Test thoroughly

5. MONITOR - Prevent recurrence
   - Enhanced monitoring
   - Additional tests
   - Security audit
```

### 3. Disaster Recovery

**Backup Strategy:**

```
- Database backups: Every 6 hours
- Offsite backup: Daily
- Retention: 30 days
- Test restore: Weekly
```

**RTO/RPO Targets:**

```
Recovery Time Objective (RTO): 1 hour
Recovery Point Objective (RPO): 6 hours
```

---

## ✅ Checklist de Deployment

### Pre-Deployment

- [ ] Code review completed
- [ ] All tests pass
- [ ] Security scan passed (npm audit)
- [ ] Environment variables set
- [ ] Database migrations ready
- [ ] Backup created
- [ ] Rollback plan documented
- [ ] Monitoring configured
- [ ] Alerts configured
- [ ] Load testing done

### Deployment

- [ ] Deploy to staging first
- [ ] Run smoke tests
- [ ] Check logs
- [ ] Verify connectivity
- [ ] Run E2E tests
- [ ] Check monitoring
- [ ] Deploy to production
- [ ] Gradual rollout (canary/blue-green)
- [ ] Monitor key metrics
- [ ] Check error rates

### Post-Deployment

- [ ] Verify all services healthy
- [ ] Check database integrity
- [ ] Review logs for errors
- [ ] User testing
- [ ] Performance verification
- [ ] Security verification
- [ ] Document any issues
- [ ] Notify stakeholders

---

## 📚 Recursos

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Checklist](https://nodejs.org/en/docs/guides/security/)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
- [MongoDB Security](https://docs.mongodb.com/manual/security/)
- [Redis Security](https://redis.io/topics/security)

---

**Última actualización**: 2024-01-22
**Versión**: 1.0
