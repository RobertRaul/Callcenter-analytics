# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Call Center Analytics system for Issabel 4 - real-time analytics and reporting for call center operations. The system parses Asterisk's `queue_log` (from MySQL or file) and presents data through a modern web interface with dashboards, reports, and Excel/PDF export capabilities.

**Tech Stack:**
- **Backend**: FastAPI (Python 3.8+), PyMySQL, Pydantic, ReportLab/OpenPyXL — served by Uvicorn (8 workers, bound to `127.0.0.1:8000`)
- **Frontend**: React 18.2, Ant Design 5, React Router 6, Chart.js/react-chartjs-2 (Recharts also present)
- **Deployment**: Systemd service + Nginx reverse proxy (HTTPS)
- **Exposure**: Publicly reachable on the Internet at `https://metricas.macsalud.com` (Let's Encrypt). Consumed by the web UI **and** an external Windows desktop application. See **Security & Internet Exposure** below.

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

# Dev server: http://0.0.0.0:8000 (SERVER_HOST in settings). Docs at /docs and /redoc.
# NOTE: In PRODUCTION the API is NOT run via `python main.py`. It runs under systemd
# as: uvicorn main:app --host 127.0.0.1 --port 8000 --workers 8
# (bound to localhost only — Nginx is the sole entry point).
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
# Check API health (8000 is bound to localhost only now)
curl http://127.0.0.1:8000/health
# Or through Nginx (internal / public):
curl -k https://metricas.macsalud.com/health   # from an internal subnet

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
- **Mobile-responsive**: on mobile (`< 768px`) the sidebar becomes a hidden overlay drawer with a dark backdrop that closes on tap/navigation; content uses full width; header/content paddings shrink. See `App.jsx` (`isMobile`, `collapsedWidth`, backdrop) and `index.css` (table horizontal-scroll, mobile media queries).
- **Global loading indicator**: mounts `<GlobalLoading />` once; a top progress bar + a "Cargando…" badge appear automatically on ANY API request (every filter, every page). Driven by `loadingBus` in `services/api.js` (axios interceptors count active requests).

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
- `GlobalLoading.jsx`: Global loading UI (top progress bar + "Cargando…" badge). Subscribes to `loadingBus`; the badge only appears if a request takes >350ms (avoids flicker on 30s polling).

**API Client**: `frontend/src/services/api.js`
- Axios instance with **relative** base URL from `REACT_APP_API_URL` (`.env` → `/api`); Nginx proxies `/api` to the backend. Do NOT hardcode `http://192.168.11.3:8000`.
- Organized API methods by domain: `callsAPI`, `queuesAPI`, `agentsAPI`, `recordingsAPI`, `analisisAPI`, `dashboardAPI`, `usersAPI`
- Request/response interceptors for logging, error handling, **and the global loading counter** (`loadingBus.subscribe(...)` exported for `GlobalLoading.jsx`)

**Menu Permissions**:
- Dashboard: `dashboard`
- Llamadas/Colas/Agentes: `calls`, `queues`, `agents`
- Análisis/Reportes: `reports`
- Usuarios: `admin`

### Production Deployment

**Systemd Service**: `/etc/systemd/system/callcenter-api.service`
- Runs backend as root user (required for queue_log access)
- Working directory: `/opt/callcenter-analytics/backend/src`
- ExecStart: `uvicorn main:app --host 127.0.0.1 --port 8000 --workers 8` (8 workers; bound to localhost only — never `0.0.0.0` in prod)
- Auto-restart enabled with 10s delay
- After editing: `systemctl daemon-reload && systemctl restart callcenter-api`

**Nginx Config**: `/etc/nginx/sites-available/callcenter` (symlinked from `sites-enabled/`)
- `:80` → only the ACME challenge (`/.well-known/acme-challenge/`, webroot `/var/www/certbot`) + 301 redirect to HTTPS
- `:443` → TLS (Let's Encrypt), serves React build from `/opt/callcenter-analytics/frontend/build`
- Proxies `/api` to `http://127.0.0.1:8000`; `/docs`, `/redoc`, `/openapi.json` proxied too **but restricted to internal subnets** (`deny 192.168.2.23; allow 192.168.2/3/11.0/24; deny all;`)
- **Rate limiting**: zones defined in `/etc/nginx/conf.d/ratelimit.conf` (`api_zone` 30r/s burst 60, `auth_zone` 5r/s burst 10 on `/api/auth`)
- **Bot-path blocking**: regex `location` returns `444` for `/.env`, `/wp-login`, `/solr`, `/phpmyadmin`, etc.
- **Security headers**: HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy; `server_tokens off`
- Aggressive no-cache for `index.html`; long-term cache for static assets (`.js`, `.css`)

## Security & Internet Exposure

The system is published to the Internet for an external Windows app + remote web access. Key facts an agent must know before changing networking/deploy:

**Inbound path (how the Internet reaches it):**
```
Internet → 190.119.206.67 (ISP Claro) → FortiGate (deep SSL/SSH inspection)
         → MikroTik (DNAT 443/80 + SrcNAT) → 192.168.11.3 (this server) → Nginx :443
```
- Public DNS: `metricas.macsalud.com` → `190.119.206.67` (authoritative: BanaHosting).
- The server's **default route exits via a different ISP** (`200.215.229.x`), so the MikroTik does **SrcNAT** — therefore **all Internet traffic appears to Nginx with source IP `192.168.2.23`**. This is why `/docs` has an explicit `deny 192.168.2.23` before the internal-subnet allows.
- VLAN `192.168.11.x` = servers; users/admins are on `192.168.2.x` / `192.168.3.x`; Issabel DB on `192.168.3.2`.

**Host firewall (ufw, active):**
- Internet: only `22, 80, 443`.
- Internal subnets `192.168.2.0/24`, `192.168.3.0/24`, `192.168.11.0/24`: full access.
- `8000` (API) and `3306` (MySQL) are **not** reachable from the Internet (API bound to localhost; ufw blocks 3306 externally).

**TLS**: Let's Encrypt cert for `metricas.macsalud.com` (+`www`), issued via webroot `/var/www/certbot`. Auto-renew via `certbot.timer`; deploy hook `/etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh` reloads Nginx. certbot is the **snap** build (the apt 0.40 was broken).

**Auth**: JWT `SECRET_KEY` is a real random secret in `backend/.env` (no longer the placeholder). `ACCESS_TOKEN_EXPIRE_MINUTES=1440` (24h).

**Git remote caveat**: SSH pushes to GitHub fail from this server — the FortiGate intercepts/blocks SSH (host key won't match GitHub's real `p2QAMXN…`). Push over **HTTPS with a PAT** (the correct repo is `https://github.com/RobertRaul/Callcenter-analytics`). For a clean SSH path, exempt GitHub from FortiGate SSL/SSH inspection.

## Users, Email & Automated Reports

**User store**: SQLite `backend/users.db`, table `users`. Key columns added over time: `must_change_password`, `is_admin` (migrated automatically in `auth_service.init_db`). The `admin` user is forced `is_admin=1` and its email defaults to `rarmejo@macsalud.com`.

**Auth role model**: admin = `is_admin` flag (not username). `dependencies.require_admin` enforces it; `/api/users/*` are admin-only. Frontend gates the Usuarios menu AND the `/users` route by `is_admin` (see `App.jsx` `canAccess`/`guard`).

**User lifecycle (email-based)**:
- Create (`POST /api/users/create`): no password input — generates a **temp password**, emails it, sets `must_change_password=1`. If SMTP not configured, returns `temp_password` in the response as fallback (shown in the UI).
- First login returns `must_change_password=true` → frontend forces a change via `POST /api/auth/change-password`.
- Admin reset (`POST /api/users/reset-password/{id}`) and self-service (`POST /api/auth/forgot-password`, public, generic response) both issue a new temp password.

**Email**: `services/email_service.py` (SMTP via Gmail/Workspace, STARTTLS 587). Config in `.env`: `SMTP_HOST/PORT/USER/PASSWORD/FROM/FROM_NAME`, `APP_BASE_URL`. `is_configured()` gates sending. Supports attachments (`send_with_attachments`).

**Automated reports**: `services/report_mailer.py` builds 4 reports (daily/weekly-exec/monthly/weekly-agents) reusing controllers + `reports_service` (PDF+Excel), and emails them. Run via `backend/send_report.py <key>`, scheduled in `/etc/cron.d/callcenter-reports`. **Recipients are managed from the UI** (`/users` → "Configuración de envíos"), stored in `users.db` table `app_settings` via `services/settings_store.py` (GET/PUT `/api/users/report-config`); `.env` `REPORT_RECIPIENTS_*` are fallback only.

**Config loading caveat**: `settings.py` uses an **absolute** `env_file` path (`/opt/callcenter-analytics/backend/.env`) because the service runs from `backend/src`. `auth_service` reads `SECRET_KEY` from settings (no longer hardcoded).

## Important Implementation Details

### Queue Log Parser Behavior

The parser has **dual-mode operation**:
1. **MySQL Mode (Primary)**: Connects to `asteriskcdrdb.queue_log` on 192.168.3.2
   - Uses credentials: `asteriskuser` / `<contraseña>`
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
   - User: `asteriskuser` / Password: `<contraseña>`
   - Database: `asteriskcdrdb`
   - Table: `queue_log`

2. **Optional CDR Access** (reports/additional data):
   - Host: 192.168.3.2
   - User: `reportes` / Password: `<contraseña>`
   - Databases: `asteriskcdrdb`, `asterisk`

### CORS Configuration

`CORS_ORIGINS` is set in `backend/.env` (overrides the default list in `settings.py`). Production value is restricted to:
- `https://metricas.macsalud.com`
- `https://192.168.11.3`, `http://192.168.11.3` (internal access)

Notes:
- The React frontend is **same-origin** with Nginx, so CORS does not apply to it.
- The external **Windows desktop app** typically sends no `Origin` header, so CORS is irrelevant to it (it just needs JWT auth). Don't loosen CORS for the desktop app.

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

- `backend/.env`: Live backend settings — DB creds, `CORS_ORIGINS`, `SECRET_KEY` (real secret), `ACCESS_TOKEN_EXPIRE_MINUTES` (overrides `settings.py` defaults)
- `backend/src/config/settings.py`: Default backend settings (DB, CORS, JWT) — overridden by `.env`
- `frontend/src/services/api.js`: API methods + axios instance + `loadingBus` (base URL from `REACT_APP_API_URL`)
- `frontend/.env`: `REACT_APP_API_URL=/api`
- `frontend/src/config/theme.js`: Ant Design theme customization
- `/etc/systemd/system/callcenter-api.service`: Production backend service (uvicorn, 8 workers, 127.0.0.1)
- `/etc/nginx/sites-available/callcenter`: Nginx reverse proxy + TLS + security (symlinked in `sites-enabled/`)
- `/etc/nginx/conf.d/ratelimit.conf`: Rate-limit zones

## Default Credentials

- **Admin User**: `admin` / `admin123` (change in production — the app is Internet-facing)
- **MySQL Queue Log**: `asteriskuser` / `<contraseña>`
- **MySQL Reports**: `reportes` / `<contraseña>`
- **JWT `SECRET_KEY`**: already rotated to a real random secret in `backend/.env` (do not revert to the placeholder). Rotating it again invalidates all active sessions (users re-login once).

These DB/SSH credentials live in `backend/.env` (gitignored). Never commit `.env`.
