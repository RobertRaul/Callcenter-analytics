# Call Center Analytics - Issabel 4

Sistema de analítica y reportería en tiempo real para Call Center basado en Issabel 4.

## 📋 Descripción General

Sistema web moderno que proporciona análisis avanzado de llamadas, colas y agentes para plataformas Issabel 4. Extrae datos del `queue_log` de Asterisk (MySQL o archivo) y presenta la información a través de una interfaz intuitiva con dashboards interactivos, análisis ejecutivo y exportación a Excel/PDF.

---

## 🏗️ Arquitectura del Sistema

### Stack Tecnológico

**Backend:**
- **FastAPI** 0.104.1 (Python 3.8+)
- **PyMySQL** 1.1.0 - Conexión a MySQL
- **Pydantic** 2.5.0 - Validación de datos
- **Uvicorn** 0.24.0 - Servidor ASGI
- **ReportLab** 3.6.13 - Generación de PDFs
- **OpenPyXL** 3.1.5 - Generación de Excel
- **python-jose** 3.3.0 - JWT authentication
- **bcrypt** 3.2.2 - Hash de contraseñas

**Frontend:**
- **React** 18.2.0
- **Ant Design** 5.29.3 (UI Framework)
- **React Router** 6.20.0
- **Axios** 1.6.2 - Cliente HTTP
- **Chart.js** 4.5.1 + react-chartjs-2 - Gráficos
- **dayjs** 1.11.19 - Manejo de fechas
- **html2canvas** 1.4.1 - Captura de gráficos

**Deployment:**
- **Systemd** - Servicio del backend
- **Nginx** - Reverse proxy + servidor estático
- **Ubuntu Server** - Sistema operativo

### Arquitectura General

```
┌─────────────────────┐         ┌────────────────────┐         ┌─────────────────────┐
│   Frontend          │         │     Backend        │         │   Issabel Server    │
│   React + Ant       │◄────────┤   FastAPI          │◄────────┤   (192.168.3.2)     │
│   Design            │  HTTP   │   Port: 8000       │  MySQL  │   queue_log DB      │
│   Port: 80          │         │   + REST API       │  + SSH  │   + Recordings      │
└─────────────────────┘         └────────────────────┘         └─────────────────────┘
       │                                  │
       │                                  │
       └──────────────────────────────────┘
         http://192.168.11.3
```

---

## 📁 Estructura del Proyecto

```
/opt/callcenter-analytics/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   ├── settings.py          # Configuración global
│   │   │   └── database.py          # Conexión MySQL
│   │   ├── controllers/
│   │   │   ├── calls_controller.py  # Lógica de llamadas
│   │   │   ├── agents_controller.py # Lógica de agentes
│   │   │   └── queues_controller.py # Lógica de colas
│   │   ├── routes/
│   │   │   ├── calls_routes.py      # 6 endpoints de llamadas
│   │   │   ├── agents_routes.py     # 7 endpoints de agentes
│   │   │   ├── queues_routes.py     # 5 endpoints de colas
│   │   │   ├── reports_routes.py    # 4 endpoints de reportes
│   │   │   ├── recordings_routes.py # 5 endpoints de grabaciones
│   │   │   ├── auth_routes.py       # 2 endpoints de autenticación
│   │   │   ├── users_routes.py      # 4 endpoints de usuarios
│   │   │   └── analisis_routes.py   # 7 endpoints de análisis ejecutivo
│   │   ├── services/
│   │   │   ├── auth_service.py         # Autenticación JWT + bcrypt
│   │   │   ├── reports_service.py      # Generación Excel/PDF con branding
│   │   │   ├── recordings_service.py   # Acceso a grabaciones vía SSH/SCP
│   │   │   └── optimized_stats_service.py  # Queries optimizadas con vistas MySQL
│   │   ├── utils/
│   │   │   └── queue_log_parser.py  # Parser dual (MySQL + archivo)
│   │   ├── models/
│   │   │   └── schemas.py           # Pydantic schemas
│   │   └── main.py                  # Punto de entrada FastAPI
│   ├── migrations/
│   │   ├── 001_performance_optimization.sql  # Vistas MySQL + índices
│   │   └── deploy.sh                          # Script de deployment
│   ├── requirements.txt             # Dependencias Python
│   ├── venv/                        # Entorno virtual
│   └── users.db                     # Base de datos SQLite local
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Dashboard.jsx        # Dashboard principal
│   │   │   └── charts/              # Componentes de gráficos Chart.js
│   │   │       ├── BarChartComponent.jsx
│   │   │       ├── DoughnutChartComponent.jsx
│   │   │       └── LineChartComponent.jsx
│   │   ├── pages/
│   │   │   ├── Calls.jsx            # Vista de llamadas
│   │   │   ├── Agents.jsx           # Vista de agentes
│   │   │   ├── Queues.jsx           # Vista de colas
│   │   │   ├── Reports.jsx          # Vista de reportes
│   │   │   ├── Users.jsx            # Gestión de usuarios (admin)
│   │   │   ├── Login.jsx            # Autenticación
│   │   │   └── Analisis/            # 7 módulos de análisis ejecutivo
│   │   │       ├── Analisis.jsx     # Navegación principal
│   │   │       ├── DashboardEjecutivo.jsx
│   │   │       ├── ComparativaPeriodos.jsx
│   │   │       ├── PatronesHorarios.jsx
│   │   │       ├── RankingAgentes.jsx
│   │   │       ├── AnalisisAbandono.jsx
│   │   │       ├── MapaCalorSemanal.jsx
│   │   │       └── SLACumplimiento.jsx
│   │   ├── services/
│   │   │   └── api.js               # Cliente Axios + endpoints API
│   │   ├── config/
│   │   │   ├── theme.js             # Tema MACSA (colores corporativos)
│   │   │   └── chartDefaults.js     # Configuración Chart.js
│   │   ├── App.jsx                  # Router + layout responsive
│   │   └── index.js                 # Punto de entrada
│   ├── build/                       # Build de producción
│   ├── package.json
│   └── .env                         # REACT_APP_API_URL=/api
│
├── README.md                        # Este archivo
├── CLAUDE.md                        # Documentación para Claude Code
├── SOLUTION_PERFORMANCE.md          # Optimizaciones implementadas
└── CLEANUP_REPORT.md                # Reporte de análisis de código
```

---

## ✨ Características Principales

### 1. Dashboard en Tiempo Real
- Resumen de llamadas (total, contestadas, abandonadas, tasa de respuesta)
- Distribución horaria con gráficos interactivos
- Tarjetas de estadísticas con tendencias vs día anterior
- Auto-refresh cada 30 segundos (configurable)
- Selector de fecha para análisis histórico

### 2. Gestión de Llamadas
- **Lista completa** con filtros por fecha y cola
- **Detalles por llamada:** número, agente, cola, tiempos (espera/conversación)
- **Reproductor de grabaciones** integrado (streaming de audio)
- **Descarga de audio** (conversión automática GSM→WAV)
- **Filtrado automático** de extensiones internas
- **Paginación** de resultados (hasta 1000 llamadas)
- **Agrupación por agente** con estadísticas

### 3. Análisis de Agentes
- Estadísticas completas por agente (llamadas, tiempos, promedios)
- Historial de últimas llamadas con detalles
- Performance por cola
- Performance horaria
- Comparación entre agentes con ranking
- Estado en tiempo real (disponible, en llamada, pausado)
- Traducción automática de eventos a español

### 4. Gestión de Colas
- Estadísticas detalladas por cola
- Tasa de respuesta y nivel de servicio (SLA)
- Tiempo promedio de espera y conversación
- Llamadas contestadas vs abandonadas
- Performance por hora del día
- Timeline de eventos
- Estado en tiempo real (llamadas en espera, agentes disponibles)

### 5. Análisis Ejecutivo Avanzado
- **Dashboard Ejecutivo:** KPIs del día con agente estrella y hora pico
- **Comparativa de Períodos:** Comparación detallada entre dos períodos con tendencias
- **Patrones Horarios:** Top 3 horas pico, días críticos, recomendaciones automáticas
- **Ranking de Agentes:** Gamificación con medallas (oro/plata/bronce), top performers
- **Análisis de Abandono:** Distribución horaria, patrones por cola, correlaciones
- **Mapa de Calor Semanal:** Grid 7×24 horas con períodos de alta/baja demanda
- **SLA y Cumplimiento:** % de llamadas respondidas < umbral, cumplimiento por cola

### 6. Reportes Profesionales
- **Exportación a Excel:** Reportes con branding MACSA, gráficos integrados, formato condicional
- **Exportación a PDF:** Diseño profesional con logo, tablas styled, marca de agua
- **Tipos de reporte:** General, Agentes, Colas, Resumen Diario, Eventos del Sistema
- **Captura de gráficos:** Los gráficos del frontend se incluyen en los reportes
- **Filtros personalizables:** Rango de fechas, colas específicas

### 7. Sistema de Autenticación
- **Login JWT** con tokens de larga duración (8 horas)
- **Hash bcrypt** para contraseñas
- **Roles y permisos granulares:** dashboard, calls, queues, agents, reports, admin
- **Gestión de usuarios:** CRUD completo (solo admin)
- **Usuario por defecto:** admin / admin123
- **Sesiones persistentes** con localStorage

---

## 🛠️ Instalación y Configuración

### Requisitos Previos

- **Sistema Operativo:** Linux (Ubuntu Server 20.04+ recomendado)
- **Python:** 3.8 o superior
- **Node.js:** 14 o superior con npm
- **MySQL:** Acceso al servidor Issabel con base de datos `asteriskcdrdb`
- **SSH:** Acceso root al servidor Issabel (para grabaciones)
- **Permisos:** Acceso de lectura a `/var/log/asterisk/queue_log` (si modo archivo)

### Instalación del Backend

```bash
# 1. Navegar al directorio del backend
cd /opt/callcenter-analytics/backend

# 2. Crear entorno virtual
python3 -m venv venv
source venv/bin/activate

# 3. Instalar dependencias
pip install -r requirements.txt

# 4. Configurar variables de entorno (opcional)
cp .env.example .env
nano .env

# 5. Verificar configuración
nano src/config/settings.py
# Ajustar: DB_HOST, DB_USER, DB_PASSWORD, CORS_ORIGINS

# 6. Ejecutar servidor de desarrollo
cd src
python main.py
```

El backend estará disponible en: `http://192.168.11.3:8000`

**Documentación interactiva:**
- Swagger UI: `http://192.168.11.3:8000/docs`
- ReDoc: `http://192.168.11.3:8000/redoc`

### Instalación del Frontend

```bash
# 1. Navegar al directorio del frontend
cd /opt/callcenter-analytics/frontend

# 2. Instalar dependencias
npm install

# 3. Configurar API endpoint
nano .env
# Verificar: REACT_APP_API_URL=/api

# 4. Modo desarrollo
npm start
# Abre http://localhost:3000

# 5. Build para producción
npm run build
# Genera archivos en ./build/
```

---

## 🚀 Deployment en Producción

### Backend: Systemd Service

Crear archivo `/etc/systemd/system/callcenter-api.service`:

```ini
[Unit]
Description=Call Center Analytics API - FastAPI Backend
After=network.target mysql.service

[Service]
Type=simple
User=root
WorkingDirectory=/opt/callcenter-analytics/backend/src
Environment="PATH=/opt/callcenter-analytics/backend/venv/bin"
ExecStart=/opt/callcenter-analytics/backend/venv/bin/python main.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

**Comandos:**
```bash
# Activar y ejecutar servicio
systemctl daemon-reload
systemctl enable callcenter-api
systemctl start callcenter-api

# Verificar estado
systemctl status callcenter-api

# Ver logs en tiempo real
journalctl -u callcenter-api -f
```

### Frontend: Nginx

Crear archivo `/etc/nginx/conf.d/callcenter.conf`:

```nginx
server {
    listen 80;
    server_name 192.168.11.3 metricas.macsalud.com;

    root /opt/callcenter-analytics/frontend/build;
    index index.html;

    # Frontend SPA
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache agresivo para index.html (siempre recargar)
    location = /index.html {
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        add_header Pragma "no-cache";
        add_header Expires "0";
    }

    # Cache largo para assets estáticos
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Proxy al backend FastAPI
    location /api {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Documentación de API
    location ~ ^/(docs|redoc|openapi.json) {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
    }
}
```

**Comandos:**
```bash
# Activar configuración
nginx -t
systemctl reload nginx

# Ver logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

### Proceso de Actualización

```bash
# Backend
cd /opt/callcenter-analytics/backend
git pull origin main
source venv/bin/activate
pip install -r requirements.txt
systemctl restart callcenter-api

# Frontend
cd /opt/callcenter-analytics/frontend
git pull origin main
npm install
npm run build
systemctl reload nginx
```

---

## ⚙️ Configuración

### Variables de Entorno Backend

Editar `/opt/callcenter-analytics/backend/src/config/settings.py`:

```python
# Servidor Issabel MySQL
DB_HOST = "192.168.3.2"
DB_PORT = 3306
DB_USER_QUEUELOG = "asteriskuser"
DB_PASSWORD_QUEUELOG = "aul"
DB_NAME_CDR = "asteriskcdrdb"

# API Server
SERVER_HOST = "0.0.0.0"
SERVER_PORT = 8000

# CORS (añadir dominios permitidos)
CORS_ORIGINS = [
    "http://metricas.macsalud.com",
    "http://www.metricas.macsalud.com",
    "http://localhost:3000",
    "http://192.168.11.3",
]

# JWT
SECRET_KEY = "cambiar-en-produccion-a-clave-segura"
ACCESS_TOKEN_EXPIRE_MINUTES = 480  # 8 horas
```

### Variables de Entorno Frontend

Editar `/opt/callcenter-analytics/frontend/.env`:

```bash
REACT_APP_API_URL=/api
```

---

## 🔧 Funcionamiento Técnico

### Parser de queue_log (Dual-Mode)

El sistema tiene **dos modos de operación**:

**1. Modo MySQL (Prioritario):**
- Conecta a `asteriskcdrdb.queue_log` en servidor Issabel (192.168.3.2)
- Datos sincronizados por daemon `queue-log-sync.service`
- Índices y vistas optimizadas para queries ultrarrápidas
- Queries de 12 minutos → <1 segundo

**2. Modo Archivo (Fallback):**
- Lee directamente `/var/log/asterisk/queue_log`
- Se activa automáticamente si MySQL no disponible
- Compatible con queue_log rotado

**Eventos principales parseados:**
- `ENTERQUEUE` - Llamada entra a cola
- `CONNECT` - Agente contesta llamada
- `COMPLETEAGENT` - Agente finaliza llamada
- `COMPLETECALLER` - Cliente cuelga
- `ABANDON` - Cliente abandona antes de ser atendido
- `EXITWITHTIMEOUT` - Timeout en cola

### Optimizaciones de Performance

El sistema implementa **vistas MySQL pre-agregadas** que mejoran el rendimiento dramáticamente:

| Métrica | Antes | Después | Mejora |
|---------|-------|---------|--------|
| Tiempo de query | 12+ minutos | <1 segundo | **700x más rápido** |
| Memoria usada | 2.8 GB | <100 MB | **96% reducción** |
| Registros leídos | 7.4M | <1000 | **7400x menos** |

**Vistas implementadas:**
- `v_daily_call_summary` - Resumen diario por cola (180 días)
- `v_hourly_call_distribution` - Distribución horaria (90 días)
- `v_queue_statistics` - Estadísticas por cola (180 días)
- `v_agent_statistics` - Estadísticas por agente (180 días)
- `v_call_events_summary` - Conteo de eventos (90 días)

Para aplicar las optimizaciones:
```bash
cd /opt/callcenter-analytics/backend/migrations
./deploy.sh
```

### Sistema de Grabaciones

Las grabaciones de audio se almacenan en el servidor Issabel:

**Ubicación:** `/var/spool/asterisk/monitor/YYYY/MM/DD/`

**Formato:** `exten-{ext}-{phone}-{date}-{time}-{callid}.wav` o `.gsm`

**Características:**
- Acceso remoto vía SSH/SCP al servidor Issabel
- Conversión automática GSM → WAV (compatible con navegadores)
- Sistema de caché local (1 hora de validez)
- Streaming de audio para reproducción inline
- Descarga directa de archivos

**Configuración SSH:**
```python
# En recordings_service.py
SSH_HOST = "192.168.3.2"
SSH_USER = "root"
SSH_PASSWORD = "m4cs4l4d"
RECORDINGS_PATH = "/var/spool/asterisk/monitor"
```

---

## 📊 API REST - Endpoints Principales

### Autenticación
```
POST   /api/auth/login           # Login JWT
GET    /api/auth/me              # Usuario actual
```

### Llamadas (6 endpoints)
```
GET    /api/calls/statistics          # Estadísticas generales
GET    /api/calls/list                # Lista con filtros
GET    /api/calls/hourly-distribution # Distribución horaria
GET    /api/calls/daily-summary       # Resumen diario
GET    /api/calls/disposition-summary # Resumen por evento
GET    /api/calls/by-agent            # Agrupadas por agente
```

### Colas (5 endpoints)
```
GET    /api/queues/list                # Lista de colas
GET    /api/queues/statistics          # Estadísticas por cola
GET    /api/queues/events/{name}       # Timeline de eventos
GET    /api/queues/performance-by-hour # Performance horaria
GET    /api/queues/realtime            # Estado en tiempo real
```

### Agentes (7 endpoints)
```
GET    /api/agents/list                          # Lista de agentes
GET    /api/agents/statistics                    # Estadísticas por agente
GET    /api/agents/{agent}/performance-by-queue  # Performance por cola
GET    /api/agents/hourly-performance            # Performance horaria
GET    /api/agents/{agent}/call-history          # Historial de llamadas
GET    /api/agents/realtime                      # Estado en tiempo real
GET    /api/agents/comparison                    # Comparación entre agentes
```

### Grabaciones (5 endpoints)
```
GET    /api/recordings/check/{callid}      # Verificar existencia
GET    /api/recordings/stream/{callid}     # Stream de audio
GET    /api/recordings/download/{callid}   # Descarga
GET    /api/recordings/list                # Lista por fecha
POST   /api/recordings/cleanup-cache       # Limpiar caché
```

### Reportes (4 endpoints)
```
POST   /api/reports/export/general/{format}  # Excel/PDF general
POST   /api/reports/export/agents/{format}   # Excel/PDF agentes
POST   /api/reports/export/queues/{format}   # Excel/PDF colas
POST   /api/reports/export/calls/{format}    # Excel/PDF llamadas
```

### Análisis Ejecutivo (7 endpoints)
```
GET    /api/analisis/dashboard-ejecutivo     # Dashboard ejecutivo
GET    /api/analisis/comparativa-periodos    # Comparación de períodos
GET    /api/analisis/patrones-horarios       # Análisis de patrones
GET    /api/analisis/ranking-agentes         # Ranking con gamificación
GET    /api/analisis/analisis-abandono       # Análisis de abandonos
GET    /api/analisis/mapa-calor-semanal      # Mapa de calor 7×24
GET    /api/analisis/sla-cumplimiento        # Análisis de SLA
```

### Usuarios (4 endpoints - Solo Admin)
```
GET    /api/users/list           # Lista usuarios
POST   /api/users/create         # Crear usuario
PUT    /api/users/update/{id}    # Actualizar usuario
DELETE /api/users/delete/{id}    # Eliminar usuario
```

### Utilidades
```
GET    /                    # Info de la API
GET    /health              # Health check
GET    /api/dashboard/summary  # Resumen dashboard
```

**Total: 44 endpoints activos**

---

## 👥 Usuarios y Permisos

### Usuario por Defecto
- **Username:** `admin`
- **Password:** `admin123`
- **Permisos:** Todos habilitados

### Sistema de Permisos

Cada usuario tiene flags granulares:

```javascript
{
  dashboard: true,   // Ver dashboard principal
  calls: true,       // Módulo de llamadas
  queues: true,      // Módulo de colas
  agents: true,      // Módulo de agentes
  reports: true,     // Generar reportes
  admin: false       // Gestión de usuarios (solo admin)
}
```

---

## 🐛 Solución de Problemas

### Backend no inicia

```bash
# Verificar logs
journalctl -u callcenter-api -f

# Verificar acceso a queue_log
ls -la /var/log/asterisk/queue_log

# Probar conexión MySQL
mysql -h 192.168.3.2 -u asteriskuser -paul asteriskcdrdb -e "SELECT COUNT(*) FROM queue_log;"

# Verificar permisos
sudo chown root:root /opt/callcenter-analytics/backend/users.db
sudo chmod 644 /opt/callcenter-analytics/backend/users.db
```

### Frontend no muestra datos

```bash
# Verificar que el backend esté corriendo
curl http://192.168.11.3:8000/health

# Verificar CORS (revisar consola del navegador F12)
# Verificar configuración de REACT_APP_API_URL

# Limpiar caché del navegador o usar modo incognito
```

### No se ven grabaciones

```bash
# Verificar que existan archivos de audio en servidor Issabel
ssh root@192.168.3.2 "ls -la /var/spool/asterisk/monitor/"

# Verificar SSH desde servidor de analytics
sshpass -p 'm4cs4l4d' ssh root@192.168.3.2 "hostname"

# Verificar dependencias
which sshpass
which ffmpeg
```

### Queries lentas

```bash
# Aplicar migraciones de optimización
cd /opt/callcenter-analytics/backend/migrations
./deploy.sh

# Verificar que las vistas existan
mysql -h 192.168.3.2 -u asteriskuser -paul asteriskcdrdb -e "SHOW TABLES LIKE 'v_%';"

# Ver logs para confirmar uso de vistas optimizadas
journalctl -u callcenter-api | grep "OPTIMIZED"
```

---

## 📝 Mantenimiento

### Logs del Sistema

```bash
# Backend logs
journalctl -u callcenter-api -f
journalctl -u callcenter-api --since "1 hour ago"

# Nginx logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log

# Queue log de Asterisk (en servidor Issabel)
ssh root@192.168.3.2 "tail -f /var/log/asterisk/queue_log"
```

### Backup de Base de Datos

```bash
# Backup de usuarios (SQLite)
cp /opt/callcenter-analytics/backend/users.db \
   /opt/backups/users_$(date +%Y%m%d).db

# Backup de queue_log (MySQL - en servidor Issabel)
ssh root@192.168.3.2 "mysqldump -u asteriskuser -paul asteriskcdrdb queue_log | gzip > /tmp/queue_log_backup.sql.gz"
scp root@192.168.3.2:/tmp/queue_log_backup.sql.gz /opt/backups/
```

### Rotación de Logs

Issabel rota automáticamente el `queue_log`. El parser maneja correctamente archivos rotados.

### Limpieza de Caché de Grabaciones

```bash
# Limpiar grabaciones en caché mayores a 24 horas
curl -X POST http://192.168.11.3:8000/api/recordings/cleanup-cache?max_age_hours=24
```

---

## 📚 Documentación Adicional

- **CLAUDE.md:** Guía completa para Claude Code (desarrollo asistido)
- **SOLUTION_PERFORMANCE.md:** Detalles de optimizaciones de performance
- **CLEANUP_REPORT.md:** Análisis de código muerto y limpieza
- **Swagger UI:** http://192.168.11.3:8000/docs (documentación interactiva)
- **ReDoc:** http://192.168.11.3:8000/redoc (documentación alternativa)

---

## 🔄 Integración con Issabel

### Conexiones Requeridas

**MySQL (asteriskcdrdb):**
- Host: 192.168.3.2
- Puerto: 3306
- Usuario: asteriskuser
- Password: aul
- Base de datos: asteriskcdrdb
- Tabla principal: queue_log

**SSH (para grabaciones):**
- Host: 192.168.3.2
- Usuario: root
- Password: m4cs4l4d
- Ruta grabaciones: /var/spool/asterisk/monitor/

**Daemon de sincronización (en servidor Issabel):**
- Servicio: queue-log-sync.service
- Script: /usr/local/bin/queue_log_sync.py
- Función: Sincronizar queue_log (archivo → MySQL) en tiempo real

---

## 🎨 Branding MACSA

El sistema usa los colores corporativos de MACSA:

```javascript
MACSA_COLORS = {
  blue: '#2196F3',    // Azul corporativo (principal)
  gold: '#D4AF37',    // Dorado (acentos)
  gray: '#9E9E9E',    // Gris (complementario)
  green: '#52C41A',   // Verde (éxito)
  red: '#FF4D4F',     // Rojo (error/alerta)
}
```

Los reportes Excel/PDF incluyen:
- Logo MACSA (80×80px)
- Colores corporativos en encabezados
- Marca de agua "Clínica MACSA"
- Formato profesional consistente

---

## 🚧 Roadmap Futuro

- [ ] Dashboard con actualización WebSocket en tiempo real
- [ ] Alertas por email/SMS configurables
- [ ] Reportes programados automáticos
- [ ] Integración con CRM externo
- [ ] Aplicación móvil (React Native)
- [ ] Soporte multi-tenant
- [ ] Tests automatizados (pytest + jest)
- [ ] CI/CD con GitHub Actions

---

## 📄 Licencia

Proyecto interno de uso empresarial - Clínica MACSA.

---

## 👨‍💻 Soporte Técnico

**Para reportar problemas o solicitar funcionalidades:**

- Crear issue en repositorio interno
- Contactar al equipo de desarrollo
- Email: soporte-ti@macsalud.com

---

**Versión:** 1.0.0
**Última actualización:** Mayo 2026
**Desarrollado para:** Issabel 4 / Asterisk
**Servidor:** http://metricas.macsalud.com

---

**🔗 Enlaces Rápidos:**
- 🌐 **Frontend:** http://192.168.11.3
- 📡 **API:** http://192.168.11.3:8000
- 📖 **Docs:** http://192.168.11.3:8000/docs
- 🔍 **ReDoc:** http://192.168.11.3:8000/redoc
- 💚 **Health:** http://192.168.11.3:8000/health
