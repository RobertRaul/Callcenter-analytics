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
- **Systemd** - Servicio del backend (Uvicorn, **8 workers**, escuchando solo en `127.0.0.1:8000`)
- **Nginx** - Reverse proxy + servidor estático + **TLS (HTTPS)**
- **Let's Encrypt** - Certificado válido con renovación automática
- **ufw** - Firewall de host
- **Ubuntu Server 20.04** - Sistema operativo

**Consumidores del API:**
- 🌐 **Interfaz web** React (mismo servidor, servida por Nginx)
- 💻 **Aplicación de escritorio Windows** (externa, consume el API por Internet con JWT)

### Arquitectura General

El sistema es accesible de forma **segura desde Internet** en `https://metricas.macsalud.com`:

```
                 Internet
                    │  https://metricas.macsalud.com
                    ▼
        190.119.206.67  (ISP Claro)
                    │
                    ▼
        FortiGate  →  MikroTik (DNAT 443/80 + SrcNAT)
                            │
                            ▼
┌──────────────────────────────────────────────────────────────────────────┐
│  Servidor svrmetrics  (192.168.11.3)                                       │
│                                                                            │
│   Nginx :443 (TLS, rate-limit, headers, /docs solo LAN)                    │
│      ├── /            → React build (SPA, responsive)                       │
│      └── /api         → Uvicorn 127.0.0.1:8000  (FastAPI, 8 workers)        │
│                                   │                                         │
└───────────────────────────────────┼─────────────────────────────────────-─┘
                                     │  MySQL + SSH
                                     ▼
                         Issabel Server (192.168.3.2)
                         queue_log DB + Grabaciones

Consumidores:  navegador web (LAN/Internet)  ·  App Windows (Internet, JWT)
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
│   │   │   ├── users_routes.py      # Usuarios + programaciones de reportes (admin)
│   │   │   └── analisis_routes.py   # 7 endpoints de análisis ejecutivo
│   │   ├── services/
│   │   │   ├── auth_service.py         # Autenticación JWT + bcrypt + contraseñas temporales
│   │   │   ├── email_service.py        # Envío SMTP (Gmail) + adjuntos
│   │   │   ├── report_mailer.py        # Reportes automáticos por correo (PDF+Excel)
│   │   │   ├── settings_store.py       # Config editable en runtime (app_settings)
│   │   │   ├── schedules_store.py      # Programaciones de reportes (tabla report_schedules)
│   │   │   ├── reports_service.py      # Generación Excel/PDF con branding
│   │   │   ├── recordings_service.py   # Acceso a grabaciones vía SSH/SCP
│   │   │   └── optimized_stats_service.py  # Queries optimizadas con vistas MySQL
│   │   ├── utils/
│   │   │   └── queue_log_parser.py  # Parser dual (MySQL + archivo)
│   │   ├── models/
│   │   │   └── schemas.py           # Pydantic schemas
│   │   ├── dependencies.py          # Dependencias de auth (get_current_user, require_admin)
│   │   └── main.py                  # Punto de entrada FastAPI
│   ├── send_report.py               # CLI de un reporte puntual por su clave
│   ├── dispatch_reports.py          # Despachador de programaciones (lo invoca cron cada minuto)
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
│   │   │   ├── GlobalLoading.jsx    # Indicador de carga global (barra + badge)
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
- **Login JWT** con tokens de larga duración (24 horas), firmados con secreto del `.env`
- **Hash bcrypt** para contraseñas
- **Rol de administrador por flag `is_admin`** (cualquier usuario puede ser admin, ya no está atado al username)
- **Permisos granulares:** dashboard, calls, queues, agents, reports, admin
- **Rutas protegidas** en frontend (guardia por permiso) **y** backend (dependencia `require_admin`)
- **Sesiones persistentes** con localStorage; el token se adjunta automáticamente a cada petición

### 8. Interfaz Adaptativa (Responsive) y Experiencia de Uso
- **Diseño responsive para móvil:** el menú lateral se convierte en un panel superpuesto (oculto por defecto, se cierra al tocar fuera o al navegar); el contenido ocupa todo el ancho.
- **Tablas con scroll horizontal propio:** las tablas anchas (Llamadas, Agentes, Colas…) se deslizan sin romper el layout en pantallas pequeñas.
- **Indicador de carga global:** en **cualquier** filtro de **cualquier** página aparece automáticamente una barra de progreso superior + un badge "Cargando…". Así el usuario siempre sabe si los datos se están cargando. Implementado de forma centralizada vía los interceptores de Axios (`loadingBus`) y el componente `GlobalLoading`.

### 9. Seguridad y Acceso por Internet
- **Acceso público seguro** en `https://metricas.macsalud.com` con **certificado Let's Encrypt** válido (renovación automática).
- **Backend aislado:** Uvicorn escucha solo en `127.0.0.1`; Nginx es el único punto de entrada.
- **Firewall (ufw):** desde Internet solo 22/80/443; MySQL (3306) y la API (8000) no son accesibles desde fuera.
- **Endurecimiento de Nginx:** rate-limiting (general y anti fuerza-bruta en login), bloqueo de rutas de bots, cabeceras de seguridad (HSTS, X-Frame-Options, etc.) y documentación (`/docs`) restringida a la red interna.
- **Autenticación JWT** con secreto robusto; consumible por la app de escritorio Windows mediante `Authorization: Bearer <token>`.

### 10. Gestión de Usuarios con Invitación por Correo
- **Alta por correo:** al crear un usuario, el sistema genera una **contraseña temporal**, la envía por email y obliga a **cambiarla en el primer ingreso**.
- **Reseteo por el admin:** botón "Restablecer" que envía una nueva contraseña temporal al correo del usuario.
- **Autoservicio:** enlace **"¿Olvidaste tu contraseña?"** en el login (respuesta genérica, no revela si el correo existe).
- **Rol Administrador** asignable desde el panel (switch) y columna de rol en la tabla.
- **Envío SMTP** vía Google Workspace (Gmail). Si el correo no está configurado, la contraseña temporal se muestra en pantalla como respaldo.

### 11. Reportes Automáticos por Correo (programaciones configurables)
Reportes que se envían solos, con **PDF + Excel adjuntos** y un **resumen de KPIs** en el cuerpo.
Todo el envío se configura **desde el panel** `/users → "Programaciones de reportes"`, sin tocar archivos
ni terminal. Cada programación define **qué reporte, qué días, a qué hora y a qué correos**, y se puede
activar/pausar o disparar al instante con **"Enviar ahora"**.

**Tipos de reporte disponibles** (el dato que contiene cada uno):

| Tipo | Contenido | Periodo de datos |
|---|---|---|
| Digest Diario Operativo | KPIs generales + resumen del día | Día anterior |
| Resumen Ejecutivo Semanal | KPIs generales | Últimos 7 días |
| Semanal de Agentes + Colas (SLA/Abandono) | Agentes + colas | Últimos 7 días |
| Reporte Mensual de Desempeño | KPIs generales | Mes anterior |

**Frecuencia configurable por programación:** Diario, Semanal (días Lun–Dom a elección) o Mensual (día del mes),
con hora exacta (HH:MM) y lista libre de destinatarios.

**Cómo funciona por dentro:**
- Las programaciones se guardan en `users.db` (tabla **`report_schedules`**, gestionada por `schedules_store.py`).
- Un **único job de cron** (`/etc/cron.d/callcenter-reports`) ejecuta `dispatch_reports.py` **cada minuto**;
  el despachador dispara las programaciones cuyo día/hora coinciden y evita duplicados con `last_run` (máximo un envío por día por programación).
- En el primer arranque la tabla se **siembra** con las 4 programaciones clásicas (digest diario 07:30, ejecutivo
  semanal lunes 08:00, semanal de agentes lunes 08:05, mensual día 1 08:00).
- `send_report.py <clave>` sigue disponible para enviar un reporte puntual desde la terminal.

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
Description=Call Center Analytics API
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/callcenter-analytics/backend/src
Environment="PATH=/opt/callcenter-analytics/backend/venv/bin"
# Producción: Uvicorn con 8 workers, escuchando SOLO en localhost (Nginx es el frente)
ExecStart=/opt/callcenter-analytics/backend/venv/bin/uvicorn main:app --host 127.0.0.1 --port 8000 --workers 8
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

> **Workers:** se usan 8 workers (regla `(2×núcleos)+1` en un servidor de 4 núcleos / 12 GB).
> Importante para soportar la app externa + la web, ya que la generación de reportes (PDF/Excel) es síncrona y bloquea un worker mientras se ejecuta.

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

### Frontend: Nginx (HTTPS + endurecimiento)

Config real: **`/etc/nginx/sites-available/callcenter`** (symlink en `sites-enabled/`). Resumen:

```nginx
# :80 -> solo reto ACME + redirección a HTTPS
server {
    listen 80;
    server_name metricas.macsalud.com www.metricas.macsalud.com 192.168.11.3;
    location ^~ /.well-known/acme-challenge/ { root /var/www/certbot; }
    location / { return 301 https://$host$request_uri; }
}

# :443 -> TLS + frontend + API + seguridad
server {
    listen 443 ssl http2;
    server_name metricas.macsalud.com www.metricas.macsalud.com;

    ssl_certificate     /etc/letsencrypt/live/metricas.macsalud.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/metricas.macsalud.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;

    # Cabeceras de seguridad
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    server_tokens off;

    # Bloqueo de rutas de bots (cierra conexión)
    location ~* "(\.env|\.git|wp-login|wp-admin|wordpress|phpmyadmin|solr|cgi-bin)" { return 444; }

    # Docs: SOLO red interna (Internet aparece como 192.168.2.23 por el SrcNAT)
    location /docs { deny 192.168.2.23; allow 192.168.2.0/24; allow 192.168.3.0/24; allow 192.168.11.0/24; deny all; proxy_pass http://127.0.0.1:8000; }
    # (igual para /redoc y /openapi.json)

    # Login con límite anti fuerza-bruta
    location /api/auth { limit_req zone=auth_zone burst=10 nodelay; proxy_pass http://127.0.0.1:8000; }

    # API
    location /api { limit_req zone=api_zone burst=60 nodelay; proxy_pass http://127.0.0.1:8000; }

    # Frontend SPA (build de React)
    location / { root /opt/callcenter-analytics/frontend/build; try_files $uri $uri/ /index.html; }
}
```

Zonas de rate-limit en **`/etc/nginx/conf.d/ratelimit.conf`**:
```nginx
limit_req_zone $binary_remote_addr zone=api_zone:10m  rate=30r/s;
limit_req_zone $binary_remote_addr zone=auth_zone:10m rate=5r/s;
limit_req_status 429;
```

**Comandos:**
```bash
nginx -t && systemctl reload nginx
tail -f /var/log/nginx/access.log /var/log/nginx/error.log
```

### Seguridad: Firewall (ufw) y Certificado HTTPS

```bash
# --- Firewall: Internet solo 22/80/443; subredes internas con acceso completo ---
ufw default deny incoming
ufw default allow outgoing
ufw allow from 192.168.2.0/24      # usuarios
ufw allow from 192.168.3.0/24      # usuarios / Issabel
ufw allow from 192.168.11.0/24     # VLAN servidores
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable

# --- Certificado Let's Encrypt (certbot por snap; el de apt 0.40 está roto) ---
snap install --classic certbot && ln -sf /snap/bin/certbot /usr/bin/certbot
certbot certonly --webroot -w /var/www/certbot \
  -d metricas.macsalud.com -d www.metricas.macsalud.com
# Renovación automática (certbot.timer) + hook que recarga Nginx:
#   /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh  ->  systemctl reload nginx
certbot renew --dry-run
```

> **Red:** el acceso entra por la IP pública de Claro `190.119.206.67` → FortiGate → MikroTik (DNAT 443/80 + SrcNAT) → `192.168.11.3`. Por el SrcNAT, todo el tráfico de Internet llega a Nginx con IP `192.168.2.23` (de ahí el `deny 192.168.2.23` en `/docs`).

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

La configuración viva está en **`/opt/callcenter-analytics/backend/.env`** (gitignored, **nunca** se commitea). Sobrescribe los valores por defecto de `settings.py`:

```bash
# Base de datos Issabel
DB_HOST=192.168.3.2
DB_PORT=3306
DB_USER_QUEUELOG=asteriskuser
DB_PASSWORD_QUEUELOG=<contraseña>
DB_NAME_CDR=asteriskcdrdb

# CORS — orígenes permitidos (la app de escritorio no usa CORS)
CORS_ORIGINS=["https://metricas.macsalud.com","https://192.168.11.3","http://192.168.11.3"]

# JWT — secreto REAL y aleatorio (generar con: openssl rand -hex 32)
SECRET_KEY=<64-hex-aleatorio>
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440   # 24 horas

# Envío de correo (Google Workspace / Gmail)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=<cuenta@macsalud.com>      # remitente
SMTP_PASSWORD=<app-password-16>      # App Password de Google (con 2FA)
SMTP_FROM=                           # vacío = usa SMTP_USER
SMTP_FROM_NAME=Call Center Analytics - MACSA
APP_BASE_URL=https://metricas.macsalud.com

# Destinatarios de reportes (RESPALDO opcional). Lo normal es administrarlos
# desde el panel /users → "Programaciones de reportes" (se guardan en la BD,
# tabla report_schedules). Estos valores solo se usan como fallback si una
# programación no trae destinatarios propios.
REPORT_RECIPIENTS_GERENCIA=
REPORT_RECIPIENTS_ADMIN=
```

> ⚠️ El binding del servidor en producción NO se controla por `SERVER_HOST` del `.env`, sino por el `ExecStart` del servicio systemd (`uvicorn --host 127.0.0.1 --workers 8`).
>
> 📧 **Reportes por correo:** se configuran desde el panel **/users → "Programaciones de reportes"** (qué reporte, días, hora y destinatarios; se guardan en `users.db`, tabla `report_schedules`). Los `REPORT_RECIPIENTS_*` del `.env` solo se usan como respaldo.

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
SSH_PASSWORD = "<password-ssh>"
RECORDINGS_PATH = "/var/spool/asterisk/monitor"
```

---

## 📊 API REST - Endpoints Principales

### Autenticación
```
POST   /api/auth/login            # Login JWT (devuelve must_change_password e is_admin)
GET    /api/auth/me               # Usuario actual
POST   /api/auth/change-password  # Cambiar la propia contraseña (cambio obligatorio)
POST   /api/auth/forgot-password  # Autoservicio: envía temporal por correo (público)
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

### Usuarios y programaciones de reportes (Solo Admin)
```
GET    /api/users/list                              # Lista usuarios
POST   /api/users/create                            # Crear usuario (genera temporal + envía correo)
PUT    /api/users/update/{id}                       # Actualizar usuario (incluye is_admin)
DELETE /api/users/delete/{id}                       # Eliminar usuario
POST   /api/users/reset-password/{id}               # Restablecer contraseña (envía temporal)
GET    /api/users/report-config                     # (Legado) destinatarios de respaldo gerencia/admin
PUT    /api/users/report-config                     # (Legado) guardar destinatarios de respaldo
GET    /api/users/report-schedules                  # Listar programaciones de reportes
POST   /api/users/report-schedules                  # Crear programación
PUT    /api/users/report-schedules/{id}             # Actualizar programación
DELETE /api/users/report-schedules/{id}             # Eliminar programación
POST   /api/users/report-schedules/{id}/run-now     # Enviar ese reporte ahora (prueba)
```

> 🔐 **Nota de autenticación:** solo `users_routes.py` y `auth_routes.py` exigen JWT. El resto de endpoints
> es de acceso interno sin token. El frontend, ante un **401** (token vencido), limpia la sesión y redirige
> al login automáticamente.

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
mysql -h 192.168.3.2 -u asteriskuser -p asteriskcdrdb -e "SELECT COUNT(*) FROM queue_log;"

# Verificar permisos
sudo chown root:root /opt/callcenter-analytics/backend/users.db
sudo chmod 644 /opt/callcenter-analytics/backend/users.db
```

### Frontend no muestra datos

```bash
# Verificar que el backend esté corriendo
curl http://127.0.0.1:8000/health   # 8000 está bound a localhost (Nginx es el frente)

# Verificar CORS (revisar consola del navegador F12)
# Verificar configuración de REACT_APP_API_URL

# Limpiar caché del navegador o usar modo incognito
```

### No se ven grabaciones

```bash
# Verificar que existan archivos de audio en servidor Issabel
ssh root@192.168.3.2 "ls -la /var/spool/asterisk/monitor/"

# Verificar SSH desde servidor de analytics
sshpass -p '<password-ssh>' ssh root@192.168.3.2 "hostname"

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
mysql -h 192.168.3.2 -u asteriskuser -p asteriskcdrdb -e "SHOW TABLES LIKE 'v_%';"

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
ssh root@192.168.3.2 "mysqldump -u asteriskuser -p asteriskcdrdb queue_log | gzip > /tmp/queue_log_backup.sql.gz"
scp root@192.168.3.2:/tmp/queue_log_backup.sql.gz /opt/backups/
```

### Rotación de Logs

Issabel rota automáticamente el `queue_log`. El parser maneja correctamente archivos rotados.

### Limpieza de Caché de Grabaciones

```bash
# Limpiar grabaciones en caché mayores a 24 horas (desde el propio servidor)
curl -X POST "http://127.0.0.1:8000/api/recordings/cleanup-cache?max_age_hours=24"
```

---

## 📚 Documentación Adicional

- **CLAUDE.md:** Guía completa para Claude Code (desarrollo asistido)
- **SOLUTION_PERFORMANCE.md:** Detalles de optimizaciones de performance
- **CLEANUP_REPORT.md:** Análisis de código muerto y limpieza
- **Swagger UI:** https://metricas.macsalud.com/docs (interactiva, solo red interna)
- **ReDoc:** https://metricas.macsalud.com/redoc (solo red interna)

---

## 🔄 Integración con Issabel

### Conexiones Requeridas

**MySQL (asteriskcdrdb):**
- Host: 192.168.3.2
- Puerto: 3306
- Usuario: asteriskuser
- Password: <contraseña>
- Base de datos: asteriskcdrdb
- Tabla principal: queue_log

**SSH (para grabaciones):**
- Host: 192.168.3.2
- Usuario: root
- Password: <password-ssh>
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

## 🆕 Novedades (v2.0.0)

- ✅ **Acceso seguro por Internet** (`https://metricas.macsalud.com`) con Let's Encrypt + renovación automática.
- ✅ **Endurecimiento de seguridad:** API en localhost, firewall ufw, rate-limiting, bloqueo de bots, cabeceras de seguridad, `/docs` solo LAN, secreto JWT rotado.
- ✅ **Interfaz responsive** para móvil (menú superpuesto, tablas con scroll, paddings adaptativos).
- ✅ **Indicador de carga global** en todos los filtros (barra + badge "Cargando…").
- ✅ **8 workers** de Uvicorn para soportar la web + la app de escritorio externa.
- ✅ **API consumible por la app de escritorio Windows** vía JWT.
- ✅ **Gestión de usuarios por correo:** alta con contraseña temporal + cambio obligatorio, reseteo por admin y autoservicio ("¿Olvidaste tu contraseña?").
- ✅ **Rol de administrador por flag `is_admin`** y rutas protegidas en frontend y backend.
- ✅ **Envío de correo SMTP** (Google Workspace) integrado.
- ✅ **Reportes automáticos por correo** (diario/semanal/mensual) con PDF + Excel, destinatarios editables desde el panel.

## 🚧 Roadmap Futuro

- [x] ~~Interfaz responsive para móvil~~ (v2.0.0)
- [x] ~~Indicador de carga en filtros~~ (v2.0.0)
- [ ] Dashboard con actualización WebSocket en tiempo real
- [ ] Alertas por email/SMS configurables
- [ ] Reportes programados automáticos
- [ ] Integración con CRM externo
- [ ] Aplicación móvil (React Native)
- [ ] Soporte multi-tenant
- [ ] Tests automatizados (pytest + jest)
- [ ] CI/CD con GitHub Actions
- [ ] Excepción de GitHub en FortiGate para push por SSH sin token
- [ ] Code-splitting del frontend para carga más rápida en móvil

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

**Versión:** 2.0.0
**Última actualización:** Mayo 2026
**Desarrollado para:** Issabel 4 / Asterisk
**Servidor:** https://metricas.macsalud.com

---

**🔗 Enlaces Rápidos:**
- 🌐 **Aplicación (web):** https://metricas.macsalud.com
- 📡 **API base:** https://metricas.macsalud.com/api
- 📖 **Docs (Swagger):** https://metricas.macsalud.com/docs *(solo desde la red interna)*
- 🔍 **ReDoc:** https://metricas.macsalud.com/redoc *(solo desde la red interna)*
- 💚 **Health:** https://metricas.macsalud.com/health
- 🖥️ **Acceso local directo (LAN):** https://192.168.11.3
