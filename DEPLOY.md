# DEPLOY.md - Guía de Despliegue Completo

> **Status**: 🚀 Production Ready  
> **Version**: 1.0.0  
> **Last Updated**: 2026-01-25

---

## 📋 Tabla de Contenidos

1. [Pre-requisitos](#pre-requisitos)
2. [Local Development](#local-development)
3. [Staging Environment](#staging-environment)
4. [Production Deployment](#production-deployment)
5. [Deployment by Platform](#deployment-by-platform)
6. [Post-Deployment](#post-deployment)
7. [Rollback](#rollback)
8. [Monitoring](#monitoring)

---

## Pre-requisitos

### Herramientas Requeridas

- Git
- Node.js 18+ (verificar con `node --version`)
- Docker & Docker Compose
- npm o yarn

### Cuentas Necesarias

- GitHub (para código)
- MongoDB Atlas o server MongoDB
- Redis (cloud o self-hosted)
- Platform de hosting (Vercel, Heroku, AWS, etc.)

### Variables de Entorno

Crear `.env` basado en `.env.example`:

```bash
# Backend
cp backend/.env.example backend/.env
# Frontend
cp frontend/.env.example frontend/.env
```

---

## Local Development

### Setup Inicial

```bash
# 1. Clonar repositorio
git clone <repo-url>
cd real-time-chat

# 2. Instalar dependencias
cd backend
npm install
cd ../frontend
npm install

# 3. Configurar variables de entorno
cp .env.example .env
# Editar .env con valores locales

# 4. Iniciar Docker Compose (MongoDB + Redis)
docker-compose up -d

# 5. Iniciar servicios
cd backend
npm run dev

# En otra terminal
cd frontend
npm run dev
```

### Verificar en Local

- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- MongoDB: localhost:27017
- Redis: localhost:6379

---

## Staging Environment

### Propósito

- Probar en entorno similar a producción
- Validar todas las integraciones
- Hacer performance testing
- Verificar security

### Setup

```bash
# 1. Crear rama staging
git checkout -b staging
git push origin staging

# 2. Desplegar en plataforma staging
# Ver "Deployment by Platform" abajo

# 3. Correr test suite
npm run test
npm run lint

# 4. Performance testing
npm run build
npm run analyze

# 5. Security scanning
npm audit
npm audit fix
```

### Checklist Pre-Production

- [ ] Todos los tests pasando
- [ ] No hay eslint errors
- [ ] Build exitoso sin warnings
- [ ] Variables de entorno correctas
- [ ] Database migraciones hechas
- [ ] Logs funcionando
- [ ] Monitoring configurado
- [ ] Backups habilitados
- [ ] SSL/TLS funcionando
- [ ] Rate limiting testado

---

## Production Deployment

### Pre-Deployment Checklist

```bash
# 1. Verificar que master está limpio
git status  # debe ser "clean"

# 2. Actualizar versión
npm version patch  # o minor/major

# 3. Crear tag
git tag v1.0.0
git push origin master --tags

# 4. Crear release notes
# Basado en commits desde último tag

# 5. Verificar seguridad
npm audit
npm audit fix --audit-level=moderate

# 6. Verificar dependencias
npm outdated  # para updates disponibles

# 7. Build para producción
npm run build

# 8. Test build
npm start  # verificar que funciona
```

### Deployment Steps

**Option 1: Blue-Green Deployment (Recomendado)**

```bash
# 1. Desplegar nuevo version (Green)
./deploy-green.sh

# 2. Run smoke tests en Green
npm run test:smoke

# 3. Switch traffic Blue → Green
./switch-traffic.sh

# 4. Monitor Green por 5-10 min
# Si todo OK, se puede destruir Blue

# 5. Si hay problema, revert
./switch-traffic-back.sh
```

**Option 2: Rolling Deployment**

```bash
# Desplegar instancia por instancia
# 1. Actualizar instance 1
# 2. Health check
# 3. Actualizar instance 2
# 4. Health check
# ... repeat para todas las instancias
```

---

## Deployment by Platform

### 1️⃣ Vercel (Frontend Recomendado)

```bash
# 1. Install Vercel CLI
npm i -g vercel

# 2. Deploy frontend
cd frontend
vercel --prod

# 3. Configurar environment variables
# En Vercel Dashboard → Settings → Environment Variables

# 4. Verificar
# El deployment URL se mostrará en terminal
```

**Configuración en Vercel:**

```env
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
NEXT_PUBLIC_WS_URL=wss://api.yourdomain.com
```

### 2️⃣ Heroku (Backend Opción 1)

```bash
# 1. Install Heroku CLI
# https://devcenter.heroku.com/articles/heroku-cli

# 2. Login
heroku login

# 3. Create app
heroku create chat-app-prod

# 4. Add addons
heroku addons:create mongolab:sandbox
heroku addons:create heroku-redis:premium-0

# 5. Set environment variables
heroku config:set JWT_SECRET=your_secret
heroku config:set NODE_ENV=production

# 6. Deploy
git push heroku master

# 7. Verificar logs
heroku logs --tail

# 8. Check dyno
heroku ps:scale web=2
```

### 3️⃣ AWS (Backend Opción 2)

**Opción A: EC2 + PM2**

```bash
# 1. SSH al servidor
ssh -i key.pem ubuntu@ec2-xxx.xxx.xxx.xxx

# 2. Clone repo
git clone <repo>
cd real-time-chat/backend

# 3. Install dependencies
npm install --production

# 4. Start with PM2
npm install -g pm2
pm2 start npm --name "chat-api" -- start
pm2 startup
pm2 save

# 5. Nginx reverse proxy
sudo nano /etc/nginx/sites-available/default
# Configurar para proxy a localhost:3001

sudo systemctl restart nginx
```

**Opción B: ECS (Fargate)**

```bash
# 1. Build Docker image
docker build -t chat-api:1.0.0 .

# 2. Push a ECR
aws ecr get-login-password | docker login --username AWS --password-stdin <account>.dkr.ecr.<region>.amazonaws.com
docker tag chat-api:1.0.0 <account>.dkr.ecr.<region>.amazonaws.com/chat-api:1.0.0
docker push <account>.dkr.ecr.<region>.amazonaws.com/chat-api:1.0.0

# 3. Deploy con Terraform o CloudFormation
terraform apply
```

### 4️⃣ GCP (Backend Opción 3)

**Cloud Run:**

```bash
# 1. Build image
gcloud builds submit --tag gcr.io/PROJECT_ID/chat-api

# 2. Deploy
gcloud run deploy chat-api \
  --image gcr.io/PROJECT_ID/chat-api \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated

# 3. Set environment variables
gcloud run services update chat-api \
  --update-env-vars MONGODB_URI=<uri>,REDIS_URL=<url>
```

### 5️⃣ DigitalOcean (Backend Opción 4)

```bash
# 1. SSH al droplet
ssh root@<your-droplet-ip>

# 2. Setup (como AWS EC2)
curl -sL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 3. Deploy usando App Platform
# Conectar GitHub repo en DigitalOcean Dashboard
# Auto-deploys en cada push a master
```

### 6️⃣ Docker Registry

```bash
# 1. Build images
docker build -t myrepo/chat-api:1.0.0 ./backend
docker build -t myrepo/chat-frontend:1.0.0 ./frontend

# 2. Push a registry
docker login
docker push myrepo/chat-api:1.0.0
docker push myrepo/chat-frontend:1.0.0

# 3. Pull y correr
docker run -e MONGODB_URI=<uri> myrepo/chat-api:1.0.0
```

### 7️⃣ Kubernetes

```bash
# 1. Crear namespace
kubectl create namespace chat-app

# 2. Apply configs (ver ARCHITECTURE.md para manifests)
kubectl apply -f k8s/ -n chat-app

# 3. Verificar deployment
kubectl get pods -n chat-app
kubectl logs -f deployment/chat-api -n chat-app

# 4. Setup ingress
kubectl apply -f k8s/ingress.yaml

# 5. Auto-scaling
kubectl autoscale deployment chat-api --min=2 --max=10
```

---

## Post-Deployment

### Verificaciones Inmediatas (0-5 min)

```bash
# 1. Health check
curl https://api.yourdomain.com/health

# 2. Check logs
# Platform-specific: heroku logs, gcloud logging, etc.

# 3. Verificar endpoints
curl -X POST https://api.yourdomain.com/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test123"}'

# 4. WebSocket connection
# Abrir frontend en navegador, verificar console
```

### Verificaciones 5-30 min

```bash
# 1. Monitor errores
# Check error tracking (Sentry, etc.)

# 2. Performance metrics
# Check database connection
# Check Redis connection
# Check memory usage

# 3. Verificar funcionalidad core
# Login/Register
# Send message
# Online status
# Message persistence
```

### Verificaciones 30 min - 1 hora

```bash
# 1. Load testing
ab -n 1000 -c 100 https://api.yourdomain.com/health

# 2. Check database backups
# Verificar que backups están corriendo

# 3. Verify monitoring alerts
# Test que alertas se envían correctamente

# 4. Run full test suite
npm run test:e2e
```

### Post-Deploy Communication

```bash
# 1. Notificar al equipo
# Slack: "@channel v1.0.0 deployed to production"

# 2. Update status page
# https://status.yourdomain.com

# 3. Monitor for 24 hours
# Estar disponible para hotfixes rápidos
```

---

## Rollback

### Quick Rollback (Si algo sale mal)

```bash
# Opción 1: Revert último commit
git revert HEAD
git push origin master

# Opción 2: Deploy versión anterior
heroku rollback  # Heroku
vercel --prod --target production  # Vercel

# Opción 3: Docker - deploy versión anterior
docker run -d -p 3001:3001 myrepo/chat-api:0.9.0

# Opción 4: Kubernetes
kubectl rollout undo deployment/chat-api -n chat-app

# Opción 5: Blue-Green (más seguro)
./switch-traffic-back.sh
```

### Post-Rollback

```bash
# 1. Verificar que todo funciona
curl https://api.yourdomain.com/health

# 2. Investigar el error
# Review logs
# Run debugging

# 3. Fix issue en develop branch
git checkout develop
# fix bug...
git commit -m "fix: issue that caused rollback"

# 4. Re-deploy cuando esté ready
```

---

## Monitoring

### Setup Monitoring Stack

**Option 1: ELK Stack (Self-hosted)**

```yaml
# docker-compose.yml
elasticsearch:
  image: docker.elastic.co/elasticsearch/elasticsearch:7.12.0

kibana:
  image: docker.elastic.co/kibana/kibana:7.12.0

logstash:
  image: docker.elastic.co/logstash/logstash:7.12.0
```

**Option 2: Managed Services**

- Datadog: `npm install dd-trace`
- New Relic: `npm install newrelic`
- Sentry: `npm install @sentry/node`
- CloudWatch: AWS native

### Key Metrics to Monitor

```bash
# Backend
- Request latency (P50, P95, P99)
- Error rate (>1% = alert)
- Database connection pool
- Redis memory usage
- CPU usage (>80% = scale up)
- Memory usage (>85% = alert)

# Frontend
- Page load time (<3s ideal)
- Lighthouse score (>90 ideal)
- Error rate
- WebSocket connection stability

# Database
- Query latency
- Replication lag
- Disk space (>80% = alert)

# Redis
- Memory usage
- Evictions (should be 0)
- Connected clients
```

### Alert Thresholds

```
HIGH ERROR RATE: > 5% → immediate alert
HIGH LATENCY: P95 > 500ms → warning
HIGH CPU: > 80% → warning
HIGH MEMORY: > 85% → alert
DATABASE DOWN: → immediate alert
REDIS DOWN: → immediate alert
```

---

## Emergency Procedures

### Database Down

```bash
# 1. Alert team immediately
# 2. Switch to backup database
# 3. Restore from last backup
# 4. Verify data integrity
# 5. Resume normal operations
```

### Redis Down

```bash
# 1. Alert team
# 2. Restart Redis
# 3. If corrupted: restore from AOF/RDB
# 4. Clear cache if needed (users will notice slight slowdown)
# 5. Monitor for recovery
```

### DDoS Attack

```bash
# 1. Enable CloudFlare/DDoS protection
# 2. Rate limit aggressively
# 3. IP whitelist if needed
# 4. Scale up horizontally
# 5. Contact hosting provider
```

### Data Breach

```bash
# 1. Take site down immediately
# 2. Investigate
# 3. Notify affected users
# 4. Reset sessions
# 5. Update security practices
# 6. Deploy fix
# 7. Go live with enhancements
```

---

## Maintenance Schedule

### Daily

- [ ] Check error logs
- [ ] Verify backups completed
- [ ] Monitor system resources

### Weekly

- [ ] Review performance metrics
- [ ] Check for security updates
- [ ] Update dependencies if needed

### Monthly

- [ ] Full system audit
- [ ] Update documentation
- [ ] Review and update runbooks

### Quarterly

- [ ] Disaster recovery drill
- [ ] Security assessment
- [ ] Capacity planning

---

## Useful Commands

```bash
# View logs
tail -f /var/log/chat-app.log

# Check service status
systemctl status chat-app
pm2 status
docker ps

# Restart service
systemctl restart chat-app
pm2 restart chat-api
docker restart container_name

# Database backup
mongodump --uri "mongodb://..." --out ./backup
redis-cli BGSAVE

# Check SSL certificate
openssl s_client -connect api.yourdomain.com:443

# Performance check
curl -w "@curl-format.txt" https://api.yourdomain.com/health
```

---

## Support & Escalation

**For Issues:**

1. Check monitoring dashboard first
2. Review error logs
3. Check [SECURITY.md](SECURITY.md) for security issues
4. Contact DevOps team for infrastructure
5. Escalate to on-call engineer if critical

**Critical Issues:** 🚨

- Page completely down
- Data being corrupted
- Security breach
- Rate limit attack

**Action:** Immediate rollback or emergency fix

---

**Deployment Completed Successfully! 🎉**  
Monitor for 24 hours and mark as stable when all metrics are green.
