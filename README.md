# Call Center Analytics - Issabel 4

Sistema de analítica y reportería en tiempo real para Call Center basado en Issabel 4.

## Descripción General

Sistema web moderno que proporciona análisis avanzado de llamadas, colas y agentes para plataformas Issabel 4. Extrae datos directamente del archivo `queue_log` de Asterisk y presenta la información a través de una interfaz intuitiva con dashboards, reportes y exportación a Excel/PDF.

## Arquitectura del Sistema

### Stack Tecnológico

**Backend:**
- FastAPI (Python 3.8+)
- Pydantic para validación
- PyMySQL para conexión MySQL (opcional)
- Parser personalizado de queue_log
- ReportLab y OpenPyXL para exportación

**Frontend:**
- React 18.2
- Material-UI (MUI) 5.14
- React Router 6.20
- Axios para HTTP
- Recharts para gráficos

### Arquitectura General

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────────┐
│  Frontend       │         │    Backend       │         │   Issabel 4     │
│  React + MUI    │◄────────┤   FastAPI        │◄────────┤  Asterisk       │
│  Port: 3000     │  HTTP   │   Port: 8000     │  Parse  │  queue_log      │
└─────────────────┘         └──────────────────┘         └─────────────────┘
```

## Estructura del Proyecto

```
/opt/callcenter-analytics/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   ├── settings.py          # Configuración general
│   │   │   └── database.py          # Conexión MySQL (opcional)
│   │   ├── controllers/
│   │   │   ├── calls_controller.py  # Lógica de llamadas
│   │   │   ├── agents_controller.py # Lógica de agentes
│   │   │   └── queues_controller.py # Lógica de colas
│   │   ├── routes/
│   │   │   ├── calls_routes.py      # Endpoints de llamadas
│   │   │   ├── agents_routes.py     # Endpoints de agentes
│   │   │   ├── queues_routes.py     # Endpoints de colas
│   │   │   ├── reports_routes.py    # Endpoints de reportes
│   │   │   ├── recordings_routes.py # Endpoints de grabaciones
│   │   │   ├── auth_routes.py       # Autenticación JWT
│   │   │   └── users_routes.py      # Gestión de usuarios
│   │   ├── services/
│   │   │   └── reports_service.py   # Generación Excel/PDF
│   │   ├── utils/
│   │   │   └── queue_log_parser.py  # Parser de queue_log
│   │   ├── models/
│   │   │   └── user.py              # Modelos de datos
│   │   └── main.py                  # Punto de entrada
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   └── Dashboard.jsx        # Dashboard principal
│   │   ├── pages/
│   │   │   ├── Calls.jsx            # Vista de llamadas
│   │   │   ├── Agents.jsx           # Vista de agentes
│   │   │   ├── Queues.jsx           # Vista de colas
│   │   │   ├── Reports.jsx          # Vista de reportes
│   │   │   ├── Users.jsx            # Gestión de usuarios
│   │   │   └── Login.jsx            # Inicio de sesión
│   │   ├── services/
│   │   │   └── api.js               # Cliente HTTP Axios
│   │   ├── App.jsx                  # Componente raíz
│   │   └── index.js                 # Punto de entrada
│   └── package.json
│
└── README.md
```

## Características Principales

### 1. Dashboard en Tiempo Real
- Resumen de llamadas (total, contestadas, abandonadas)
- Métricas de rendimiento de colas
- Estado de agentes en tiempo real
- Distribución horaria de llamadas
- Gráficos interactivos

### 2. Gestión de Llamadas
- **Lista completa** con filtros por fecha
- **Detalles por llamada**: número, agente, cola, tiempos
- **Reproductor de grabaciones** integrado
- **Descarga de audio** de llamadas
- **Filtrado automático** de extensiones internas
- **Paginación** de resultados

### 3. Análisis por Agente
- Llamadas totales y completadas por agente
- Tiempo total de conversación
- Promedio de duración
- Historial de últimas llamadas
- **Traducción de eventos** a español (ej: CONNECT → "Conectada")

### 4. Gestión de Colas
- Estadísticas por cola
- Tasa de respuesta y nivel de servicio
- Tiempo promedio de espera
- Llamadas contestadas vs abandonadas
- Distribución temporal

### 5. Reportes Avanzados
- **Resumen diario** de llamadas
- **Distribución por hora** del día
- **Eventos del sistema** traducidos
- **Top 5 agentes** por rendimiento
- **Exportación** a Excel y PDF
- **Filtros personalizables** por fecha

### 6. Sistema de Autenticación
- Login con JWT
- Roles y permisos granulares
- Gestión de usuarios (admin)
- Sesiones persistentes

## Funcionamiento Técnico

### Parser de queue_log

El componente central es `queue_log_parser.py` que lee directamente el archivo `/var/log/asterisk/queue_log`:

**Formato del archivo:**
```
timestamp|callid|queue|agent|event|data1|data2|data3|data4|data5
```

**Eventos principales:**
- `ENTERQUEUE`: Llamada entra a cola
- `CONNECT`: Agente contesta
- `COMPLETEAGENT`: Agente finaliza llamada
- `COMPLETECALLER`: Cliente cuelga
- `ABANDON`: Cliente abandona antes de ser atendido
- `EXITWITHTIMEOUT`: Timeout en cola

**Proceso:**
1. Lee archivo línea por línea
2. Parsea campos según formato pipe-delimited
3. Filtra por rango de fechas
4. Agrupa eventos por callid
5. Calcula métricas (tiempos de espera, conversación, etc.)

### API REST (FastAPI)

**Endpoints principales:**

```
GET  /                                    # Info de la API
GET  /health                              # Health check
GET  /api/dashboard/summary               # Dashboard principal

# Llamadas
GET  /api/calls/list                      # Lista de llamadas
GET  /api/calls/statistics                # Estadísticas generales
GET  /api/calls/by-agent                  # Llamadas por agente
GET  /api/calls/daily-summary             # Resumen diario
GET  /api/calls/hourly-distribution       # Distribución horaria
GET  /api/calls/disposition-summary       # Resumen por evento

# Colas
GET  /api/queues/list                     # Lista de colas
GET  /api/queues/statistics               # Estadísticas por cola
GET  /api/queues/realtime                 # Estado en tiempo real

# Agentes
GET  /api/agents/list                     # Lista de agentes
GET  /api/agents/statistics               # Estadísticas por agente
GET  /api/agents/comparison               # Comparación de agentes

# Grabaciones
GET  /api/recordings/stream/{callid}      # Stream de audio
GET  /api/recordings/download/{callid}    # Descarga de audio

# Reportes
GET  /api/reports/export/{type}/{format}  # Exportar (excel/pdf)

# Autenticación
POST /api/auth/login                      # Login
POST /api/auth/refresh                    # Refresh token

# Usuarios (admin)
GET  /api/users                           # Lista usuarios
POST /api/users                           # Crear usuario
PUT  /api/users/{id}                      # Actualizar usuario
```

### Frontend React

**Flujo de datos:**
1. Componente hace petición HTTP via Axios
2. API retorna JSON
3. React actualiza estado local
4. MUI renderiza componentes visuales

**Características especiales:**
- **Traductor de eventos**: Función `getEventText()` que convierte eventos técnicos a español
- **Paginación cliente**: Manejo de grandes datasets
- **Reproductor inline**: Audio player integrado en tabla
- **Exportación**: Botones directos a endpoints de exportación

## Instalación y Despliegue

### Requisitos Previos

- **Sistema Operativo**: Linux (probado en CentOS/Rocky Linux)
- **Python**: 3.8 o superior
- **Node.js**: 14 o superior
- **Issabel 4**: Con queue_log activo
- **Acceso**: Lectura a `/var/log/asterisk/queue_log`

### Instalación Backend

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

# 6. Ejecutar servidor
cd src
python main.py
```

El backend estará disponible en: `http://192.168.11.3:8000`

**Documentación interactiva:**
- Swagger UI: `http://192.168.11.3:8000/docs`
- ReDoc: `http://192.168.11.3:8000/redoc`

### Instalación Frontend

```bash
# 1. Navegar al directorio del frontend
cd /opt/callcenter-analytics/frontend

# 2. Instalar dependencias
npm install

# 3. Configurar API endpoint
nano src/services/api.js
# Verificar baseURL: 'http://192.168.11.3:8000'

# 4. Modo desarrollo
npm start
# Abre http://localhost:3000

# 5. Build para producción
npm run build
# Genera archivos en ./build/
```

### Despliegue en Producción

#### Opción 1: Systemd Services

**Backend Service** (`/etc/systemd/system/callcenter-api.service`):
```ini
[Unit]
Description=Call Center Analytics API
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/callcenter-analytics/backend/src
Environment="PATH=/opt/callcenter-analytics/backend/venv/bin"
ExecStart=/opt/callcenter-analytics/backend/venv/bin/python main.py
Restart=always

[Install]
WantedBy=multi-user.target
```

**Frontend con Nginx** (`/etc/nginx/conf.d/callcenter.conf`):
```nginx
server {
    listen 80;
    server_name 192.168.11.3;

    root /opt/callcenter-analytics/frontend/build;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

**Comandos:**
```bash
# Iniciar servicios
systemctl daemon-reload
systemctl enable callcenter-api
systemctl start callcenter-api
systemctl restart nginx

# Verificar estado
systemctl status callcenter-api
systemctl status nginx
```

#### Opción 2: Docker (futuro)

```dockerfile
# Dockerfile backend
FROM python:3.8-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY src/ .
CMD ["python", "main.py"]
```

### Permisos del Sistema

```bash
# Dar acceso de lectura a queue_log
chmod 644 /var/log/asterisk/queue_log

# Si el servicio corre como usuario específico
chown asterisk:asterisk /var/log/asterisk/queue_log
usermod -aG asterisk callcenter-user
```

## Configuración

### Backend (settings.py)

```python
# Base de datos Issabel
DB_HOST = "192.168.3.2"          # IP del servidor Issabel
DB_USER = "reportes"              # Usuario MySQL
DB_PASSWORD = "issabel"           # Contraseña
DB_NAME_CDR = "asteriskcdrdb"     # Base de datos CDR
DB_NAME_ASTERISK = "asterisk"     # Base de datos Asterisk

# Servidor API
SERVER_HOST = "0.0.0.0"           # Escucha en todas las interfaces
SERVER_PORT = 8000                # Puerto del API

# CORS (agregar IPs permitidas)
CORS_ORIGINS = [
    "http://localhost:3000",
    "http://192.168.11.3",
    "http://192.168.11.3:3000"
]

# JWT
SECRET_KEY = "cambiar-en-produccion"
ACCESS_TOKEN_EXPIRE_MINUTES = 1440  # 24 horas
```

### Frontend (api.js)

```javascript
const API_BASE_URL = 'http://192.168.11.3:8000';
```

## Usuarios y Permisos

### Usuario por Defecto
- **Username**: `admin`
- **Password**: `admin123`

### Permisos Disponibles
- `dashboard`: Ver dashboard principal
- `calls`: Ver llamadas
- `queues`: Ver colas
- `agents`: Ver agentes
- `reports`: Ver y exportar reportes
- `admin`: Gestión de usuarios

## Solución de Problemas

### Backend no inicia

```bash
# Verificar logs
journalctl -u callcenter-api -f

# Verificar acceso a queue_log
ls -la /var/log/asterisk/queue_log

# Probar conexión MySQL (si aplica)
mysql -h 192.168.3.2 -u reportes -p
```

### Frontend no muestra datos

```bash
# Verificar que el backend esté corriendo
curl http://192.168.11.3:8000/health

# Verificar CORS en navegador (F12 → Console)
# Verificar configuración de API_BASE_URL
```

### No se ven grabaciones

```bash
# Verificar que existan archivos de audio
ls -la /var/spool/asterisk/monitor/

# Verificar permisos
chmod 644 /var/spool/asterisk/monitor/*.wav
```

## Mantenimiento

### Logs del Sistema

```bash
# Backend logs
journalctl -u callcenter-api -f

# Nginx logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log

# Queue log de Asterisk
tail -f /var/log/asterisk/queue_log
```

### Rotación de queue_log

Issabel rota automáticamente el queue_log. Si necesitas acceso a logs históricos, considera:

```bash
# Archivar queue_log antiguo
cp /var/log/asterisk/queue_log /opt/backups/queue_log.$(date +%Y%m%d)

# O configurar logrotate
```

## Desarrollo

### Agregar Nueva Funcionalidad

1. **Backend**: Crear controller → route → registrar en main.py
2. **Frontend**: Crear page/component → agregar route en App.jsx
3. **Probar** con datos reales del queue_log

### Estructura de Respuestas API

```json
{
  "success": true,
  "data": {
    "calls": [],
    "total": 100
  }
}
```

## Roadmap

- [ ] Dashboard con gráficos en tiempo real (WebSocket)
- [ ] Alertas por email/SMS
- [ ] Reportes programados
- [ ] Integración con CRM
- [ ] Aplicación móvil
- [ ] Soporte multi-tenant

## Licencia

Proyecto interno de uso empresarial.

## Soporte

Para reportar problemas o solicitar funcionalidades, contactar al equipo de desarrollo.

---

**Versión**: 1.0.0
**Última actualización**: Noviembre 2025
**Desarrollado para**: Issabel 4 / Asterisk
