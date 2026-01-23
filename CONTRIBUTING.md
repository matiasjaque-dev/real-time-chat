# 🤝 Guía de Contribución

¡Gracias por querer contribuir a este proyecto! Esta guía te ayudará a entender cómo colaborar de manera efectiva.

## 📋 Tabla de Contenidos

- [Código de Conducta](#código-de-conducta)
- [Reportar Bugs](#reportar-bugs)
- [Sugerir Mejoras](#sugerir-mejoras)
- [Pull Requests](#pull-requests)
- [Guía de Estilos](#guía-de-estilos)
- [Proceso de Desarrollo](#proceso-de-desarrollo)

---

## 💙 Código de Conducta

Este proyecto se adhiere a un código de conducta:

- Sé respetuoso con otros contribuidores
- Proporciona feedback constructivo
- Mantén discusiones profesionales
- Reporta comportamiento inapropiado

---

## 🐛 Reportar Bugs

### Antes de reportar

1. **Revisa los issues existentes** - Tu bug podría ya estar reportado
2. **Verifica si está documentado** - Revisa README, ARCHITECTURE, SCALING
3. **Intenta reproducir** - Confirma que es consistente

### Cómo reportar

Abre un issue con:

```markdown
**Descripción del bug**
Una descripción clara y concisa de qué está mal.

**Pasos para reproducir**

1. Voy a '...'
2. Hago click en '...'
3. Veo el error '...'

**Comportamiento esperado**
Describe qué debería pasar.

**Comportamiento actual**
Qué está pasando en realidad.

**Entorno**

- OS: [e.g. Windows, macOS, Linux]
- Node: [e.g. 18.x, 20.x]
- Browser: [e.g. Chrome 120]

**Logs**
Pega logs relevantes.
```

---

## 💡 Sugerir Mejoras

Abre un issue con:

```markdown
**Descripción de la mejora**
Descripción clara de la feature que propones.

**Caso de uso**
¿Por qué es útil? ¿Qué problema resuelve?

**Solución propuesta**
Cómo podrías implementarla.

**Alternativas consideradas**
Otros enfoques que pensaste.

**Contexto adicional**
Screenshots, ejemplos, referencias.
```

---

## 🔀 Pull Requests

### Preparación

```bash
# 1. Fork el repositorio
# 2. Clona tu fork
git clone https://github.com/tu-usuario/real-time-chat.git
cd real-time-chat

# 3. Crea una rama
git checkout -b feature/mi-feature
# o
git checkout -b fix/mi-fix
```

### Desarrollo

```bash
# Sigue la guía de estilos (ver abajo)
# Escribe tests para tu código
# Mantén commits limpios
git commit -m "feat: Agregar nueva feature"
```

### Antes de Hacer Push

```bash
# 1. Actualiza con main
git fetch origin
git rebase origin/main

# 2. Corre tests
npm test

# 3. Linting
npm run lint

# 4. Build
npm run build
```

### Crear el PR

```bash
# Push tu rama
git push origin feature/mi-feature
```

**Descripción del PR:**

```markdown
## Descripción

Describirción clara de qué cambios propones.

## Tipo de cambio

- [ ] Bug fix
- [ ] Feature nueva
- [ ] Breaking change
- [ ] Documentación

## Testing

- [ ] Agregué tests
- [ ] Los tests pasan
- [ ] Cobertura es adecuada

## Checklist

- [ ] Mi código sigue la guía de estilos
- [ ] Actualicé documentación
- [ ] No hay breaking changes sin documentar
- [ ] Tests locales pasan
- [ ] No hay conflictos de merge
```

---

## 🎨 Guía de Estilos

### Backend (TypeScript/Node.js)

**Archivo Structure**

```
module/
├── module.model.ts      # Mongoose schemas
├── module.service.ts    # Lógica de negocio
├── module.controller.ts # Request handlers
├── module.routes.ts     # Express routes
└── module.types.ts      # TypeScript types
```

**Naming Conventions**

```typescript
// ✅ Good
const getUserById = async (id: string) => {};
class ChatService {}
interface IUser {}
const MAX_RECONNECTION_ATTEMPTS = 5;

// ❌ Bad
const get_user_by_id = async (id: string) => {};
class chatservice {}
interface user {}
const max_reconnection_attempts = 5;
```

**TypeScript**

```typescript
// ✅ Siempre tipado
function getMessage(id: string): Promise<IMessage | null> {
  return Message.findById(id);
}

// ❌ Evitar any
function getMessage(id: any): any {
  return Message.findById(id);
}
```

**Error Handling**

```typescript
// ✅ Good
try {
  await someAsyncOp();
} catch (error) {
  console.error("Failed to do something:", error);
  throw new Error("Operation failed");
}

// ❌ Bad
try {
  await someAsyncOp();
} catch (error) {
  console.log(error);
}
```

**Logging**

```typescript
// ✅ Use emojis and clear messages
console.log("✅ Server started on port 4000");
console.error("❌ Database connection failed");
console.warn("⚠️ Deprecated API used");

// ❌ Avoid unclear messages
console.log("ok");
console.log("error in db");
```

### Frontend (React/TypeScript)

**Component Structure**

```typescript
// ✅ Good
'use client';

import { ReactNode } from 'react';
import { useSocket } from '@/hooks/useSocket';

interface ChatWindowProps {
  roomId: string;
  userId: string;
}

export default function ChatWindow({ roomId, userId }: ChatWindowProps) {
  const socket = useSocket();

  return (
    <div className="...">
      {/* Component */}
    </div>
  );
}

// ❌ Avoid
export default function ChatWindow(props) {
  const socket = props.socket;
  return <div>...</div>;
}
```

**Hooks**

```typescript
// ✅ Good - Custom hooks
function useMessages(roomId: string) {
  const [messages, setMessages] = useState<IMessage[]>([]);

  useEffect(() => {
    socket.on('message:new', handleMessage);
    return () => socket.off('message:new');
  }, [socket]);

  return messages;
}

// ❌ Avoid - Logic in components
function ChatComponent() {
  useEffect(() => {
    socket.on('message:new', ...);
  }, []);
}
```

**Styling with Tailwind**

```typescript
// ✅ Good - Use Tailwind classes
<button className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
  Click me
</button>

// ❌ Avoid - Inline styles
<button style={{ padding: '8px', background: 'blue', color: 'white' }}>
  Click me
</button>
```

---

## 📝 Proceso de Desarrollo

### 1. Setup Local

```bash
# Backend
cd backend
npm install
docker-compose up -d redis mongo
npm run dev

# Frontend (otra terminal)
cd frontend
npm install
npm run dev
```

### 2. Crear Feature Branch

```bash
# Feature
git checkout -b feature/chat-rooms

# Fix
git checkout -b fix/message-not-sending

# Docs
git checkout -b docs/update-readme
```

### 3. Naming Convention para Branches

```
feature/descripcion-de-feature
fix/descripcion-del-fix
docs/descripcion-del-cambio
refactor/descripcion-del-refactor
test/descripcion-del-test
chore/descripcion-del-chore
```

### 4. Commit Messages

Usa [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: Agregar soporte para reacciones en mensajes
fix: Corregir reconexión de WebSocket
docs: Actualizar guía de escalabilidad
style: Formatear código con prettier
refactor: Reorganizar estructura de carpetas
test: Agregar tests para auth service
chore: Actualizar dependencias
```

### 5. Code Review Checklist

**Para revisor:**

- [ ] Código sigue guía de estilos
- [ ] Tests están presentes y pasan
- [ ] Documentación está actualizada
- [ ] No hay console.logs de debug
- [ ] Performance es aceptable
- [ ] Error handling es correcto
- [ ] No hay breaking changes sin documentar

**Para contributor:**

- [ ] Tests pasan localmente
- [ ] Lint pasa sin errores
- [ ] Código es legible y bien documentado
- [ ] PR description es clara
- [ ] Screenshots/gifs si aplica

### 6. Merge Strategy

- **main** - Production ready
- **develop** - Integration branch
- **feature/** - Feature branches
- **hotfix/** - Urgent fixes

---

## 🚀 Proceso de Release

```bash
# 1. Update version in package.json
# 2. Update CHANGELOG.md
# 3. Create git tag
git tag -a v1.0.0 -m "Release version 1.0.0"

# 4. Push
git push origin main
git push origin v1.0.0

# 5. Create GitHub Release
# 6. Merge to production branch
```

---

## ❓ Preguntas?

- Abre una [Discussion](https://github.com/your-repo/discussions)
- Contacta a los mantenedores
- Revisa [README.md](./README.md) o [ARCHITECTURE.md](./ARCHITECTURE.md)

---

## 📜 Licencia

Al contribuir, aceptas que tu código sea licenciado bajo MIT.

---

**¡Gracias por contribuir!** 🎉
