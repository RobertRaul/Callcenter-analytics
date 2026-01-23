# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Call Center Analytics system for Issabel 4 - real-time analytics and reporting for call center operations. The system parses Asterisk's `queue_log` (from MySQL or file) and presents data through a modern web interface with dashboards, reports, and Excel/PDF export capabilities.

**Tech Stack:**
- **Backend**: FastAPI (Python 3.8+), PyMySQL, Pydantic, ReportLab/OpenPyXL
- **Frontend**: React 18.2, Ant Design 5, React Router 6, Recharts
- **Deployment**: Systemd service + Nginx reverse proxy

## Essential Commands

### Backend Development

```bash
# Navigate to backend
cd /opt/callcenter-analytics/backend

# Activate virtual environment
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run development server (with auto-reload)
cd src
python main.py

# The server runs on http://192.168.11.3:8000
# Docs available at: /docs (Swagger UI) and /redoc
```

### Frontend Development

```bash
# Navigate to frontend
cd /opt/callcenter-analytics/frontend

# Install dependencies
npm install

# Development server (http://localhost:3000)
npm start

# Production build
npm run build
# Output goes to ./build/ directory
```

### Production Deployment

```bash
# Backend service control
systemctl status callcenter-api
systemctl restart callcenter-api
systemctl stop callcenter-api
journalctl -u callcenter-api -f

# Frontend (served by Nginx)
systemctl reload nginx
systemctl restart nginx

# After frontend changes:
cd /opt/callcenter-analytics/frontend
npm run build
systemctl reload nginx
```

### Testing & Verification

```bash
# Check API health
curl http://192.168.11.3:8000/health

# Verify queue_log access
ls -la /var/log/asterisk/queue_log

# Check MySQL connection (used by queue_log_parser)
mysql -h 192.168.3.2 -u asteriskuser -p asteriskcdrdb
```

## Architecture Overview

### Data Flow

```
Asterisk queue_log (MySQL/File) → Parser → FastAPI → React Frontend
                                     ↓
                              Controllers/Services
                                     ↓
                          Excel/PDF Reports (optional)
```

### Backend Architecture

**Entry Point**: `backend/src/main.py`
- Registers all routers (calls, queues, agents, recordings, reports, auth, users, analisis)
- Configures CORS, logging middleware, and global exception handling
- Provides `/health` endpoint for system status checks

**Core Parser**: `backend/src/utils/queue_log_parser.py`
- **Primary Mode**: Reads from MySQL table `asteriskcdrdb.queue_log` on Issabel server (192.168.3.2)
- **Fallback Mode**: Reads from file `/var/log/asterisk/queue_log` if MySQL unavailable
- Parses queue_log events: ENTERQUEUE, CONNECT, COMPLETEAGENT, COMPLETECALLER, ABANDON, EXITWITHTIMEOUT
- Groups events by callid and calculates metrics (wait time, talk time, etc.)

**Controllers** (`backend/src/controllers/`):
- `calls_controller.py`: Call statistics, list, hourly distribution, daily summaries
- `queues_controller.py`: Queue statistics, performance metrics
- `agents_controller.py`: Agent statistics, performance tracking

**Routes** (`backend/src/routes/`):
- Each controller has corresponding route file exposing REST endpoints
- `analisis_routes.py`: Advanced analytics (executive dashboard, period comparison, heatmaps, SLA)
- `recordings_routes.py`: Audio streaming and download from `/var/spool/asterisk/monitor/`
- `auth_routes.py` + `users_routes.py`: JWT authentication and user management

**Configuration**: `backend/src/config/settings.py`
- Database credentials for Issabel MySQL (192.168.3.2)
- CORS origins, JWT settings, server host/port
- Credentials for `asteriskuser` (queue_log table) vs `reportes` user

### Frontend Architecture

**Entry Point**: `frontend/src/index.js` → `App.jsx`
- Uses Ant Design theming (`config/theme.js` with MACSA branding)
- Router-based navigation with permission system
- Responsive design with mobile support (auto-collapse sidebar)

**Pages** (`frontend/src/pages/`):
- `Login.jsx`: JWT authentication
- `Calls.jsx`: Call list with filters and recording player
- `Queues.jsx`: Queue performance metrics
- `Agents.jsx`: Agent statistics and call history
- `Reports.jsx`: Export to Excel/PDF
- `Analisis/Analisis.jsx`: Advanced analytics dashboards
- `Users.jsx`: User management (admin only)

**Components** (`frontend/src/components/`):
- `Dashboard.jsx`: Main dashboard with summary cards and charts

**API Client**: `frontend/src/services/api.js`
- Axios instance with base URL: `http://192.168.11.3:8000`
- Organized API methods by domain: `callsAPI`, `queuesAPI`, `agentsAPI`, `recordingsAPI`, `analisisAPI`, `dashboardAPI`
- Request/response interceptors for logging and error handling

**Menu Permissions**:
- Dashboard: `dashboard`
- Llamadas/Colas/Agentes: `calls`, `queues`, `agents`
- Análisis/Reportes: `reports`
- Usuarios: `admin`

### Production Deployment

**Systemd Service**: `/etc/systemd/system/callcenter-api.service`
- Runs backend as root user (required for queue_log access)
- Working directory: `/opt/callcenter-analytics/backend/src`
- Uses venv Python: `/opt/callcenter-analytics/backend/venv/bin/python`
- Auto-restart enabled with 10s delay

**Nginx Config**: `/etc/nginx/conf.d/callcenter.conf`
- Serves React build from `/opt/callcenter-analytics/frontend/build`
- Proxies `/api/*`, `/docs`, `/redoc`, `/openapi.json` to backend (port 8000)
- Aggressive no-cache for `index.html` (always reload)
- Long-term cache for static assets (`.js`, `.css`)

## Important Implementation Details

### Queue Log Parser Behavior

The parser has **dual-mode operation**:
1. **MySQL Mode (Primary)**: Connects to `asteriskcdrdb.queue_log` on 192.168.3.2
   - Uses credentials: `asteriskuser` / `aul`
   - Data populated by `queue-log-sync.service` daemon on Issabel server
   - Table has UNIQUE index on (time, callid, event, agent) to prevent duplicates
   - Issabel's MySQL schema differs from file format (has extra `data` field)
   - See `queue_log_parser.py:82-130` for event-specific field mapping
2. **File Mode (Fallback)**: Reads `/var/log/asterisk/queue_log` directly
   - Activated if MySQL connection fails

**Queue Log Sync Daemon (Issabel Server)**:
- Location: `/usr/local/bin/queue_log_sync.py` on 192.168.3.2
- Service: `queue-log-sync.service` (systemd)
- Function: Monitors `/var/log/asterisk/queue_log` and syncs to MySQL in real-time
- Features: Automatic duplicate prevention, file rotation detection, batch processing
- Commands:
  - `systemctl status queue-log-sync.service` - Check status
  - `journalctl -u queue-log-sync.service -f` - View logs
  - Import historical: `python3 /usr/local/bin/queue_log_sync.py --import-files queue_log-YYYYMMDD`

When adding features that parse queue_log data, verify both modes work correctly.

### Event Translation

The system translates technical Asterisk events to Spanish for UI display. The translation logic is in frontend utilities (`getEventText()` function). When adding new event types, update both backend parsing and frontend translation.

### Recording Access

Audio recordings require:
- Files in `/var/spool/asterisk/monitor/` (or subdirectories by date)
- Proper file permissions (readable by backend process)
- Filenames typically follow pattern: `q{queue}-{callid}-{timestamp}.{ext}`
- Supported formats: `.wav`, `.mp3`, `.gsm`

The recordings API supports both streaming (`/api/recordings/stream/{callid}`) and download (`/api/recordings/download/{callid}`).

### Database Connections

The system uses **two separate MySQL connections**:
1. **Queue Log Access** (primary data source):
   - Host: 192.168.3.2
   - User: `asteriskuser` / Password: `aul`
   - Database: `asteriskcdrdb`
   - Table: `queue_log`

2. **Optional CDR Access** (reports/additional data):
   - Host: 192.168.3.2
   - User: `reportes` / Password: `issabel`
   - Databases: `asteriskcdrdb`, `asterisk`

### CORS Configuration

When adding new frontend features or changing API structure, ensure CORS origins in `backend/src/config/settings.py` include:
- `http://localhost:3000` (development)
- `http://192.168.11.3` (production)
- `http://192.168.11.3:3000` (if testing prod API with dev frontend)

### Router Registration

When adding new API endpoints:
1. Create controller in `backend/src/controllers/`
2. Create route file in `backend/src/routes/`
3. **Import and register router in `main.py`** (line 35-53) - this is commonly forgotten
4. Add corresponding API methods to `frontend/src/services/api.js`
5. Update menu items in `App.jsx` if creating new page

## Common Workflows

### Adding a New API Endpoint

1. Implement business logic in appropriate controller
2. Create route with FastAPI router decorators
3. Register router in `main.py`
4. Add API method to `api.js`
5. Test with `/docs` Swagger UI

### Debugging Backend Issues

1. Check service logs: `journalctl -u callcenter-api -f`
2. Verify queue_log access: `ls -la /var/log/asterisk/queue_log`
3. Test MySQL connection to Issabel server
4. Check `/health` endpoint response
5. Review parser mode (MySQL vs file fallback)

### Deploying Frontend Changes

1. Make changes in `frontend/src/`
2. Test locally: `npm start`
3. Build for production: `npm run build`
4. Reload nginx: `systemctl reload nginx`
5. Clear browser cache or use incognito (index.html has aggressive no-cache headers)

### Working with Recordings

When implementing recording features:
- Use `recordingsAPI.check(callid)` to verify file exists before displaying player
- Get stream URL with `recordingsAPI.getStreamUrl(callid)`
- Handle cases where recordings may not exist (not all calls are recorded)
- Support date parameter for recordings organized in subdirectories

## Key Configuration Files

- `backend/src/config/settings.py`: All backend settings (DB, CORS, JWT)
- `frontend/src/services/api.js`: API base URL and endpoints
- `frontend/src/config/theme.js`: Ant Design theme customization
- `/etc/systemd/system/callcenter-api.service`: Production backend service
- `/etc/nginx/conf.d/callcenter.conf`: Nginx reverse proxy config

## Default Credentials

- **Admin User**: `admin` / `admin123`
- **MySQL Queue Log**: `asteriskuser` / `aul`
- **MySQL Reports**: `reportes` / `issabel`

Change these in production via `settings.py` and database.
