// services/api.js
import axios from 'axios';

// Configuración base de la API
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://192.168.11.3:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para logging de requests
api.interceptors.request.use(
  (config) => {
    console.log(`[API Request] ${config.method.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('[API Request Error]', error);
    return Promise.reject(error);
  }
);

// Interceptor para manejo de respuestas y errores
api.interceptors.response.use(
  (response) => {
    console.log(`[API Response] ${response.config.url}`, response.status);
    return response;
  },
  (error) => {
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
    return api.get('/api/calls/statistics', { params });
  },
  
  getList: (startDate, endDate, queue = null, limit = 100) => {
    const params = { start_date: startDate, end_date: endDate, limit };
    if (queue) params.queue = queue;
    return api.get('/api/calls/list', { params });
  },
  
  getHourlyDistribution: (startDate, endDate) => {
    return api.get('/api/calls/hourly-distribution', {
      params: { start_date: startDate, end_date: endDate }
    });
  },
  
  getDailySummary: (startDate, endDate) => {
    return api.get('/api/calls/daily-summary', {
      params: { start_date: startDate, end_date: endDate }
    });
  },
  
  getDispositionSummary: (startDate, endDate) => {
    return api.get('/api/calls/disposition-summary', {
      params: { start_date: startDate, end_date: endDate }
    });
  },
  
  getToday: () => api.get('/api/calls/today'),
  getThisWeek: () => api.get('/api/calls/this-week'),
  getThisMonth: () => api.get('/api/calls/this-month'),

  getByAgent: (startDate, endDate, agent = null) => {
    const params = { start_date: startDate, end_date: endDate };
    if (agent) params.agent = agent;
    return api.get('/api/calls/by-agent', { params });
  },
};

// API de Colas
export const queuesAPI = {
  getList: () => api.get('/api/queues/list'),
  
  getStatistics: (startDate, endDate, queueName = null) => {
    const params = { start_date: startDate, end_date: endDate };
    if (queueName) params.queue_name = queueName;
    return api.get('/api/queues/statistics', { params });
  },
  
  getEvents: (queueName, startDate, endDate) => {
    return api.get(`/api/queues/events/${queueName}`, {
      params: { start_date: startDate, end_date: endDate }
    });
  },
  
  getPerformanceByHour: (startDate, endDate, queueName = null) => {
    const params = { start_date: startDate, end_date: endDate };
    if (queueName) params.queue_name = queueName;
    return api.get('/api/queues/performance-by-hour', { params });
  },
  
  getRealtime: () => api.get('/api/queues/realtime'),
};

// API de Agentes
export const agentsAPI = {
  getList: () => api.get('/api/agents/list'),
  
  getStatistics: (startDate, endDate, agent = null) => {
    const params = { start_date: startDate, end_date: endDate };
    if (agent) params.agent = agent;
    return api.get('/api/agents/statistics', { params });
  },
  
  getPerformanceByQueue: (agent, startDate, endDate) => {
    return api.get(`/api/agents/${agent}/performance-by-queue`, {
      params: { start_date: startDate, end_date: endDate }
    });
  },
  
  getHourlyPerformance: (startDate, endDate, agent = null) => {
    const params = { start_date: startDate, end_date: endDate };
    if (agent) params.agent = agent;
    return api.get('/api/agents/hourly-performance', { params });
  },
  
  getCallHistory: (agent, startDate, endDate, limit = 100) => {
    return api.get(`/api/agents/${agent}/call-history`, {
      params: { start_date: startDate, end_date: endDate, limit }
    });
  },
  
  getRealtime: () => api.get('/api/agents/realtime'),
  
  getComparison: (startDate, endDate) => {
    return api.get('/api/agents/comparison', {
      params: { start_date: startDate, end_date: endDate }
    });
  },
};

// API del Dashboard
export const dashboardAPI = {
  getSummary: () => api.get('/api/dashboard/summary'),
  getHealth: () => api.get('/health'),
};

// API de Grabaciones
export const recordingsAPI = {
  check: (callid, date = null) => {
    const params = date ? { date } : {};
    return api.get(`/api/recordings/check/${callid}`, { params });
  },

  getStreamUrl: (callid, date = null) => {
    const params = date ? `?date=${date}` : '';
    return `${API_BASE_URL}/api/recordings/stream/${callid}${params}`;
  },

  getDownloadUrl: (callid, date = null) => {
    const params = date ? `?date=${date}` : '';
    return `${API_BASE_URL}/api/recordings/download/${callid}${params}`;
  },

  list: (date) => {
    return api.get('/api/recordings/list', { params: { date } });
  },
};

export default api;
