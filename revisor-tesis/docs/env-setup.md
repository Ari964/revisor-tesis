# Revisor de Tesis — Guía de Configuración

## 🚀 Inicio Rápido

### Pre-requisitos
- Node.js 20+
- Docker & Docker Compose
- Git

### 1. Clonar y configurar variables de entorno

```bash
cp .env.example .env
# Editar .env con tus valores (ver sección de API Keys abajo)
```

### 2. Levantar infraestructura Docker

```bash
# Inicia MySQL, Redis, MinIO y Qdrant
npm run docker:up

# Verificar que todos los contenedores están healthy
docker compose -f docker/docker-compose.yml ps
```

### 3. Instalar dependencias

```bash
npm install
```

### 4. Ejecutar migraciones de base de datos

```bash
npm run db:generate   # Genera el cliente Prisma
npm run db:migrate    # Ejecuta las migraciones
npm run db:seed       # Carga datos de prueba
```

### 5. Iniciar servicios de desarrollo

```bash
npm run dev           # Inicia todos los servicios con Turborepo
```

Servicios disponibles:
- **Web**: http://localhost:3000
- **API**: http://localhost:3001/api
- **MinIO Console**: http://localhost:9001
- **Qdrant Dashboard**: http://localhost:6333/dashboard

---

## 🔑 Obtener API Keys Gratuitas

### Gemini API (Google AI Studio)
1. Ir a [aistudio.google.com/apikey](https://aistudio.google.com/apikey)
2. Clic en "Create API Key"
3. Seleccionar un proyecto de GCP (se crea uno automáticamente si no tienes)
4. Copiar la key y pegarla en `GEMINI_API_KEY` del `.env`
5. **No requiere tarjeta de crédito ni billing habilitado**

### ORCID Sandbox
1. Registrarse en [sandbox.orcid.org/register](https://sandbox.orcid.org/register)
2. Ir a Developer Tools en el perfil
3. Registrar tu aplicación con la redirect URI: `http://localhost:3001/api/auth/orcid/callback`
4. Copiar Client ID y Client Secret al `.env`

### CrossRef
- **No requiere API key**
- Solo configura `CROSSREF_MAILTO` con tu email institucional para acceder al polite pool (10 req/seg)

---

## 🐳 Despliegue en Oracle Cloud (ARM, 24GB RAM)

### 1. Crear instancia Oracle Cloud Free Tier
- Shape: VM.Standard.A1.Flex (ARM)
- CPU: 4 OCPU
- RAM: 24 GB
- OS: Ubuntu 22.04 Minimal

### 2. Instalar Docker en la instancia

```bash
sudo apt update && sudo apt install -y docker.io docker-compose-v2
sudo usermod -aG docker $USER
```

### 3. Configurar y desplegar

```bash
git clone <tu-repo> && cd revisor-tesis
cp .env.example .env
# Editar .env con credenciales de producción
docker compose -f docker/docker-compose.yml up -d
```

### Uso estimado de RAM en producción:

| Servicio | RAM |
|----------|-----|
| MySQL 8 | ~1 GB |
| Redis | ~256 MB |
| MinIO | ~512 MB |
| Qdrant | ~1 GB |
| API (NestJS) | ~512 MB |
| Workers (con modelo embedding) | ~2 GB |
| OS + overhead | ~2 GB |
| **Total** | **~7.3 GB** |
| **Disponible** | **~16.7 GB** |

---

## 📋 Usuarios de Prueba (después de seed)

| Rol | Email | Password |
|-----|-------|----------|
| Admin | admin@universidad.edu.pe | admin123 |
| Coordinador | coordinador@universidad.edu.pe | coord123 |
| Asesor | asesor@universidad.edu.pe | asesor123 |
| Estudiante | estudiante@universidad.edu.pe | estudiante123 |
