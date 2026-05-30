// services/api.js
import axios from 'axios';

// Configuración base de la API
const API_BASE_URL = process.env.REACT_APP_API_URL;

const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 30000,
    headers: {
        'Content-Type': 'application/json',
    },
});

// ---- Indicador de carga global ----
// Cuenta peticiones activas y avisa a los suscriptores (ver GlobalLoading.jsx).
let activeRequests = 0;
const loadingListeners = new Set();
const emitLoading = () => {
    const isLoading = activeRequests > 0;
    loadingListeners.forEach((fn) => fn(isLoading));
};
const startRequest = () => { activeRequests += 1; emitLoading(); };
const endRequest = () => { activeRequests = Math.max(0, activeRequests - 1); emitLoading(); };

export const loadingBus = {
    subscribe(fn) {
        loadingListeners.add(fn);
        fn(activeRequests > 0); // estado inicial
        return () => loadingListeners.delete(fn);
    },
};

// Interceptor para logging de requests
api.interceptors.request.use(
    (config) => {
        startRequest();
        // Adjuntar el JWT automáticamente si existe
        const token = localStorage.getItem('token');
        if (token) {
            config.headers = config.headers || {};
            config.headers.Authorization = `Bearer ${token}`;
        }
        console.log(`[API Request] ${config.method.toUpperCase()} ${config.url}`);
        return config;
    },
    (error) => {
        endRequest();
        console.error('[API Request Error]', error);
        return Promise.reject(error);
    }
);

// Interceptor para manejo de respuestas y errores
api.interceptors.response.use(
    (response) => {
        endRequest();
        console.log(`[API Response] ${response.config.url}`, response.status);
        return response;
    },
    (error) => {
        endRequest();
        console.error('[API Response Error]', error.response || error);

        if (error.response) {
            // Error con respuesta del servidor
            const message = error.response.data?.message || error.response.data?.error || 'Error del servidor';
            throw new Error(message);
        } else if (error.request) {
            // Error de red
            throw new Error('No se pudo conectar con el servidor. Verifica la conexión.');
        } else {
            throw new Error(error.message);
        }
    }
);

// API de Llamadas
export const callsAPI = {
    getStatistics: (startDate, endDate, queue = null) => {
        const params = { start_date: startDate, end_date: endDate };
        if (queue) params.queue = queue;
        return api.get('/calls/statistics', { params });
    },

    getList: (startDate, endDate, queue = null, limit = 100) => {
        const params = { start_date: startDate, end_date: endDate, limit };
        if (queue) params.queue = queue;
        return api.get('/calls/list', { params });
    },

    getHourlyDistribution: (startDate, endDate) => {
        return api.get('/calls/hourly-distribution', {
            params: { start_date: startDate, end_date: endDate }
        });
    },

    getDailySummary: (startDate, endDate) => {
        return api.get('/calls/daily-summary', {
            params: { start_date: startDate, end_date: endDate }
        });
    },

    getDispositionSummary: (startDate, endDate) => {
        return api.get('/calls/disposition-summary', {
            params: { start_date: startDate, end_date: endDate }
        });
    },

    getByAgent: (startDate, endDate, agent = null) => {
        const params = { start_date: startDate, end_date: endDate };
        if (agent) params.agent = agent;
        return api.get('/calls/by-agent', { params });
    },
};

// API de Colas
export const queuesAPI = {
    getList: () => api.get('/queues/list'),

    getStatistics: (startDate, endDate, queueName = null) => {
        const params = { start_date: startDate, end_date: endDate };
        if (queueName) params.queue_name = queueName;
        return api.get('/queues/statistics', { params });
    },

    getEvents: (queueName, startDate, endDate) => {
        return api.get(`/queues/events/${queueName}`, {
            params: { start_date: startDate, end_date: endDate }
        });
    },

    getPerformanceByHour: (startDate, endDate, queueName = null) => {
        const params = { start_date: startDate, end_date: endDate };
        if (queueName) params.queue_name = queueName;
        return api.get('/queues/performance-by-hour', { params });
    },

    getRealtime: () => api.get('/queues/realtime'),
};

// API de Agentes
export const agentsAPI = {
    getList: () => api.get('/agents/list'),

    getStatistics: (startDate, endDate, agent = null) => {
        const params = { start_date: startDate, end_date: endDate };
        if (agent) params.agent = agent;
        return api.get('/agents/statistics', { params });
    },

    getPerformanceByQueue: (agent, startDate, endDate) => {
        return api.get(`/agents/${agent}/performance-by-queue`, {
            params: { start_date: startDate, end_date: endDate }
        });
    },

    getHourlyPerformance: (startDate, endDate, agent = null) => {
        const params = { start_date: startDate, end_date: endDate };
        if (agent) params.agent = agent;
        return api.get('/agents/hourly-performance', { params });
    },

    getCallHistory: (agent, startDate, endDate, limit = 100) => {
        return api.get(`/agents/${agent}/call-history`, {
            params: { start_date: startDate, end_date: endDate, limit }
        });
    },

    getRealtime: () => api.get('/agents/realtime'),

    getComparison: (startDate, endDate) => {
        return api.get('/agents/comparison', {
            params: { start_date: startDate, end_date: endDate }
        });
    },
};

// API del Dashboard
export const dashboardAPI = {
    getSummary: () => api.get('/dashboard/summary'),
    getHealth: () => api.get('/health'),
};

// API de Grabaciones
export const recordingsAPI = {
    check: (callid, date = null) => {
        const params = date ? { date } : {};
        return api.get(`/recordings/check/${callid}`, { params });
    },

    getStreamUrl: (callid, date = null) => {
        const params = date ? `?date=${date}` : '';
        return `/api/recordings/stream/${callid}${params}`;
    },

    getDownloadUrl: (callid, date = null) => {
        const params = date ? `?date=${date}` : '';
        return `/api/recordings/download/${callid}${params}`;
    },

    list: (date) => {
        return api.get('/recordings/list', { params: { date } });
    },
};

// API de Análisis (Reportes Ejecutivos)
export const analisisAPI = {
    getDashboardEjecutivo: (targetDate) => {
        return api.get('/analisis/dashboard-ejecutivo', {
            params: { target_date: targetDate }
        });
    },

    getComparativaPeriodos: (p1Inicio, p1Fin, p2Inicio, p2Fin) => {
        return api.get('/analisis/comparativa-periodos', {
            params: {
                periodo1_inicio: p1Inicio,
                periodo1_fin: p1Fin,
                periodo2_inicio: p2Inicio,
                periodo2_fin: p2Fin
            }
        });
    },

    getPatronesHorarios: (startDate, endDate) => {
        return api.get('/analisis/patrones-horarios', {
            params: {
                start_date: startDate,
                end_date: endDate
            }
        });
    },

    getRankingAgentes: (startDate, endDate, metric = 'total_calls') => {
        return api.get('/analisis/ranking-agentes', {
            params: {
                start_date: startDate,
                end_date: endDate,
                metric: metric
            }
        });
    },

    // Nuevos reportes avanzados
    getAnalisisAbandono: (startDate, endDate) => {
        return api.get('/analisis/analisis-abandono', {
            params: {
                start_date: startDate,
                end_date: endDate
            }
        });
    },

    getMapaCalorSemanal: (startDate, endDate) => {
        return api.get('/analisis/mapa-calor-semanal', {
            params: {
                start_date: startDate,
                end_date: endDate
            }
        });
    },

    getSLACumplimiento: (startDate, endDate, slaThreshold = 20) => {
        return api.get('/analisis/sla-cumplimiento', {
            params: {
                start_date: startDate,
                end_date: endDate,
                sla_threshold: slaThreshold
            }
        });
    },
};


// Usuarios
export const usersAPI = {
  list: () => api.get('/users/list'),
  create: (data) => api.post('/users/create', data),
  update: (id, data) => api.put(`/users/update/${id}`, data),
  delete: (id) => api.delete(`/users/delete/${id}`),
  resetPassword: (id) => api.post(`/users/reset-password/${id}`),
  getReportConfig: () => api.get('/users/report-config'),
  saveReportConfig: (data) => api.put('/users/report-config', data),
};

// Autenticación
export const authAPI = {
  login: (username, password) => api.post('/auth/login', { username, password }),
  me: () => api.get('/auth/me'),
  changePassword: (current_password, new_password) =>
    api.post('/auth/change-password', { current_password, new_password }),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
};



export default api;