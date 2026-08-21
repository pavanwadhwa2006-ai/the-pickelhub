/**
 * API Service
 *
 * Configures Axios client with base URL, authentication headers,
 * and response error handling.
 */

import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach Authorization header if token exists
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('picklehub_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle unauthenticated 401 errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear token on 401 if it was a token validation error
      if (
        error.response.data?.message?.includes('token') ||
        error.response.data?.message?.includes('expired')
      ) {
        localStorage.removeItem('picklehub_token');
        localStorage.removeItem('picklehub_user');
      }
    }
    return Promise.reject(error);
  }
);

export default api;
