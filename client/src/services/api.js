/**
 * API Service
 *
 * Configures Axios client with base URL, in-memory access token management,
 * httpOnly refresh cookie support, and automatic silent token refresh on 401.
 *
 * Dual-Token Architecture:
 * - Access Token: short-lived (15m), stored ONLY in memory (never localStorage)
 * - Refresh Token: long-lived (7d), stored in httpOnly cookie (sent automatically)
 */

import axios from 'axios';

// In-memory access token — XSS-safe, never persisted to storage
let accessToken = null;

/**
 * Set the in-memory access token (called after login/register/refresh)
 */
export const setAccessToken = (token) => {
  accessToken = token;
};

/**
 * Get the current in-memory access token
 */
export const getAccessToken = () => accessToken;

/**
 * Clear the in-memory access token (called on logout)
 */
export const clearAccessToken = () => {
  accessToken = null;
};

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // send httpOnly cookies on every request
});

// Attach Authorization header from in-memory token
api.interceptors.request.use(
  (config) => {
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Flag to prevent multiple concurrent refresh attempts
let isRefreshing = false;
let refreshSubscribers = [];

const onRefreshed = (newToken) => {
  refreshSubscribers.forEach((callback) => callback(newToken));
  refreshSubscribers = [];
};

const addRefreshSubscriber = (callback) => {
  refreshSubscribers.push(callback);
};

// Response interceptor: silently refresh on 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Only attempt refresh on 401 and if we haven't already retried
    if (
      error.response &&
      error.response.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url.includes('/auth/refresh') &&
      !originalRequest.url.includes('/auth/login') &&
      !originalRequest.url.includes('/auth/register')
    ) {
      originalRequest._retry = true;

      if (isRefreshing) {
        // Queue this request until the refresh completes
        return new Promise((resolve) => {
          addRefreshSubscriber((newToken) => {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            resolve(api(originalRequest));
          });
        });
      }

      isRefreshing = true;

      try {
        const res = await axios.post(
          `${import.meta.env.VITE_API_URL || '/api'}/auth/refresh`,
          {},
          { withCredentials: true }
        );

        if (res.data.success && res.data.token) {
          accessToken = res.data.token;

          // Update user/player in localStorage for UI hydration
          if (res.data.user) {
            localStorage.setItem('picklehub_user', JSON.stringify(res.data.user));
          }
          if (res.data.player) {
            localStorage.setItem('picklehub_player', JSON.stringify(res.data.player));
          }

          onRefreshed(res.data.token);
          originalRequest.headers.Authorization = `Bearer ${res.data.token}`;
          return api(originalRequest);
        }
      } catch {
        // Refresh failed — clear everything and force re-login
        accessToken = null;
        localStorage.removeItem('picklehub_user');
        localStorage.removeItem('picklehub_player');
        // Broadcast auth failure so AuthContext can react
        window.dispatchEvent(new CustomEvent('picklehub:auth-expired'));
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
