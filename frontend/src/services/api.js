import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000
});

// Request interceptor to attach JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('crisisgrid_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for friendly error formatting
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const customError = {
      message: error.response?.data?.message || 'A network error occurred. Please check your connection.',
      status: error.response?.status || 500,
      raw: error
    };
    return Promise.reject(customError);
  }
);

// Auth endpoints
export const authService = {
  login: async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    return res.data;
  },
  register: async (userData) => {
    const res = await api.post('/auth/register', userData);
    return res.data;
  },
  getMe: async () => {
    const res = await api.get('/auth/me');
    return res.data;
  }
};

// Incident endpoints
export const incidentService = {
  getAll: async (params = {}) => {
    const res = await api.get('/incidents', { params });
    return res.data;
  },
  getById: async (id) => {
    const res = await api.get(`/incidents/${id}`);
    return res.data;
  },
  create: async (data) => {
    const res = await api.post('/incidents', data);
    return res.data;
  },
  updateStatus: async (id, status) => {
    const res = await api.put(`/incidents/${id}/status`, { status });
    return res.data;
  },
  autoDispatchResources: async (id) => {
    const res = await api.post(`/incidents/${id}/auto-dispatch-resources`);
    return res.data;
  },
  delete: async (id) => {
    const res = await api.delete(`/incidents/${id}`);
    return res.data;
  }
};

// Resource endpoints
export const resourceService = {
  getAll: async (params = {}) => {
    const res = await api.get('/resources', { params });
    return res.data;
  },
  create: async (data) => {
    const res = await api.post('/resources', data);
    return res.data;
  },
  update: async (id, data) => {
    const res = await api.put(`/resources/${id}`, data);
    return res.data;
  },
  delete: async (id) => {
    const res = await api.delete(`/resources/${id}`);
    return res.data;
  },
  assign: async (incidentId, { resourceId, quantity }) => {
    const res = await api.post(`/incidents/${incidentId}/resources`, {
      resource_id: resourceId,
      quantity
    });
    return res.data;
  }
};

// AI endpoints
export const aiService = {
  analyze: async (description) => {
    const res = await api.post('/ai/analyze', { description });
    return res.data;
  },
  analyzeCctv: async (cctvData) => {
    const res = await api.post('/ai/analyze-cctv', cctvData);
    return res.data;
  }
};

// CCTV Camera endpoints
export const cameraService = {
  getAll: async (params = {}) => {
    const res = await api.get('/cameras', { params });
    return res.data;
  },
  getStats: async () => {
    const res = await api.get('/cameras/stats');
    return res.data;
  },
  getById: async (id) => {
    const res = await api.get(`/cameras/${id}`);
    return res.data;
  },
  create: async (data) => {
    const res = await api.post('/cameras', data);
    return res.data;
  },
  update: async (id, data) => {
    const res = await api.put(`/cameras/${id}`, data);
    return res.data;
  },
  delete: async (id) => {
    const res = await api.delete(`/cameras/${id}`);
    return res.data;
  },
  triggerSnapshot: async (id, incidentId = null) => {
    const res = await api.post(`/cameras/${id}/snapshot`, { incidentId });
    return res.data;
  },
  triggerDetection: async (id, eventData = {}) => {
    const res = await api.post(`/cameras/${id}/detect-incident`, eventData);
    return res.data;
  },
  simulateDetection: async (eventData = {}) => {
    const res = await api.post('/cameras/auto-detect-simulation', eventData);
    return res.data;
  },
  getDaemonStatus: async () => {
    const res = await api.get('/cameras/surveillance-daemon/status');
    return res.data;
  },
  toggleDaemon: async () => {
    const res = await api.post('/cameras/surveillance-daemon/toggle');
    return res.data;
  }
};

export default api;
