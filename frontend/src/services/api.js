// services/api.js
import axios from 'axios';

// Base URL SIEMPRE apunta al backend, incluyendo /api
const API_BASE_URL =
  process.env.REACT_APP_API_URL || 'https://metricas.macsalud.com';

const api = axios.create({
  baseURL: API_BASE_URL ,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor de requests (token + logging)
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    console.log(
      `[API Request] ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`
    );
    return config;
  },
  (error) => {
    console.error('[API Request Error]', error);
    return Promise.reject(error);
  }
);

// Interceptor de respuestas
api.interceptors.response.use(
  (response) => {
    console.log(
      `[API Response] ${response.config.url}`,
      response.status
    );
    return response;
  },
  (error) => {
    console.error('[API Response Error]', error.response || error);

    if (error.response) {
      const message =
        error.response.data?.detail ||
        error.response.data?.message ||
        error.response.data?.error ||
        'Error del servidor';

      // Opcional: logout automático si expira el token
      if (error.response.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }

      throw new Error(message);
    }

    if (error.request) {
      throw new Error('No se pudo conectar con el servidor');
    }

    throw new Error(error.message);
  }
);

/* =======================
   APIs
   ======================= */

// Llamadas
export const callsAPI = {
  getStatistics: (startDate, endDate, queue) =>
    api.get('/calls/statistics', {
      params: { start_date: startDate, end_date: endDate, queue },
    }),

  getList: (startDate, endDate, queue, limit = 100) =>
    api.get('/calls/list', {
      params: { start_date: startDate, end_date: endDate, queue, limit },
    }),

  getHourlyDistribution: (startDate, endDate) =>
    api.get('/calls/hourly-distribution', {
      params: { start_date: startDate, end_date: endDate },
    }),

  getDailySummary: (startDate, endDate) =>
    api.get('/calls/daily-summary', {
      params: { start_date: startDate, end_date: endDate },
    }),

  getDispositionSummary: (startDate, endDate) =>
    api.get('/calls/disposition-summary', {
      params: { start_date: startDate, end_date: endDate },
    }),

  getToday: () => api.get('/calls/today'),
  getThisWeek: () => api.get('/calls/this-week'),
  getThisMonth: () => api.get('/calls/this-month'),

  getByAgent: (startDate, endDate, agent) =>
    api.get('/calls/by-agent', {
      params: { start_date: startDate, end_date: endDate, agent },
    }),
};

// Usuarios
export const usersAPI = {
  list: () => api.get('/users/list'),
  create: (data) => api.post('/users/create', data),
  update: (id, data) => api.put(`/users/update/${id}`, data),
  delete: (id) => api.delete(`/users/delete/${id}`),
};

// Dashboard
export const dashboardAPI = {
  getSummary: () => api.get('/dashboard/summary'),
  getHealth: () => api.get('/health'),
};

// Grabaciones
export const recordingsAPI = {
  check: (callid, date) =>
    api.get(`/recordings/check/${callid}`, { params: { date } }),

  getStreamUrl: (callid, date) =>
    `/api/recordings/stream/${callid}${date ? `?date=${date}` : ''}`,

  getDownloadUrl: (callid, date) =>
    `/api/recordings/download/${callid}${date ? `?date=${date}` : ''}`,

  list: (date) => api.get('/recordings/list', { params: { date } }),
};

// API de Agentes
export const agentsAPI = {
  getList: () => api.get('/agents/list'),

  getStatistics: (startDate, endDate, agent = null) =>
    api.get('/agents/statistics', {
      params: { start_date: startDate, end_date: endDate, agent },
    }),

  getPerformanceByQueue: (agent, startDate, endDate) =>
    api.get(`/agents/${agent}/performance-by-queue`, {
      params: { start_date: startDate, end_date: endDate },
    }),

  getHourlyPerformance: (startDate, endDate, agent = null) =>
    api.get('/agents/hourly-performance', {
      params: { start_date: startDate, end_date: endDate, agent },
    }),

  getCallHistory: (agent, startDate, endDate, limit = 100) =>
    api.get(`/agents/${agent}/call-history`, {
      params: { start_date: startDate, end_date: endDate, limit },
    }),

  getRealtime: () => api.get('/agents/realtime'),

  getComparison: (startDate, endDate) =>
    api.get('/agents/comparison', {
      params: { start_date: startDate, end_date: endDate },
    }),
};

// API de Análisis
export const analisisAPI = {
  getResumen: (startDate, endDate) =>
    api.get('/analisis/resumen', {
      params: { start_date: startDate, end_date: endDate },
    }),

  getKPIs: (startDate, endDate) =>
    api.get('/analisis/kpis', {
      params: { start_date: startDate, end_date: endDate },
    }),

  getTendencias: (startDate, endDate) =>
    api.get('/analisis/tendencias', {
      params: { start_date: startDate, end_date: endDate },
    }),

  getComparativo: (startDate, endDate) =>
    api.get('/analisis/comparativo', {
      params: { start_date: startDate, end_date: endDate },
    }),
};
// API de Colas
export const queuesAPI = {
  getList: () => api.get('/queues/list'),

  getStatistics: (startDate, endDate, queueName = null) =>
    api.get('/queues/statistics', {
      params: {
        start_date: startDate,
        end_date: endDate,
        queue_name: queueName,
      },
    }),

  getEvents: (queueName, startDate, endDate) =>
    api.get(`/queues/events/${queueName}`, {
      params: {
        start_date: startDate,
        end_date: endDate,
      },
    }),

  getPerformanceByHour: (startDate, endDate, queueName = null) =>
    api.get('/queues/performance-by-hour', {
      params: {
        start_date: startDate,
        end_date: endDate,
        queue_name: queueName,
      },
    }),

  getRealtime: () => api.get('/queues/realtime'),
};


export default api;
